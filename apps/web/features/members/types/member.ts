import type { GuildClass } from "@shared/enums";

/** Một thành viên trong bang, kèm mật khẩu điểm danh. */
export interface Member {
  id: string;
  name: string;
  guildClass: GuildClass;
  /** Mật khẩu điểm danh dạng plaintext — chỉ quản trị viên đọc được. */
  password: string;
}
