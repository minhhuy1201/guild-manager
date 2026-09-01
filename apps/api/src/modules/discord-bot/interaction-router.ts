import { HttpException, Injectable, Logger } from '@nestjs/common';

import { assertNever } from '../../common';
import { AttendanceService } from '../attendance/attendance.public';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { ActorResolver } from './actor-resolver';
import { handleAttendanceButton } from './attendance-board';
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
import { ephemeralText } from './reply';

/** The only valid answer to Discord's health check. */
interface PongReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['pong'];
}

/** Everything the bot may answer an interaction with. */
export type InteractionReply = PongReply | CommandReply | UpdateMessageReply;

/** Shown when something failed that the user can do nothing about. */
const UNEXPECTED = 'Có lỗi xảy ra. Thử lại sau hoặc điểm danh trên web.';

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

  private readonly logger = new Logger(InteractionRouter.name);

  /**
   * Answer one interaction, turning any failure into something Discord can show.
   *
   * Discord treats every non-200 as "the application did not respond", which would throw away the
   * Vietnamese sentence a domain exception already carries. So the reply, not the status code, is
   * where a refusal is expressed.
   *
   * @param interaction - The interaction, already validated by `interactionSchema`
   * @returns The reply to send back in the HTTP response body
   */
  async route(interaction: Interaction): Promise<InteractionReply> {
    try {
      return await this.dispatch(interaction);
    } catch (error) {
      // A domain refusal already reads as a sentence meant for the user (architecture.md §3.4).
      if (error instanceof HttpException) {
        return ephemeralText(error.message);
      }

      // Anything else is ours: keep the detail in the log, keep it out of a chat channel.
      this.logger.error('Interaction Discord thất bại', error as Error);

      return ephemeralText(UNEXPECTED);
    }
  }

  /**
   * Route one interaction to whatever answers it.
   * @param interaction - The validated interaction
   * @returns The reply
   * @throws Error when the command name is not in the registry — Discord was told about a command
   *   this build does not have, which is a deploy/registration mismatch, not a user error
   */
  private async dispatch(interaction: Interaction): Promise<InteractionReply> {
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
        return {
          type: INTERACTION_RESPONSE_TYPE.updateMessage,
          data: await handleAttendanceButton(interaction, this.deps),
        };

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
