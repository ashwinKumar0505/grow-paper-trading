export type UpstoxErrorKind =
  | 'TOKEN_MISSING'
  | 'TOKEN_INVALID_OR_EXPIRED'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'UPSTREAM_UNAVAILABLE'
  | 'NETWORK_ERROR';

export class UpstoxApiError extends Error {
  readonly kind: UpstoxErrorKind;
  readonly httpStatus: number | null;
  readonly errorCode?: string;

  constructor(
    kind: UpstoxErrorKind,
    message: string,
    httpStatus: number | null = null,
    errorCode?: string
  ) {
    super(message);
    this.name = 'UpstoxApiError';
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.errorCode = errorCode;
  }
}

export interface UpstoxDepthLevel {
  quantity?: number;
  price?: number;
  orders?: number;
}

export interface UpstoxQuoteEntry {
  instrument_token?: string;
  symbol?: string;
  last_price?: number;
  net_change?: number;
  volume?: number;
  average_price?: number;
  timestamp?: string | number;
  last_trade_time?: string | number;
  lower_circuit_limit?: number;
  upper_circuit_limit?: number;
  total_buy_quantity?: number;
  total_sell_quantity?: number;
  depth?: {
    buy?: UpstoxDepthLevel[];
    sell?: UpstoxDepthLevel[];
  };
  cp?: number;
  prev_close_price?: number;
  ohlc?: { open?: number; high?: number; low?: number; close?: number };
}

export interface UpstoxSearchInstrument {
  instrument_key?: string;
  tradingsymbol?: string;
  trading_symbol?: string;
  name?: string;
  short_name?: string;
  exchange?: string;
  segment?: string;
  instrument_type?: string;
  last_price?: number;
  isin?: string;
}

export type UpstoxRawCandle = [string, number, number, number, number, number, number?];

export interface UpstoxHttpClientOptions {
  env?: Record<string, string | undefined>;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRequestsPerSecond?: number;
  maxRequestsPerMinute?: number;
  fetchFn?: typeof fetch;
}
