import { GuildRole } from '@guild/shared/enums';

/**
 * Whether this Discord ID is on the rescue list.
 *
 * A pure function rather than a method on AuthService: the Discord bot resolves the same identity
 * without going through a login, and a copy of this rule in two places is a copy that drifts.
 *
 * @param discordId - Discord ID to test
 * @param adminIdsRaw - Raw DISCORD_ADMIN_IDS value: comma-separated, possibly empty
 * @returns true when the ID is listed
 */
export function isRescueAdmin(discordId: string, adminIdsRaw: string): boolean {
  return adminIdsRaw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
    .includes(discordId);
}

/**
 * The guild role an identity acts with.
 * @param input.isRescue - Whether the Discord ID is on the rescue list
 * @param input.memberRole - Role stored on the matching Character, null when there is none
 * @returns The effective role
 */
export function resolveGuildRole(input: {
  isRescue: boolean;
  memberRole: GuildRole | null;
}): GuildRole {
  // The rescue list beats the database value: an admin must not lock themselves out.
  if (input.isRescue) return GuildRole.ADMIN;

  return input.memberRole ?? GuildRole.MEMBER;
}
