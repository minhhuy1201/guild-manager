/**
 * Vietnam-time date helper for specs.
 *
 * Lives here rather than in each `__tests__` directory because four specs had the same six lines,
 * and a Date written as UTC is unreadable in a suite whose every rule is stated on the Vietnamese
 * clock. Not in `packages/shared`: it is test scaffolding, not part of either app's contract.
 *
 * `src` is the `app` element for `eslint-plugin-boundaries`, so a module's spec may import this;
 * the rule only stops imports reaching *into* a module's internals. Jest's `testRegex`
 * (`.*\.spec\.ts$`) leaves this file alone.
 */

/**
 * Build a Date from Vietnam time (UTC+7).
 * @param iso - A string like '2026-07-22T12:00', read as Vietnam time
 * @returns The matching UTC Date
 */
export function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}
