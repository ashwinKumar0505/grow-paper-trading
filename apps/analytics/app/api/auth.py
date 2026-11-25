"""Authentication, Entitlement Verification, and Sliding-Window Rate Limiting."""

import base64
from collections import defaultdict, deque
import hashlib
import hmac
import json
import threading
import time
from typing import Deque, Dict, List, Optional, Sequence
from fastapi import HTTPException, Request

from app.config import settings
from app.models.common import AuthContext

TIER_ALIASES: Dict[str, str] = {"BEGINNER": "PRO", "ADVANCED": "PREMIUM"}

TIER_RANK: Dict[str, int] = {
    "FREE": 0,
    "PRO": 1,
    "PREMIUM": 2,
    "ADMIN": 3,
    "SERVICE_INTERNAL": 4,
}


class SlidingWindowRateLimiter:
    """Thread-safe in-memory per-identity sliding-window API rate limiter."""

    def __init__(self):
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: float = 60.0) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= max_requests:
                return False
            q.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


api_rate_limiter = SlidingWindowRateLimiter()


def sign_service_request(
    secret: str,
    timestamp: str,
    method: str,
    path: str,
    user_context_b64: str = "",
) -> str:
    """Compute canonical HMAC-SHA256 signature for Express <-> FastAPI service contract."""
    message = f"{timestamp}.{method.upper()}.{path}.{user_context_b64}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _verify_service_hmac(request: Request) -> Optional[AuthContext]:
    """Verify HMAC-signed Express service-to-service headers. Never trusts unsigned tier headers."""
    sig = request.headers.get("X-Service-Signature")
    ts_str = request.headers.get("X-Service-Timestamp")
    if not sig or not ts_str:
        return None

    secret = settings.SERVICE_AUTH_SECRET
    if not secret:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "AUTH_MISCONFIGURED",
                "message": "Service authentication secret is not configured on backend.",
            },
        )

    try:
        ts_val = int(ts_str)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={"error_code": "UNAUTHORIZED", "message": "Invalid X-Service-Timestamp header."},
        )

    if abs(int(time.time()) - ts_val) > settings.SERVICE_AUTH_MAX_CLOCK_SKEW_SECONDS:
        raise HTTPException(
            status_code=401,
            detail={"error_code": "UNAUTHORIZED", "message": "Expired service request timestamp."},
        )

    ctx_b64 = request.headers.get("X-User-Context", "")
    expected = sign_service_request(secret, ts_str, request.method, request.url.path, ctx_b64)
    if not hmac.compare_digest(sig.strip().lower(), expected.lower()):
        raise HTTPException(
            status_code=401,
            detail={"error_code": "UNAUTHORIZED", "message": "Invalid service request signature."},
        )

    user_id: Optional[str] = "express-service"
    tier = "SERVICE_INTERNAL"
    roles: List[str] = ["service"]
    if ctx_b64:
        try:
            decoded = json.loads(base64.urlsafe_b64decode(ctx_b64.encode("utf-8")).decode("utf-8"))
            user_id = decoded.get("user_id") or user_id
            raw_tier = TIER_ALIASES.get(str(decoded.get("subscription_tier", "FREE")).upper(), str(decoded.get("subscription_tier", "FREE")).upper())
            tier = raw_tier if raw_tier in TIER_RANK else "FREE"
            roles = [str(r).lower() for r in decoded.get("roles", [])]
        except Exception:
            raise HTTPException(
                status_code=401,
                detail={"error_code": "UNAUTHORIZED", "message": "Malformed signed X-User-Context payload."},
            )

    return AuthContext(
        authenticated=True,
        auth_mechanism="HMAC_SERVICE_TOKEN",
        user_id=user_id,
        subscription_tier=tier,  # type: ignore[arg-type]
        roles=roles,
        is_service_call=True,
    )


