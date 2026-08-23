/**
 * Hạn sử dụng của token đăng nhập.
 * Để ở constant thay vì biến môi trường vì chưa có nhu cầu đổi theo từng môi trường.
 */

/** Hạn của access token — dùng cho mọi request cần xác thực. */
export const ACCESS_TOKEN_TTL = '1d';

/** Hạn của refresh token — quyết định người dùng phải đăng nhập lại sau bao lâu. */
export const REFRESH_TOKEN_TTL = '7d';

/** Hạn của token `state` trong OAuth flow — chỉ cần đủ cho một vòng bấm "Cho phép". */
export const OAUTH_STATE_TTL = '5m';

/** Hạn của mã đổi lấy JWT (mili giây) — đủ cho một lần redirect, không hơn. */
export const EXCHANGE_TTL_MS = 60_000;

/** Mã lỗi gửi về web qua query string; web tra ra câu tiếng Việt. */
export const AUTH_ERROR = {
  /** Người dùng bấm Huỷ ở màn cho phép của Discord */
  denied: 'tu-choi',
  /** Discord ID không khớp thành viên nào và không nằm trong danh sách cứu hộ */
  notMember: 'khong-thuoc-bang',
  /** State hỏng, hết hạn hoặc sai loại */
  expired: 'phien-het-han',
  /** Không gọi được Discord */
  upstream: 'discord-loi',
} as const;
