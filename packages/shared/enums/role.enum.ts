/**
 * Vai trò trong bang. Đi qua mạng (nằm trong payload JWT và response `/auth/me`)
 * nên định nghĩa phải ở package dùng chung, và phải trùng giá trị enum GuildRole của Prisma.
 */
export enum GuildRole {
  /** Toàn quyền: quản lý thành viên, lịch đánh, đội hình, điểm danh hộ */
  ADMIN = "ADMIN",
  /** Cán bộ: xem điểm danh cả bang để nhắc nhở, chỉ tự điểm danh cho mình */
  LEADER = "LEADER",
  /** Bang chúng: chỉ thấy và điểm danh cho nhân vật của mình */
  MEMBER = "MEMBER",
}

/** Nhãn hiển thị tiếng Việt cho từng vai. */
export const GUILD_ROLE_LABEL: Record<GuildRole, string> = {
  [GuildRole.ADMIN]: "Quản trị",
  [GuildRole.LEADER]: "Cán bộ",
  [GuildRole.MEMBER]: "Bang chúng",
};

/** Danh sách vai theo thứ tự hiển thị trong dropdown. */
export const GUILD_ROLE_OPTIONS: GuildRole[] = [
  GuildRole.MEMBER,
  GuildRole.LEADER,
  GuildRole.ADMIN,
];
