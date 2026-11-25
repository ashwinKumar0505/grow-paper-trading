"""Upstox HTTP Client using read-only Analytics Token with shared rate limiting, timeouts, and retries."""

from collections import deque
import logging
import random
import threading
import time
from typing import Any, Deque, Dict, List, Optional
from urllib.parse import quote
import httpx

from app.config import settings
from app.data.cache import TokenBucketRateLimiter, rate_limiter
from app.data.providers.base import ProviderNotConfiguredError, ProviderUnavailableError

logger = logging.getLogger(__name__)

AUTH_COOLDOWN_SECONDS = 30.0


class UpstoxAuthError(ProviderUnavailableError):
    """Raised when UPSTOX_ANALYTICS_TOKEN is rejected (401/403 invalid, expired, or revoked)."""


class UpstoxRateLimitError(ProviderUnavailableError):
    """Raised when Upstox HTTP 429 persists past bounded retry attempts."""


class UpstoxBadRequestError(ProviderUnavailableError):
    """Raised when Upstox rejects a request with 4xx (non-auth, non-429)."""


class UpstoxHttpClient:
    """
    Bounded-timeout HTTP client for Upstox read-only market-data and fundamentals endpoints.
    Uses ONLY `UPSTOX_ANALYTICS_TOKEN`; never substitutes daily OAuth access tokens.
    """

    def __init__(
        self,
        limiter: Optional[TokenBucketRateLimiter] = None,
        base_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_per_minute: Optional[int] = None,
        retry_attempts: Optional[int] = None,
        retry_backoff: Optional[float] = None,
        transport: Optional[httpx.BaseTransport] = None,
    ):
        self._limiter = limiter or rate_limiter
        self._base_url = (base_url or settings.UPSTOX_BASE_URL).rstrip("/")
        self._timeout = float(timeout_seconds if timeout_seconds is not None else settings.UPSTOX_TIMEOUT_SECONDS)
        self._max_per_minute = max(10, int(max_per_minute or settings.UPSTOX_RATE_LIMIT_PER_MINUTE))
        self._retry_attempts = max(1, int(retry_attempts if retry_attempts is not None else settings.PROVIDER_RETRY_ATTEMPTS))
        self._retry_backoff = max(0.05, float(retry_backoff if retry_backoff is not None else settings.PROVIDER_RETRY_BACKOFF_SECONDS))
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=httpx.Timeout(connect=min(5.0, self._timeout), read=self._timeout, write=5.0, pool=5.0),
            transport=transport,
        )
        self._minute_lock = threading.Lock()
        self._minute_window: Deque[float] = deque()
        self._auth_lock = threading.Lock()
        self._auth_failure: Optional[Dict[str, Any]] = None

    @staticmethod
    def get_analytics_token() -> str:
        return (settings.UPSTOX_ANALYTICS_TOKEN or "").strip()

    @classmethod
    def has_analytics_token(cls) -> bool:
        return bool(cls.get_analytics_token())

    @staticmethod
    def _token_fingerprint(token: str) -> str:
        return f"{len(token)}:{token[:4]}:{token[-4:]}"

    def _require_token(self) -> str:
        token = self.get_analytics_token()
        if not token:
            extra = (
                " Standard daily UPSTOX_ACCESS_TOKEN is not substituted; configure UPSTOX_ANALYTICS_TOKEN."
                if (settings.UPSTOX_ACCESS_TOKEN or "").strip()
                else ""
            )
            raise ProviderNotConfiguredError(
                f"Upstox Analytics Token is missing. Configure UPSTOX_ANALYTICS_TOKEN on the server.{extra}"
            )
        return token

    def _wait_minute_budget(self, deadline: Optional[float] = None) -> bool:
        while True:
            with self._minute_lock:
                now = time.monotonic()
                while self._minute_window and (now - self._minute_window[0]) >= 60.0:
                    self._minute_window.popleft()
                if len(self._minute_window) < self._max_per_minute:
                    self._minute_window.append(now)
                    return True
                wait_for = max(0.05, 60.0 - (now - self._minute_window[0]) + 0.02)
            if deadline is not None:
                remaining = deadline - time.monotonic()
                if remaining <= 0.05 or wait_for > remaining:
                    return False
                time.sleep(min(wait_for, remaining, 0.25))
            else:
                time.sleep(min(wait_for, 1.0))

    def _extract_error_code(self, response: httpx.Response) -> str:
        try:
            body = response.json()
            errors = body.get("errors") if isinstance(body, dict) else None
            if isinstance(errors, list) and errors:
                first = errors[0]
                if isinstance(first, dict):
                    return str(first.get("errorCode") or first.get("error_code") or "")
        except Exception:
            pass
        return ""

    def get_json(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        timeout_override: Optional[float] = None,
        max_attempts_override: Optional[int] = None,
    ) -> Dict[str, Any]:
        token = self._require_token()
        fp = self._token_fingerprint(token)
        with self._auth_lock:
            if (
                self._auth_failure is not None
                and self._auth_failure["fp"] == fp
                and (time.monotonic() - self._auth_failure["ts"]) < AUTH_COOLDOWN_SECONDS
            ):
                raise UpstoxAuthError(self._auth_failure["message"])

        headers = {"Accept": "application/json", "Authorization": f"Bearer {token}"}
        req_timeout = float(timeout_override) if timeout_override is not None else self._timeout
        attempts = (
            max(1, int(max_attempts_override))
            if max_attempts_override is not None
            else self._retry_attempts
        )
        deadline = (time.monotonic() + req_timeout) if timeout_override is not None else None
        last_exc: Optional[Exception] = None

        for attempt in range(attempts):
            limiter_wait = min(req_timeout, 0.5) if timeout_override is not None else req_timeout
            acquired = self._limiter.acquire(1.0, timeout=limiter_wait)
            if not acquired and timeout_override is not None:
                raise ProviderUnavailableError(f"Upstox rate-limiter wait timed out for {path}.")
            if not self._wait_minute_budget(deadline=deadline):
                raise ProviderUnavailableError(f"Upstox minute-budget wait timed out for {path}.")
            try:
                if timeout_override is not None:
                    remaining = max(0.05, (deadline - time.monotonic()) if deadline is not None else req_timeout)
                    req_t = httpx.Timeout(
                        connect=min(1.0, remaining),
                        read=remaining,
                        write=min(1.0, remaining),
                        pool=min(1.0, remaining),
                    )
                    resp = self._client.get(path, params=params, headers=headers, timeout=req_t)
                else:
                    resp = self._client.get(path, params=params, headers=headers)
            except httpx.TimeoutException as exc:
                last_exc = ProviderUnavailableError(f"Upstox API request timed out for {path}.")
                if attempt + 1 < attempts:
                    time.sleep(self._retry_backoff * (2 ** attempt) + random.uniform(0.0, 0.1))
                    continue
                raise last_exc from exc
            except httpx.HTTPError as exc:
                last_exc = ProviderUnavailableError(f"Upstox network error on {path}: {exc.__class__.__name__}")
                if attempt + 1 < attempts:
                    time.sleep(self._retry_backoff * (2 ** attempt) + random.uniform(0.0, 0.1))
                    continue
                raise last_exc from exc

            code = self._extract_error_code(resp)
            if resp.status_code in (401, 403):
                msg = (
                    f"Upstox Analytics Token was rejected (HTTP {resp.status_code}"
                    + (f", {code}" if code else "")
                    + "). Token may be invalid, expired, or revoked; rotate UPSTOX_ANALYTICS_TOKEN."
                )
                with self._auth_lock:
                    self._auth_failure = {"fp": fp, "ts": time.monotonic(), "message": msg}
                raise UpstoxAuthError(msg)

            if resp.status_code == 429:
                last_exc = UpstoxRateLimitError(
                    f"Upstox API rate limit exceeded (HTTP 429{', ' + code if code else ''})."
                )
                if attempt + 1 < attempts:
                    retry_after = resp.headers.get("Retry-After")
                    try:
                        delay = min(float(retry_after), 5.0) if retry_after else self._retry_backoff * (2 ** attempt)
                    except ValueError:
                        delay = self._retry_backoff * (2 ** attempt)
                    time.sleep(delay + random.uniform(0.0, 0.1))
                    continue
                raise last_exc

            if resp.status_code >= 500:
                last_exc = ProviderUnavailableError(
                    f"Upstox upstream service error (HTTP {resp.status_code}{', ' + code if code else ''})."
                )
                if attempt + 1 < attempts:
                    time.sleep(self._retry_backoff * (2 ** attempt) + random.uniform(0.0, 0.1))
                    continue
                raise last_exc

            if resp.status_code >= 400:
                raise UpstoxBadRequestError(
                    f"Upstox rejected request {path} (HTTP {resp.status_code}{', ' + code if code else ''})."
                )

            with self._auth_lock:
                self._auth_failure = None

            try:
                payload = resp.json()
            except ValueError as exc:
                raise ProviderUnavailableError(f"Upstox returned non-JSON payload for {path}.") from exc
            return payload if isinstance(payload, dict) else {}

        assert last_exc is not None
        raise last_exc

    def get_historical_candles(
        self,
        instrument_key: str,
        unit: str,
        interval: int,
        to_date: str,
        from_date: str,
    ) -> List[List[Any]]:
        enc_key = quote(instrument_key, safe="")
        payload = self.get_json(f"/v3/historical-candle/{enc_key}/{unit}/{interval}/{to_date}/{from_date}")
        candles = (payload.get("data") or {}).get("candles") if isinstance(payload.get("data"), dict) else None
        return candles if isinstance(candles, list) else []

    def get_intraday_candles(self, instrument_key: str, unit: str, interval: int) -> List[List[Any]]:
        enc_key = quote(instrument_key, safe="")
        payload = self.get_json(f"/v3/historical-candle/intraday/{enc_key}/{unit}/{interval}")
        candles = (payload.get("data") or {}).get("candles") if isinstance(payload.get("data"), dict) else None
        return candles if isinstance(candles, list) else []

    def search_instruments(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        payload = self.get_json(
            "/v2/instruments/search",
            params={"query": query, "exchanges": "NSE", "segments": "EQ", "records": max(1, min(30, limit))},
        )
        data = payload.get("data")
        return data if isinstance(data, list) else []

    def get_income_statement(
        self,
        isin: str,
        statement_type: str = "consolidated",
        time_period: str = "yearly",
    ) -> Dict[str, Any]:
        payload = self.get_json(
            f"/v2/fundamentals/{quote(isin, safe='')}/income-statement",
            params={"type": statement_type, "time_period": time_period},
        )
        data = payload.get("data")
        return data if isinstance(data, dict) else {}

    def get_key_ratios(self, isin: str) -> Any:
        payload = self.get_json(f"/v2/fundamentals/{quote(isin, safe='')}/key-ratios")
        return payload.get("data")

    def get_company_profile(self, isin: str) -> Dict[str, Any]:
        payload = self.get_json(f"/v2/fundamentals/{quote(isin, safe='')}/profile")
        data = payload.get("data")
        return data if isinstance(data, dict) else {}

    def get_corporate_actions(self, isin: str) -> List[Dict[str, Any]]:
        payload = self.get_json(f"/v2/fundamentals/{quote(isin, safe='')}/corporate-actions")
        data = payload.get("data")
        return data if isinstance(data, list) else []

    def get_full_quotes(
        self,
        instrument_keys: List[str],
        timeout_seconds: Optional[float] = None,
        max_attempts: Optional[int] = None,
    ) -> Dict[str, Any]:
        if not instrument_keys:
            return {}
        payload = self.get_json(
            "/v2/market-quote/quotes",
            params={"instrument_key": ",".join(instrument_keys)},
            timeout_override=timeout_seconds,
            max_attempts_override=max_attempts,
        )
        data = payload.get("data")
        return data if isinstance(data, dict) else {}
