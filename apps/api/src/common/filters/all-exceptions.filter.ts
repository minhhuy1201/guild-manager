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

/**
 * What body-parser tags the error with when a request exceeds the configured limit. It throws a
 * plain `Error`, not an `HttpException`, so without this the filter would read it as an unknown
 * fault and answer 500 — a server error for what is squarely the caller's.
 */
const PAYLOAD_TOO_LARGE_TYPE = 'entity.too.large';

/** Shown when the request body exceeds `JSON_BODY_LIMIT`. */
const PAYLOAD_TOO_LARGE_MESSAGE =
  'Ảnh gửi lên quá nặng. Thử lại với ít trận hơn, hoặc báo admin.';

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
 *
 * It is also the only place a failed request gets logged — `LoggingInterceptor` covers the success
 * path and never runs when a guard rejects the request.
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

    const status = statusOf(exception);

    const body: ErrorResponseBody = {
      statusCode: status,
      ...describeException(exception),
      path: request.url,
      requestId: String(request.headers[REQUEST_ID_HEADER] ?? ''),
      timestamp: new Date().toISOString(),
    };

    const line = `${request.method} ${request.url} -> ${status} [${body.requestId}]`;

    if (status >= SERVER_ERROR_STATUS) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      // A guard rejects before any interceptor runs, so without this line a 401 or 403 leaves no
      // trace anywhere. 4xx is the caller's mistake: one line, no stack.
      this.logger.warn(line);
    }

    response.status(status).json(body);
  }
}

/**
 * Whether an exception is body-parser refusing an oversized request.
 * @param exception - Exception to test
 * @returns True when body-parser rejected the request for its size
 */
function isPayloadTooLarge(exception: unknown): boolean {
  return (
    exception instanceof Error &&
    (exception as { type?: unknown }).type === PAYLOAD_TOO_LARGE_TYPE
  );
}

/**
 * The HTTP status an exception answers with.
 * Exported so `__tests__` can exercise each branch without faking an `ArgumentsHost`.
 * @param exception - Exception to map
 * @returns Its own status for an `HttpException`, 413 for an oversized body, 500 otherwise
 */
export function statusOf(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  if (isPayloadTooLarge(exception)) return HttpStatus.PAYLOAD_TOO_LARGE;

  return HttpStatus.INTERNAL_SERVER_ERROR;
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
  if (isPayloadTooLarge(exception)) {
    return { message: PAYLOAD_TOO_LARGE_MESSAGE };
  }

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
