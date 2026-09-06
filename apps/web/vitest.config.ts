import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for apps/web.
 * Runs in the node environment by default — pure functions and the data layer need no DOM. Files that
 * do (hooks, components) declare `// @vitest-environment jsdom` on their first line.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Call counts must not leak between tests: without this a `toHaveBeenCalledTimes`
    // assertion silently counts the previous test's calls too. Only `mock.calls` is
    // cleared, so an implementation set in a `beforeEach` survives.
    clearMocks: true,
    // Every timestamp in the app is Vietnam time; pin TZ so results do not vary by machine.
    env: { TZ: "Asia/Ho_Chi_Minh" },
    include: ["**/__tests__/**/*.test.ts?(x)"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
