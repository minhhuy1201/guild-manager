import type {
  Capability,
  GrantableCommand,
  GuildRole,
} from '@guild/shared/enums';

/** The Grants one person holds. */
export interface Grants {
  capabilities: Capability[];
  grantedCommands: GrantableCommand[];
}

/** Who a Discord ID is right now: the role and Grants stored today, not the ones a token was issued with. */
export interface CurrentActor extends Grants {
  role: GuildRole;
}

/**
 * Where `JwtAuthGuard` reads the live role and Grants of every token from.
 *
 * An abstract class so it doubles as the injection token: `common/` may not import the modules that
 * own the Character table and the rescue list, so the auth module provides the implementation.
 */
export abstract class ActorLookup {
  /**
   * Read who a Discord ID is now.
   * @param discordId - Discord ID of the caller
   * @returns Their current role and Grants. Someone with no member row who is not a rescue ID counts
   * as a Member with no Grants: the token's elevated role is not honoured for a person who has left.
   */
  abstract current(discordId: string): Promise<CurrentActor>;
}
