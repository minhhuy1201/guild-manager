// Lint fixture for __tests__/lint-rules.test.ts: calling fetch outside lib/api-client.ts.
// Never imported by app code.
export function loadFixture(): Promise<Response> {
  return fetch("/lint-fixture");
}
