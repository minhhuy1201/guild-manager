/**
 * Hằng số và kiểu của JWT dùng chung giữa guard (`common/`) và module auth (`modules/auth`).
 * Đặt ở `common/` vì guard không được phép import từ `modules/`.
 */
import type { GuildRole } from '@guild/shared/enums';

/**
 * Vai trò trong bang.
 * Định nghĩa thật nằm ở `@guild/shared/enums` vì giá trị này đi qua mạng
 * (`/auth/me`, payload JWT); re-export ở đây để guard không phải biết đường dẫn package.
 */
export { GuildRole } from '@guild/shared/enums';

/**
 * Loại token, ghi trong payload để một loại không dùng thay loại khác được.
 * `oauthState` là token ngắn hạn đi kèm tham số `state` của OAuth — nó không phải phiên đăng nhập.
 */
export const TOKEN_TYPE = {
  access: 'access',
  refresh: 'refresh',
  oauthState: 'oauth_state',
} as const;

/** Loại token hợp lệ. */
export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/** Nội dung được ký trong access/refresh token. */
export interface JwtPayload {
  /** Discord ID của người đăng nhập — khoá tra ngược ra Character */
  sub: string;
  /** Vai trong bang tại thời điểm phát token */
  role: GuildRole;
  /** Token này là access hay refresh */
  type: TokenType;
}
