import { Injectable } from '@nestjs/common';

import { TOKEN_TYPE, type RequestActor } from '../../common';
import { ActorLookupService } from '../auth/auth.public';
import type { GuildMemberRow } from '../characters/characters.public';

/** An identity the bot may act as, plus the character it belongs to. */
export interface ResolvedActor {
  /**
   * The shape `AttendanceService` already takes. Nothing is signed and nothing leaves the process:
   * it is a value object here, not a token.
   */
  actor: RequestActor;
  /**
   * The caller's own character row, null for a rescue admin who was never assigned one.
   * The whole row rather than the id: `findByDiscordId` has already read it, and every caller went
   * on to read the same row again by id.
   */
  character: GuildMemberRow | null;
}

/**
 * Turns the Discord ID inside a signed interaction into the identity the domain services expect.
 *
 * The role rules are the login's, imported from `auth`, so a member cannot end up with one set of
 * permissions on the website and another in Discord.
 */
@Injectable()
export class ActorResolver {
  constructor(private readonly identities: ActorLookupService) {}

  /**
   * Resolve who is acting.
   * @param discordId - Discord ID read out of the signed interaction
   * @returns The actor and their character, or null when this Discord ID has no access at all
   */
  async resolve(discordId: string): Promise<ResolvedActor | null> {
    const identity = await this.identities.resolve(discordId);
    if (!identity) return null;

    return {
      actor: {
        sub: discordId,
        role: identity.role,
        type: TOKEN_TYPE.access,
        // The Grants come from the row already read, so Discord sees a Grant change on the next
        // interaction like the API does on the next request.
        ...identity.grants,
      },
      character: identity.member,
    };
  }
}
