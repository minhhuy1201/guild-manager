import "server-only";

/**
 * Cửa vào phía **server** của feature auth: mọi thứ chạm cookie phiên.
 *
 * Tách khỏi `./index.ts` vì các hàm dưới đây dùng `next/headers` — chỉ Server Component,
 * Server Action và Route Handler gọi được. `import "server-only"` ở đầu file biến một lần
 * import nhầm từ Client Component thành lỗi build có tên rõ ràng, thay vì lỗi
 * "next/headers in the Pages Router" khó lần ra.
 */
export { fetchMe } from "./api/me";
export {
  clearSession,
  createSession,
  getAccessToken,
  getSession,
} from "./api/session";
export type { SessionUser } from "./api/session";
