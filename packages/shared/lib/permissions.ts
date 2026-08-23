import { GuildRole } from "../enums/role.enum";

/**
 * Vai này có được xem điểm danh của cả bang không.
 * Bang chúng chỉ thấy nhân vật của chính mình; cán bộ và quản trị thấy toàn bộ.
 * @param role - Vai của người đang đăng nhập
 * @returns true khi được xem toàn bang
 */
export function canViewAllAttendance(role: GuildRole): boolean {
  return role !== GuildRole.MEMBER;
}

/**
 * Vai này có được quản trị bang không (thành viên, lịch đánh, đội hình, điểm danh hộ).
 * @param role - Vai của người đang đăng nhập
 * @returns true khi là quản trị viên
 */
export function canManageGuild(role: GuildRole): boolean {
  return role === GuildRole.ADMIN;
}
