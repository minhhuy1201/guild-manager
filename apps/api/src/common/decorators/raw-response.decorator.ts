import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/** Metadata key marking a route whose return value must reach the caller untouched. */
export const RAW_RESPONSE_METADATA = 'rawResponse';

/**
 * Marks a route whose response body is owned by a third party, so `TransformInterceptor` leaves it
 * alone instead of wrapping it in `{ data }`.
 *
 * @returns The decorator that sets the raw-response metadata on the route
 */
export const RawResponse = (): CustomDecorator =>
  SetMetadata(RAW_RESPONSE_METADATA, true);
