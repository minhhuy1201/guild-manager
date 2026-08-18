/**
 * Hằng số và kiểu của JWT dùng chung giữa guard (`common/`) và module auth (`modules/auth`).
 * Đặt ở `common/` vì guard không được phép import từ `modules/`.
 */
import type { Role } from '@guild/shared/enums';

/**
 * Quyền duy nhất hiện có: toàn quyền quản trị.
 * Định nghĩa thật nằm ở `@guild/shared/enums` vì giá trị này đi qua mạng
 * (`/auth/login`, `/auth/me`); re-export ở đây để mọi chỗ đang import từ `common` giữ nguyên.
 */
export { ADMIN_ROLE } from '@guild/shared/enums';

/** Loại token, ghi trong payload để access token không dùng thay refresh token được. */
export const TOKEN_TYPE = {
  access: 'access',
  refresh: 'refresh',
} as const;

/** Loại token hợp lệ. */
export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/** Nội dung được ký trong access/refresh token. */
export interface JwtPayload {
  /** Tên đăng nhập (đã chuẩn hóa chữ thường) */
  sub: string;
  /** Quyền của tài khoản */
  role: Role;
  /** Token này là access hay refresh */
  type: TokenType;
}
