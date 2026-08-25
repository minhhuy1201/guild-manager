import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

/** The uniform success response: data always lives under `data`. */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Wraps every successful response in `{ data }` so the frontend unwraps in one place in the api
 * client instead of handling a different shape per endpoint.
 *
 * Except `@Redirect()` routes: the `{ url }` they return is not client data but an instruction for
 * Nest, and Nest reads `url` off the top level. Wrapped in `data`, Nest no longer sees `url` and
 * returns a 302 with an empty `Location` — no error, no log, just a browser sitting still in the
 * middle of the Discord login flow.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Wrap the controller's return value in `data`, skipping redirect routes.
   * @param context - Execution context, used to read the handler's metadata
   * @param next - Next handler in the chain
   * @returns An observable of `{ data }`, or the untouched value for a redirect route
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const isRedirect =
      this.reflector.get(REDIRECT_METADATA, context.getHandler()) !== undefined;

    if (isRedirect) return next.handle();

    return next.handle().pipe(map((data) => ({ data })));
  }
}
