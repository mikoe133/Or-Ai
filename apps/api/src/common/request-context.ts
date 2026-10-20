import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type ContextRequest = Request & { requestId: string };

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header('x-request-id');
  // Issued codes/session tokens are 43 URL-safe characters. Never echo such a
  // credential if a caller mistakenly supplies it as a tracing header.
  const requestId = incoming && (/^[a-zA-Z0-9_-]{1,31}$/.test(incoming) || /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(incoming)) ? incoming : randomUUID();
  (request as ContextRequest).requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}
