import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { REQUEST_ID_HEADER } from '../constants/http.constant';

/**
 * Logs method, URL, status and duration of every request that succeeds.
 *
 * Failures are not logged here: `tap` with one argument only sees the `next` branch, and an
 * interceptor never runs at all when a guard rejects the request. `AllExceptionsFilter` owns the
 * failure path, so the two together cover every request exactly once.
 *
 * The correlation id comes from `requestIdMiddleware`, which runs early enough that a rejected
 * request has one too.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * Wrap request handling to time it and write the log line.
   * @param context - Nest execution context
   * @param next - Next handler in the chain
   * @returns The response observable, unchanged
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // `requestIdMiddleware` runs before every guard, so the header is always here by now.
    const requestId = String(request.headers[REQUEST_ID_HEADER]);

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - startedAt;
        this.logger.log(
          `${request.method} ${request.url} ${response.statusCode} - ${elapsed}ms [${requestId}]`,
        );
      }),
    );
  }
}
