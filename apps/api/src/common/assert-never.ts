/**
 * Ends a switch over a discriminated union.
 *
 * A new variant nobody handled becomes a compile error here, because only an exhausted union
 * narrows to `never`. At runtime it still throws — data that entered the process from outside can
 * carry a tag the type says is impossible.
 *
 * @param value - The value TypeScript has narrowed to `never`
 * @param message - What was being switched on, used as the error prefix
 * @returns Never returns
 * @throws Error always
 */
export function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
