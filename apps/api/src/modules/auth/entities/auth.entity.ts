import { ADMIN_ROLE } from '@/common';

/** Thông tin tài khoản trả về cho client — không bao giờ chứa mật khẩu. */
export interface AuthUserEntity {
  /** Tên đăng nhập đã chuẩn hóa chữ thường */
  username: string;
  /** Quyền của tài khoản */
  role: typeof ADMIN_ROLE;
}

/** Cặp token phát ra sau khi đăng nhập hoặc refresh thành công. */
export interface AuthTokensEntity {
  /** Token dùng cho các request cần xác thực (hạn 1 ngày) */
  accessToken: string;
  /** Token dùng để xin cặp token mới (hạn 1 tuần) */
  refreshToken: string;
  /** Tài khoản ứng với cặp token này */
  user: AuthUserEntity;
}
