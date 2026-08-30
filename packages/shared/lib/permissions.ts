import { GuildRole } from "../enums/role.enum";

/**
 * Whether this role may administer the guild. The single privilege boundary in the app: it gates
 * viewing the whole guild's attendance, editing members, schedule and formations, marking attendance
 * on behalf of others, and bypassing the deadline. Members get none of it.
 * @param role - Role of the signed-in user
 * @returns true for admins
 */
export function canManageGuild(role: GuildRole): boolean {
  return role === GuildRole.ADMIN;
}
