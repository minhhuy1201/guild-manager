import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Cấu hình Vitest cho tầng data (api client, hàm gọi API).
 * Chạy ở môi trường node — không test component nên không cần jsdom.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "@shared": fileURLToPath(new URL("../../packages/shared", import.meta.url)),
    },
  },
});
