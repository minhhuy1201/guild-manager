import { ConfigService } from '@nestjs/config';

import type { Env } from './env.validation';

/** ConfigService typed with Env — inject this instead of a bare ConfigService. */
export type AppConfigService = ConfigService<Env, true>;

/** Shared prefix for every HTTP route. */
export const API_PREFIX = 'api';

/**
 * Largest JSON body the API accepts, in bytes.
 *
 * Express defaults to 100kb, which the formation announcement blows straight past: it carries one
 * or two line-up screenshots as base64. Below this the request dies in the body parser — before any
 * guard, so the caller gets a bare 500 naming nothing.
 *
 * Sized **above** `ANNOUNCEMENT_IMAGE_MAX_CHARS × 2` on purpose, so an image that really is too big
 * is refused by the schema, in Vietnamese, naming the image — and **below** the 4.5MB a Vercel
 * Function accepts, so the ceiling that bites is this one, identically on a laptop and in
 * production. `config/__tests__/body-limit.spec.ts` keeps the three numbers in that order.
 */
export const JSON_BODY_LIMIT = 4 * 1024 * 1024;

/**
 * Swagger UI path (enabled outside production only).
 * Sits outside `API_PREFIX` — served at `http://localhost:PORT/docs`.
 */
export const SWAGGER_PATH = 'docs';

/**
 * pg pool settings, following Vercel's recommendations for Fluid compute.
 *
 * A short `idleTimeoutMillis` returns connections to Supavisor early. **Do not set `max: 1`**:
 * Fluid compute runs concurrent requests on one instance, and a single-connection pool turns them
 * into a queue. `min: 1` keeps one connection warm so the next request skips the handshake.
 */
export const DATABASE_POOL_OPTIONS = {
  min: 1,
  idleTimeoutMillis: 5_000,
} as const;
