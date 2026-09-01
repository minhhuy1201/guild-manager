import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/http.constant';

/**
 * Give every request a correlation id before anything can reject it.
 *
 * This is Express middleware and not an interceptor on purpose: Nest runs middleware ahead of the
 * guard layer, interceptors after it. While the id was minted in `LoggingInterceptor`, every
 * request a guard rejected — each 401 and 403 the API returns — reached neither the log line nor
 * the `requestId` in its own error body. Moving this back into an interceptor reopens that hole.
 *
 * @param request - Incoming request; an id the caller supplied is kept, so a client can stitch its
 *   logs to ours
 * @param response - Outgoing response, which echoes the id back in the same header
 * @param next - Hands control to the rest of the stack
 * @returns Nothing
 */
export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = String(request.headers[REQUEST_ID_HEADER] ?? randomUUID());

  request.headers[REQUEST_ID_HEADER] = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
