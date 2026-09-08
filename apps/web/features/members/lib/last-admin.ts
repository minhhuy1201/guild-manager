import { GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

/**
 * Whether this member is the only admin the guild has left.
 *
 * Courtesy only: the rule lives in `CharactersService`, because the UI is not a trust boundary and a
 * request sent straight to the API never passes through here. This exists so an admin sees the wall
 * before walking into it, not so the wall exists.
 *
 * @param members - Every member currently loaded; an empty list answers false, since an unloaded
 *   list is not evidence of anything
 * @param member - The member about to be demoted or deleted
 * @returns true when demoting or deleting this member would leave the guild with no admin
 */
export function isLastAdmin(
  members: GuildMember[],
  member: GuildMember,
): boolean {
  const admins = members.filter((other) => other.role === GuildRole.ADMIN);

  return admins.length === 1 && admins[0].id === member.id;
}
