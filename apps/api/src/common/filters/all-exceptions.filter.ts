import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/http.constant';

/** Từ mốc status này trở lên là lỗi phía server — cần ghi log kèm stack. */
const SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

/** Body lỗi thống nhất mà mọi endpoint trả về khi có exception. */
export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  /** Chi tiết lỗi validate (nếu có) — do ZodValidationPipe sinh ra. */
  errors?: unknown;
  path: string;
  requestId: string;
  timestamp: string;
}

/**
 * Bắt mọi exception chưa xử lý và chuẩn hóa thành một format response duy nhất,
 * để frontend chỉ cần một chỗ đọc lỗi.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Chuyển exception thành HTTP response theo format thống nhất.
   * @param exception - Exception bất kỳ do Nest bắt được
   * @param host - Ngữ cảnh thực thi, dùng để lấy request/response của Express
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorResponseBody = {
      statusCode: status,
      ...describeException(exception),
      path: request.url,
      requestId: String(request.headers[REQUEST_ID_HEADER] ?? ''),
      timestamp: new Date().toISOString(),
    };

    if (status >= SERVER_ERROR_STATUS) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}

/**
 * Tách message và chi tiết lỗi ra khỏi exception.
 * @param exception - Exception cần mô tả
 * @returns Message hiển thị được, kèm `errors` khi là lỗi validate nhiều trường
 */
function describeException(exception: unknown): {
  message: string;
  errors?: unknown;
} {
  if (!(exception instanceof HttpException)) {
    return { message: 'Lỗi hệ thống, vui lòng thử lại sau.' };
  }

  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return { message: payload };
  }

  const { message, errors } = payload as {
    message?: unknown;
    errors?: unknown;
  };

  return {
    message: Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : exception.message,
    errors,
  };
}
