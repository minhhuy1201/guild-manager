import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TOKEN_TYPE, type JwtPayload } from '../../common';
import type { Env } from '../../config';
import { isRescueAdmin, resolveGuildRole } from '../auth/auth.public';
import { CharactersService } from '../characters/characters.public';

/** An identity the bot may act as, plus the character it belongs to. */
export interface ResolvedActor {
  /**
   * The shape `AttendanceService` already takes. Nothing is signed and nothing leaves the process:
   * it is a value object here, not a token.
   */
  actor: JwtPayload;
  /** The caller's own character, null for a rescue admin who was never assigned one. */
  characterId: string | null;
}

/**
 * Turns the Discord ID inside a signed interaction into the identity the domain services expect.
 *
 * The role rules are the login's, imported from `auth`, so a member cannot end up with one set of
 * permissions on the website and another in Discord.
 */
@Injectable()
export class ActorResolver {
  constructor(
    private readonly characters: CharactersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Resolve who is acting.
   * @param discordId - Discord ID read out of the signed interaction
   * @returns The actor and their character, or null when this Discord ID has no access at all
   */
  async resolve(discordId: string): Promise<ResolvedActor | null> {
    const member = await this.characters.findByDiscordId(discordId);
    const isRescue = isRescueAdmin(
      discordId,
      this.config.get('DISCORD_ADMIN_IDS', { infer: true }),
    );

    if (!member && !isRescue) return null;

    return {
      actor: {
        sub: discordId,
        role: resolveGuildRole({ isRescue, memberRole: member?.role ?? null }),
        type: TOKEN_TYPE.access,
      },
      characterId: member?.id ?? null,
    };
  }
}
