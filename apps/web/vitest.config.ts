import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Cấu hình Vitest cho apps/web.
 * Mặc định chạy ở môi trường node — hàm thuần và tầng data không cần DOM. File
 * nào cần DOM (hook, component) tự khai `// @vitest-environment jsdom` ở dòng đầu.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Mọi mốc giờ trong app tính theo giờ Việt Nam; cố định TZ để test không đổi
    // kết quả theo máy chạy.
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
