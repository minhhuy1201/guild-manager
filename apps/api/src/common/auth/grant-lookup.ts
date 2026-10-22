import type { Capability, GrantableCommand } from '@guild/shared/enums';

/** The Grants one person holds. */
export interface Grants {
  capabilities: Capability[];
  grantedCommands: GrantableCommand[];
}

/**
 * Where `JwtAuthGuard` reads a Manager's Grants from.
 *
 * An abstract class so it doubles as the injection token: `common/` may not import the module that
 * owns the Character table, so that module provides the implementation instead.
 */
export abstract class GrantLookup {
  /**
   * Read the Grants of the member linked to a Discord ID.
   * @param discordId - Discord ID of the caller
   * @returns Their Grants, both empty when no member has this ID
   */
  abstract forDiscordId(discordId: string): Promise<Grants>;
}
