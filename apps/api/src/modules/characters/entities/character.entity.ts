import type { GuildClass } from '@guild/shared/enums';

/** Một thành viên trả về cho màn quản lý của quản trị viên. */
export interface MemberEntity {
  /** Khoá chính do hệ thống sinh. */
  id: string;
  name: string;
  guildClass: GuildClass;
}
