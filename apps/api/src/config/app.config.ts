import { ConfigService } from '@nestjs/config';

import type { Env } from './env.validation';

/** ConfigService typed with Env — inject this instead of a bare ConfigService. */
export type AppConfigService = ConfigService<Env, true>;

/** Shared prefix for every HTTP route. */
export const API_PREFIX = 'api';

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
