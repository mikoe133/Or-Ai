import type { ApiErrorCode } from './shared.js';

/** Process liveness and dependency readiness are intentionally separate. */
export interface HealthResponse {
  status: 'ok' | 'unavailable';
  requestId: string;
  checks?: {
    database: 'up' | 'down';
  };
}

/** Only public error details are sent to the client; never credentials or SQL. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
}

export * from './public.js';
export * from './shared.js';
