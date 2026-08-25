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

/** At and above this status the error is server-side — log it with a stack. */
const SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

/** The uniform error body every endpoint returns on an exception. */
export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  /** Validation details when present — produced by ZodValidationPipe. */
  errors?: unknown;
  path: string;
  requestId: string;
  timestamp: string;
}

/**
 * Catches every unhandled exception and normalises it into one response shape, so the frontend
 * reads errors in a single place.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Turn an exception into the uniform HTTP response.
   * @param exception - Any exception Nest caught
   * @param host - Execution context, used to get the Express request/response
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
 * Extract the message and error details from an exception.
 * Exported so `__tests__` can exercise each branch directly instead of faking an `ArgumentsHost`.
 * @param exception - Exception to describe
 * @returns A displayable message, plus `errors` for multi-field validation failures
 */
export function describeException(exception: unknown): {
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
