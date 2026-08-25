import { GuildRole } from "../enums/role.enum";

/**
 * Whether this role may view the whole guild's attendance. Members see only their
 * own character; leaders and admins see everyone.
 * @param role - Role of the signed-in user
 * @returns true when guild-wide viewing is allowed
 */
export function canViewAllAttendance(role: GuildRole): boolean {
  return role !== GuildRole.MEMBER;
}

/**
 * Whether this role may administer the guild (members, schedule, formations,
 * attendance on behalf of others).
 * @param role - Role of the signed-in user
 * @returns true for admins
 */
export function canManageGuild(role: GuildRole): boolean {
  return role === GuildRole.ADMIN;
}
