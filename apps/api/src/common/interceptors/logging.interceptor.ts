import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { REQUEST_ID_HEADER } from '../constants/http.constant';

/**
 * Attaches a request ID to every request and logs method, URL, status and duration.
 * The request ID is echoed in a response header so clients can quote it when reporting errors.
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

    const requestId = String(
      request.headers[REQUEST_ID_HEADER] ?? randomUUID(),
    );
    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

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
