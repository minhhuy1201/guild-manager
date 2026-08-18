/**
 * Quyền của tài khoản. Đi qua mạng (nằm trong response `/auth/login`, `/auth/me`
 * và trong payload JWT) nên định nghĩa phải ở package dùng chung.
 */

/** Quyền duy nhất hiện có: toàn quyền quản trị. */
export const ADMIN_ROLE = "ADMIN";

/** Quyền hợp lệ của một tài khoản. */
export type Role = typeof ADMIN_ROLE;
