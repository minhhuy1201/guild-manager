/**
 * Marks a branch the type system believes is unreachable.
 *
 * Calling it with a value whose union has grown is a compile error, which is the point: adding a
 * triage category without deciding what to advise becomes impossible to merge.
 *
 * @param value The value that should have no remaining variants.
 * @returns Never - it always throws.
 * @throws Error Always, should the impossible value arrive at runtime.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
