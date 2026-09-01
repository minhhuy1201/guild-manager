import { z } from 'zod';

/**
 * Schema for every environment variable the API needs.
 * Validated at boot so the app fails fast instead of dying mid-run.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  /** API port — 3001 by default so it does not collide with Next.js (3000). */
  PORT: z.coerce.number().int().positive().default(3001),
  /** PostgreSQL connection string used by Prisma. */
  DATABASE_URL: z.url(),
  /** Frontend origin, used for CORS. */
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  /**
   * Web project name on Vercel — used to additionally accept the preview domains
   * `https://<project>-…vercel.app`. Omit when not deploying on Vercel; an empty declaration in
   * .env counts as omitted.
   */
  WEB_PREVIEW_PROJECT: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  /** JWT signing key (access + refresh) — must match apps/web so the web app can verify. */
  AUTH_SECRET: z.string().min(32),
  /** Discord Application client ID (Developer Portal → OAuth2). */
  DISCORD_CLIENT_ID: z.string().min(1),
  /** Discord Application client secret — lives only on the API, never on the web. */
  DISCORD_CLIENT_SECRET: z.string().min(1),
  /**
   * Redirect URI declared in the Discord Developer Portal.
   * Must match character for character, trailing `/` included — Discord rejects any difference.
   */
  DISCORD_REDIRECT_URI: z.url(),
  /**
   * Comma-separated list of rescue Discord IDs.
   * These always sign in as ADMIN even when they match no Character — the only way in when no row
   * in the database has a Discord ID yet.
   */
  DISCORD_ADMIN_IDS: z.string().default(''),
  /**
   * Discord Application public key (Developer Portal → General Information).
   * Verifies the Ed25519 signature on every interaction webhook — 64 hex characters.
   */
  DISCORD_PUBLIC_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'DISCORD_PUBLIC_KEY phải là 64 ký tự hex.'),
  /** Timezone used to compute attendance deadlines (see docs/architecture.md section 6). */
  APP_TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
});

/** The validated, coerced env type. */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at startup, for `ConfigModule.forRoot({ validate })`.
 * @param config - Raw variables from process.env and the .env files
 * @returns The parsed env (PORT as a number, defaults applied)
 * @throws Error when a variable is missing or malformed
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = z.prettifyError(parsed.error);
    throw new Error(`Biến môi trường không hợp lệ:\n${details}`);
  }

  return parsed.data;
}
