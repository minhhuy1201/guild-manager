import type { GuildClass } from '@guild/shared/enums';

/**
 * Một thành viên trả về cho màn quản lý của quản trị viên.
 * Khác `CharacterEntity` của module attendance (bản rút gọn, không có mật khẩu):
 * entity này **có** mật khẩu, nên mọi endpoint trả nó ra đều phải khoá bằng JwtAuthGuard.
 */
export interface MemberEntity {
  /** Khoá chính do hệ thống sinh. */
  id: string;
  name: string;
  guildClass: GuildClass;
  /** Mật khẩu điểm danh dạng plaintext. */
  password: string;
}
