import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorCode, ApiErrorResponse } from '@orai/contracts';
import type { ContextRequest } from './request-context';

export class ApiException extends HttpException {
  constructor(public readonly code: ApiErrorCode, public readonly publicMessage: string, status: number) {
    super(publicMessage, status);
  }
}

export class RateLimitException extends ApiException {
  constructor(public readonly retryAfterSeconds: number) { super('RATE_LIMITED', '操作过于频繁，请稍后重试', 429); }
}

const messages: Record<number, [ApiErrorCode, string]> = {
  400: ['INVALID_INPUT', '提交内容格式不正确'],
  401: ['AUTH_REQUIRED', '请先登录或恢复兑换权益'],
  403: ['FORBIDDEN', '没有访问权限'],
  404: ['NOT_FOUND', '内容不存在'],
  409: ['CONFLICT', '内容已更新，请刷新后重试'],
  429: ['RATE_LIMITED', '操作过于频繁，请稍后重试'],
  503: ['SERVICE_UNAVAILABLE', '服务暂时不可用，请稍后重试'],
};

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<ContextRequest>();
    const response = http.getResponse<Response>();
    if (exception instanceof RateLimitException) response.setHeader('Retry-After', exception.retryAfterSeconds);
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const [code, message] = exception instanceof ApiException
      ? [exception.code, exception.publicMessage]
      : messages[status] ?? ['INTERNAL_ERROR', '服务出现错误，请稍后重试'] as const;
    if (status >= 500) {
      // No body, URL, headers or raw exception: these may contain private tokens/data.
      this.logger.error(JSON.stringify({ event: 'http_error', status, code, requestId: request.requestId }));
    }
    const body: ApiErrorResponse = { error: { code, message, requestId: request.requestId } };
    response.status(status).json(body);
  }
}
