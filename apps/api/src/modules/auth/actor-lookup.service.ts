import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ActorLookup, CurrentActor } from '../../common';
import type { Env } from '../../config';
import {
  CharactersService,
  grantsOf,
  memberRole,
} from '../characters/characters.public';
import { isRescueAdmin, resolveGuildRole } from './actor-identity';

/**
 * Answers `ActorLookup` from the member table and the rescue list, with the same role rule the
 * login uses, so a request and a fresh login agree on who someone is.
 */
@Injectable()
export class ActorLookupService implements ActorLookup {
  constructor(
    private readonly characters: CharactersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Read who a Discord ID is now.
   * @param discordId - Discord ID of the caller
   * @returns Their current role and Grants
   */
  async current(discordId: string): Promise<CurrentActor> {
    const member = await this.characters.findByDiscordId(discordId);
    const role = resolveGuildRole({
      isRescue: isRescueAdmin(
        discordId,
        this.config.get('DISCORD_ADMIN_IDS', { infer: true }),
      ),
      memberRole: memberRole(member),
    });

    return { role, ...grantsOf(member, role) };
  }
}
