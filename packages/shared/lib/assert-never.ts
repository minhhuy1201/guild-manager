/**
 * Make a missed variant a compile error.
 *
 * Call it in the `default` branch of a switch over a discriminated union: TypeScript narrows the
 * value to `never` once every case is handled, so adding a variant without a branch stops the build
 * instead of falling quietly through to whatever the default did.
 * @param value - The value every case should already have handled
 * @returns Never; it always throws
 * @throws Always, naming the value that got through
 */
export function assertNever(value: never): never {
  throw new Error(`Trường hợp chưa được xử lý: ${JSON.stringify(value)}`);
}
