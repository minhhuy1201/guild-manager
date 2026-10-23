import { GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

/** What the viewer may do to one member row. */
export interface MemberAccess {
  /** Whether the row opens the edit form */
  canEdit: boolean;
  /** Whether the row offers deletion */
  canDelete: boolean;
}

/**
 * What a viewer may do to a member's row.
 *
 * Courtesy only, like `isLastAdmin`: the rules live in `CharactersService` and the controller, so
 * a request sent straight to the API never passes through here. This keeps buttons that would only
 * answer 403 out of sight.
 * @param viewerRole - Role of the signed-in viewer, undefined while the session loads
 * @param member - The member of the row
 * @returns An Admin does anything; a Manager edits Member rows only and deletes nobody; anyone else,
 * or an unknown viewer, only reads
 */
export function memberAccess(
  viewerRole: GuildRole | undefined,
  member: GuildMember
): MemberAccess {
  switch (viewerRole) {
    case GuildRole.ADMIN:
      return { canEdit: true, canDelete: true };
    case GuildRole.MANAGER:
      return { canEdit: member.role === GuildRole.MEMBER, canDelete: false };
    default:
      return { canEdit: false, canDelete: false };
  }
}
