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
 * Gắn request ID cho mỗi request và log lại method, URL, status, thời gian xử lý.
 * Request ID được trả về trong response header để client đối chiếu khi báo lỗi.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * Bọc quá trình xử lý request để đo thời gian và ghi log.
   * @param context - Ngữ cảnh thực thi của Nest
   * @param next - Handler kế tiếp trong chuỗi xử lý
   * @returns Observable của response, không thay đổi dữ liệu
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
