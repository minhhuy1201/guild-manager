import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/http.constant';

/**
 * Shape a caller-supplied id must have to be adopted: word characters and dashes, at most 64.
 *
 * A UUID fits comfortably. Anything else is replaced rather than rejected, because the id is
 * echoed into the response header and written to the log of every request — including the
 * unauthenticated ones a guard turns away, which is exactly where an arbitrary blob would be
 * cheapest to inject.
 */
const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

/**
 * Give every request a correlation id before anything can reject it.
 *
 * This is Express middleware and not an interceptor on purpose: Nest runs middleware ahead of the
 * guard layer, interceptors after it. While the id was minted in `LoggingInterceptor`, every
 * request a guard rejected — each 401 and 403 the API returns — reached neither the log line nor
 * the `requestId` in its own error body. Moving this back into an interceptor reopens that hole.
 *
 * @param request - Incoming request; a well-formed id the caller supplied is kept, so a client can
 *   stitch its logs to ours
 * @param response - Outgoing response, which echoes the id back in the same header
 * @param next - Hands control to the rest of the stack
 * @returns Nothing
 */
export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  // A header sent twice arrives as an array, which is why the type is checked and not just the
  // shape.
  const supplied = request.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof supplied === 'string' && SAFE_REQUEST_ID.test(supplied)
      ? supplied
      : randomUUID();

  request.headers[REQUEST_ID_HEADER] = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
