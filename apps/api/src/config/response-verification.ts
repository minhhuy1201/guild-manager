import type { ZodType } from 'zod';

/**
 * Whether to run the Zod schema over outbound objects.
 *
 * This is the **only** place in `src/` that reads `process.env` directly (the standing rule: only
 * `ConfigService<Env, true>` reads env). The reason: this flag's users are the `<domain>.codec.ts`
 * files — module-level pure functions outside the DI tree, so they cannot receive a `ConfigService`.
 * Passing the flag as a parameter would force every call site to carry something unrelated to
 * building a response. The value is fixed once at import, like every other constant in `config/`.
 *
 * Disabled in production because this is a dev/CI safety net, not an untrusted-data boundary: data
 * leaving the process need not pay CPU on every response.
 */
export const SHOULD_VERIFY_RESPONSES = process.env.NODE_ENV !== 'production';

/**
 * Check a response object against the contract schema it claims to satisfy.
 *
 * `satisfies <Shape>` is a compile-time check, so an `as` cast on a value read from the database
 * goes through it silently: a stale enum value in a column reaches the client unnoticed. Parsing
 * here turns that class of bug loud in development, test and CI.
 *
 * @param schema - The `@guild/shared` schema that describes the outbound shape
 * @param value - The object built by a codec, already typed as that shape
 * @returns The same shape — parsed outside production, passed straight through in production
 * @throws ZodError outside production when the object does not match the contract
 */
export function verifyResponse<T>(schema: ZodType<T>, value: T): T {
  return SHOULD_VERIFY_RESPONSES ? schema.parse(value) : value;
}
