import { Injectable } from '@nestjs/common';

import { assertNever } from '../../common';
import { AttendanceService } from '../attendance/attendance.public';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { ActorResolver } from './actor-resolver';
import { commands } from './commands';
import type {
  CommandDeps,
  CommandReply,
  UpdateMessageReply,
} from './commands/command.types';
import {
  INTERACTION_RESPONSE_TYPE,
  INTERACTION_TYPE,
} from './discord.constants';
import type { Interaction } from './interaction.schema';

/** The only valid answer to Discord's health check. */
interface PongReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['pong'];
}

/** Everything the bot may answer an interaction with. */
export type InteractionReply = PongReply | CommandReply | UpdateMessageReply;

/** Built once: the registry never changes after the module is loaded. */
const commandsByName = new Map(
  commands.map((command) => [command.definition.name, command]),
);

/**
 * Turns a validated interaction into the reply Discord expects.
 *
 * A provider rather than a free function because commands now read the database; it owns both
 * levels of the switch — by `type`, then by command name — so the whole of the bot's Discord-facing
 * behaviour stays testable without an HTTP layer.
 */
@Injectable()
export class InteractionRouter {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly actors: ActorResolver,
  ) {}

  /**
   * Answer one interaction.
   * @param interaction - The interaction, already validated by `interactionSchema`
   * @returns The reply to send back in the HTTP response body
   * @throws Error when the command name is not in the registry — Discord was told about a command
   *   this build does not have, which is a deploy/registration mismatch, not a user error
   */
  async route(interaction: Interaction): Promise<InteractionReply> {
    switch (interaction.type) {
      case INTERACTION_TYPE.ping:
        return { type: INTERACTION_RESPONSE_TYPE.pong };

      case INTERACTION_TYPE.applicationCommand: {
        const command = commandsByName.get(interaction.data.name);

        if (!command) {
          throw new Error(
            `Lệnh Discord chưa có trong registry: ${interaction.data.name}`,
          );
        }

        return command.execute(interaction, this.deps);
      }

      case INTERACTION_TYPE.messageComponent:
        // The real handler arrives with the attendance board; until then this is a registration
        // mismatch, exactly like an unknown command name.
        throw new Error(
          `Component Discord chưa được xử lý: ${interaction.data.custom_id}`,
        );

      default:
        return assertNever(interaction, 'Interaction type ngoài dự kiến');
    }
  }

  /** The services a command may reach, bundled once. */
  private get deps(): CommandDeps {
    return {
      attendance: this.attendance,
      battleSessions: this.battleSessions,
      characters: this.characters,
      actors: this.actors,
    };
  }
}