def _verify_firebase_bearer(request: Request) -> Optional[AuthContext]:
    """Verify a Firebase ID token if `firebase_admin` is installed and configured."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"error_code": "UNAUTHORIZED", "message": "Empty Bearer token."},
        )

    try:
        from firebase_admin import auth as fb_auth  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "AUTH_PROVIDER_UNAVAILABLE",
                "message": "Firebase Admin SDK is not installed for direct token verification.",
            },
        )

    try:
        claims = fb_auth.verify_id_token(token, check_revoked=True)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"error_code": "UNAUTHORIZED", "message": "Invalid or expired Firebase ID token."},
        )

    # Entitlements MUST come from verified Firebase custom claims (set server-side), never client headers
    raw_tier = TIER_ALIASES.get(str(claims.get("subscription_tier", "FREE")).upper(), str(claims.get("subscription_tier", "FREE")).upper())
    tier = raw_tier if raw_tier in TIER_RANK else "FREE"
    roles = [str(r).lower() for r in claims.get("roles", [])] if isinstance(claims.get("roles"), list) else []
    if claims.get("admin") is True and "admin" not in roles:
        roles.append("admin")
        tier = "ADMIN"

    return AuthContext(
        authenticated=True,
        auth_mechanism="FIREBASE_ID_TOKEN",
        user_id=str(claims.get("uid") or claims.get("sub")),
        subscription_tier=tier,  # type: ignore[arg-type]
        roles=roles,
        is_service_call=False,
    )


async def resolve_auth_context(request: Request) -> AuthContext:
    """FastAPI dependency resolving caller authentication according to `settings.effective_auth_mode`."""
    mode = settings.effective_auth_mode
    if mode == "disabled_dev_only":
        # Even in dev mode, NEVER trust client-supplied X-Subscription-Tier headers!
        return AuthContext(
            authenticated=True,
            auth_mechanism="DISABLED_DEV_ONLY",
            user_id="local-dev",
            subscription_tier="SERVICE_INTERNAL",
            roles=["dev", "admin"],
            is_service_call=False,
        )

    if mode in ("service_token", "hybrid"):
        ctx = _verify_service_hmac(request)
        if ctx is not None:
            return ctx

    if mode in ("firebase", "hybrid"):
        ctx = _verify_firebase_bearer(request)
        if ctx is not None:
            return ctx

    raise HTTPException(
        status_code=401,
        detail={
            "error_code": "UNAUTHORIZED",
            "message": f"Authentication required (active mode: {mode}). Supply valid signed credentials.",
        },
    )


def enforce_entitlement(
    auth: AuthContext,
    min_tier: str = "FREE",
    required_roles: Optional[Sequence[str]] = None,
) -> None:
    """Raise structured 403 ENTITLEMENT_DENIED when verified tier/roles are insufficient."""
    caller_rank = TIER_RANK.get(auth.subscription_tier, 0)
    required_rank = TIER_RANK.get(min_tier, 0)
    if caller_rank < required_rank:
        raise HTTPException(
            status_code=403,
            detail={
                "error_code": "ENTITLEMENT_DENIED",
                "message": (
                    f"Operation requires '{min_tier}' tier or higher "
                    f"(verified caller tier: '{auth.subscription_tier}')."
                ),
            },
        )
    if required_roles:
        caller_roles = set(auth.roles)
        if not any(r.lower() in caller_roles for r in required_roles) and auth.subscription_tier != "SERVICE_INTERNAL":
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "ENTITLEMENT_DENIED",
                    "message": f"Operation requires one of roles: {list(required_roles)}.",
                },
            )


def enforce_rate_limit(
    request: Request,
    auth: AuthContext,
    bucket: str = "default",
    expensive: bool = False,
) -> None:
    """Enforce per-caller sliding-window rate limits with structured 429 response."""
    caller_id = auth.user_id or (request.client.host if request.client else "unknown")
    limit = (
        settings.EXPENSIVE_ENDPOINT_RATE_LIMIT_PER_MINUTE
        if expensive
        else settings.API_RATE_LIMIT_PER_MINUTE
    )
    key = f"{bucket}:{caller_id}"
    if not api_rate_limiter.check(key, max_requests=limit, window_seconds=60.0):
        raise HTTPException(
            status_code=429,
            detail={
                "error_code": "RATE_LIMIT_EXCEEDED",
                "message": f"Rate limit exceeded ({limit} requests/min for '{bucket}'). Retry shortly.",
            },
        )
