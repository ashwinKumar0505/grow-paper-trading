import {
  UpstoxApiError,
  type UpstoxHttpClientOptions,
  type UpstoxQuoteEntry,
  type UpstoxRawCandle,
  type UpstoxSearchInstrument,
} from './upstoxTypes';

const DEFAULT_BASE_URL = 'https://api.upstox.com';
const AUTH_COOLDOWN_MS = 30_000;

export class UpstoxHttpClient {
  private env: Record<string, string | undefined>;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private baseRetryDelayMs: number;
  private maxPerSec: number;
  private maxPerMin: number;
  private fetchFn: typeof fetch;
  private requestTimestampsMs: number[] = [];
  private inFlight = new Map<string, Promise<unknown>>();
  private authFailureState: { tokenFp: string; failedAt: number; message: string } | null = null;

  constructor(options: UpstoxHttpClientOptions = {}) {
    this.env = options.env ?? process.env;
    this.baseUrl = (options.baseUrl || this.env.UPSTOX_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeoutMs = Math.max(1000, Number(options.timeoutMs ?? this.env.UPSTOX_TIMEOUT_MS ?? 8000));
    this.maxRetries = Math.max(0, Number(options.maxRetries ?? this.env.UPSTOX_MAX_RETRIES ?? 2));
    this.baseRetryDelayMs = Math.max(50, Number(options.baseRetryDelayMs ?? 350));
    this.maxPerSec = Math.max(1, Number(options.maxRequestsPerSecond ?? this.env.UPSTOX_RATE_LIMIT_PER_SECOND ?? 10));
    this.maxPerMin = Math.max(10, Number(options.maxRequestsPerMinute ?? this.env.UPSTOX_RATE_LIMIT_PER_MINUTE ?? 120));
    this.fetchFn = options.fetchFn ?? fetch;
  }

  getAnalyticsToken(): string {
    return (this.env.UPSTOX_ANALYTICS_TOKEN || '').trim();
  }

  hasAnalyticsToken(): boolean {
    return this.getAnalyticsToken().length > 0;
  }

  private getTokenFingerprint(token: string): string {
    return `${token.length}:${token.slice(0, 4)}:${token.slice(-4)}`;
  }

  private async waitForRateSlot(): Promise<void> {
    while (true) {
      const now = Date.now();
      this.requestTimestampsMs = this.requestTimestampsMs.filter((t) => now - t < 60_000);
      const recentSec = this.requestTimestampsMs.filter((t) => now - t < 1000).length;
      if (recentSec < this.maxPerSec && this.requestTimestampsMs.length < this.maxPerMin) {
        this.requestTimestampsMs.push(now);
        return;
      }
      const waitMs = recentSec >= this.maxPerSec ? 120 : Math.min(1000, 60_000 - (now - this.requestTimestampsMs[0]) + 25);
      await new Promise((r) => setTimeout(r, Math.max(25, waitMs)));
    }
  }

  private parseErrorCode(body: unknown): string | undefined {
    const rec = body as { errors?: Array<{ errorCode?: string; error_code?: string }> } | null;
    const first = rec?.errors?.[0];
    return first?.errorCode || first?.error_code;
  }

  async getJson<T>(pathWithQuery: string): Promise<T> {
    const token = this.getAnalyticsToken();
    if (!token) {
      const hint = this.env.UPSTOX_ACCESS_TOKEN
        ? ' Standard daily UPSTOX_ACCESS_TOKEN is not substituted; configure UPSTOX_ANALYTICS_TOKEN.'
        : '';
      throw new UpstoxApiError(
        'TOKEN_MISSING',
        `Upstox Analytics Token is not configured. Set UPSTOX_ANALYTICS_TOKEN on the server.${hint}`
      );
    }

    const fp = this.getTokenFingerprint(token);
    if (this.authFailureState?.tokenFp === fp && Date.now() - this.authFailureState.failedAt < AUTH_COOLDOWN_MS) {
      throw new UpstoxApiError('TOKEN_INVALID_OR_EXPIRED', this.authFailureState.message, 401);
    }

    const existing = this.inFlight.get(pathWithQuery);
    if (existing) return existing as Promise<T>;

    const promise = this.executeWithRetry<T>(pathWithQuery, token, fp).finally(() => {
      this.inFlight.delete(pathWithQuery);
    });
    this.inFlight.set(pathWithQuery, promise);
    return promise;
  }

  private async executeWithRetry<T>(pathWithQuery: string, token: string, fp: string): Promise<T> {
    const url = `${this.baseUrl}${pathWithQuery}`;
    let lastError: UpstoxApiError | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.waitForRateSlot();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchFn(url, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        clearTimeout(timer);
        const body = await res.json().catch(() => null);
        const errorCode = this.parseErrorCode(body);

        if (res.status === 401 || res.status === 403) {
          const msg =
            res.status === 401
              ? 'Upstox Analytics Token is invalid, expired, or revoked. Rotate UPSTOX_ANALYTICS_TOKEN on the server.'
              : 'Upstox Analytics Token lacks permission for this endpoint.';
          this.authFailureState = { tokenFp: fp, failedAt: Date.now(), message: msg };
          throw new UpstoxApiError('TOKEN_INVALID_OR_EXPIRED', msg, res.status, errorCode);
        }
        if (res.status === 429) {
          lastError = new UpstoxApiError('RATE_LIMITED', 'Upstox API rate limit reached.', 429, errorCode);
          if (attempt < this.maxRetries) {
            const retrySec = Number(res.headers.get('retry-after') || 0);
            const delay = retrySec > 0 ? Math.min(retrySec * 1000, 5000) : this.baseRetryDelayMs * 2 ** attempt;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          throw lastError;
        }
        if (res.status >= 500) {
          lastError = new UpstoxApiError('UPSTREAM_UNAVAILABLE', `Upstox upstream error (HTTP ${res.status}).`, res.status, errorCode);
          if (attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, this.baseRetryDelayMs * 2 ** attempt));
            continue;
          }
          throw lastError;
        }
        if (!res.ok) {
          throw new UpstoxApiError('BAD_REQUEST', `Upstox rejected request (HTTP ${res.status}).`, res.status, errorCode);
        }
        this.authFailureState = null;
        return body as T;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof UpstoxApiError) {
          if (err.kind === 'TOKEN_INVALID_OR_EXPIRED' || err.kind === 'BAD_REQUEST' || err.kind === 'TOKEN_MISSING') throw err;
          lastError = err;
          if (attempt >= this.maxRetries) throw err;
        } else {
          lastError = new UpstoxApiError(
            'NETWORK_ERROR',
            err instanceof Error && err.name === 'AbortError' ? 'Upstox market data request timed out.' : 'Unable to reach Upstox market data API.'
          );
          if (attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, this.baseRetryDelayMs * 2 ** attempt));
            continue;
          }
          throw lastError;
        }
      }
    }
    throw lastError || new UpstoxApiError('UPSTREAM_UNAVAILABLE', 'Upstox market data request failed.');
  }

  async getFullQuotes(instrumentKeys: string[]): Promise<Record<string, UpstoxQuoteEntry>> {
    if (instrumentKeys.length === 0) return {};
    const param = encodeURIComponent(instrumentKeys.join(','));
    const res = await this.getJson<{ data?: Record<string, UpstoxQuoteEntry> }>(`/v2/market-quote/quotes?instrument_key=${param}`);
    return res?.data || {};
  }

  async getHistoricalCandles(
    instrumentKey: string,
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    interval: number,
    toDate: string,
    fromDate: string
  ): Promise<UpstoxRawCandle[]> {
    const res = await this.getJson<{ data?: { candles?: UpstoxRawCandle[] } }>(
      `/v3/historical-candle/${encodeURIComponent(instrumentKey)}/${unit}/${interval}/${toDate}/${fromDate}`
    );
    return Array.isArray(res?.data?.candles) ? res.data.candles : [];
  }

  async getIntradayCandles(instrumentKey: string, unit: 'minutes' | 'hours' | 'days', interval: number): Promise<UpstoxRawCandle[]> {
    const res = await this.getJson<{ data?: { candles?: UpstoxRawCandle[] } }>(
      `/v3/historical-candle/intraday/${encodeURIComponent(instrumentKey)}/${unit}/${interval}`
    );
    return Array.isArray(res?.data?.candles) ? res.data.candles : [];
  }

  async searchInstruments(query: string, limit = 10): Promise<UpstoxSearchInstrument[]> {
    const records = Math.max(1, Math.min(30, limit));
    const res = await this.getJson<{ data?: UpstoxSearchInstrument[] }>(
      `/v2/instruments/search?query=${encodeURIComponent(query)}&exchanges=NSE&segments=EQ&records=${records}`
    );
    return Array.isArray(res?.data) ? res.data : [];
  }

  async getFundamentalPayload<T = unknown>(isin: string, subPath: string): Promise<T | null> {
    if (!isin) return null;
    const res = await this.getJson<{ data?: T }>(`/v2/fundamentals/${encodeURIComponent(isin)}/${subPath}`);
    return res?.data ?? null;
  }
}
