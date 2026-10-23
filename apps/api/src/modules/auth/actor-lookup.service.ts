import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GuildRole } from '@guild/shared/enums';

import type { ActorLookup, CurrentActor, Grants } from '../../common';
import type { Env } from '../../config';
import {
  CharactersService,
  grantsOf,
  memberRole,
  type GuildMemberRow,
} from '../characters/characters.public';
import { isRescueAdmin, resolveGuildRole } from './actor-identity';

/** Who a Discord ID is, as the member table and the rescue list say today. */
export interface ResolvedIdentity {
  /** The member row, null for a rescue ID that was never assigned a character */
  member: GuildMemberRow | null;
  /** The role this identity acts with */
  role: GuildRole;
  /** The Grants it holds: a Manager's lists, empty for every other role */
  grants: Grants;
}

/**
 * The one place that turns a Discord ID into an identity: the member row, the rescue list, the role
 * rule and the Grants. The login, the Discord bot and the per-request guard all ask here, so they
 * cannot disagree about who someone is.
 */
@Injectable()
export class ActorLookupService implements ActorLookup {
  constructor(
    private readonly characters: CharactersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Resolve a Discord ID.
   * @param discordId - Discord ID to resolve
   * @returns The identity, or null when the ID has no member row and is not a rescue ID
   */
  async resolve(discordId: string): Promise<ResolvedIdentity | null> {
    const member = await this.characters.findByDiscordId(discordId);
    const isRescue = isRescueAdmin(
      discordId,
      this.config.get('DISCORD_ADMIN_IDS', { infer: true }),
    );

    if (!member && !isRescue) return null;

    const role = resolveGuildRole({ isRescue, memberRole: memberRole(member) });

    return { member, role, grants: grantsOf(member, role) };
  }

  /**
   * Who a Discord ID is right now, for the request guard.
   * @param discordId - Discord ID of the caller
   * @returns Their current role and Grants; an unknown ID counts as a Member with no Grants, so the
   * token's elevated role is not honoured for a person who has left
   */
  async current(discordId: string): Promise<CurrentActor> {
    const identity = await this.resolve(discordId);
    if (!identity) {
      return { role: GuildRole.MEMBER, capabilities: [], grantedCommands: [] };
    }

    return { role: identity.role, ...identity.grants };
  }
}
