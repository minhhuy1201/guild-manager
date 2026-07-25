/**
 * Hạn sử dụng của token đăng nhập.
 * Để ở constant thay vì biến môi trường vì chưa có nhu cầu đổi theo từng môi trường.
 */

/** Hạn của access token — dùng cho mọi request cần xác thực. */
export const ACCESS_TOKEN_TTL = '1d';

/** Hạn của refresh token — quyết định người dùng phải đăng nhập lại sau bao lâu. */
export const REFRESH_TOKEN_TTL = '7d';
