---
paths:
  - "apps/web/**/__tests__/**"
  - "apps/web/vitest.config.ts"
---

# Web tests

- **Run Vitest in the node environment by default.** Opt a DOM test (hooks, components) into jsdom with `// @vitest-environment jsdom` on its first line.
- **Put tests in `__tests__/` beside the folder they cover.** Match `**/__tests__/**/*.test.ts?(x)`.
- **Assert with Vitest's matchers.** There is no `jest-dom`.
- **Keep `TZ=Asia/Ho_Chi_Minh` and `clearMocks: true`** in `vitest.config.ts`. Never write a test that relies on call counts carrying over from an earlier one.
- **Test the pure `lib/` layer first.** Extract a derivation into `lib/` so it needs no rendering. Component tests are the exception.
- **Expect tests to run against `packages/shared/dist`,** not its sources. `pretest` rebuilds it; see [`shared.md`](../shared.md) for watch mode.

Why: [`frontend.md` §8](../../../apps/web/docs/frontend.md#8-tests).
