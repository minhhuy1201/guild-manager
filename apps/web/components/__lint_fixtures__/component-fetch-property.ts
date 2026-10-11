// Lint fixture for __tests__/lint-rules.test.ts: the two property forms of fetch.
// Never imported by app code.
export function loadFixture(): Promise<Response[]> {
  return Promise.all([
    window.fetch("/lint-fixture"),
    globalThis.fetch("/lint-fixture"),
  ]);
}
