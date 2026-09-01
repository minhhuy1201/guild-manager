import { assertNever } from '../../common';
import { commands } from './commands';
import type { CommandReply } from './commands/command.types';
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
export type InteractionReply = PongReply | CommandReply;

/** Built once: the registry never changes after the module is loaded. */
const commandsByName = new Map(
  commands.map((command) => [command.definition.name, command]),
);

/**
 * Turn a validated interaction into the reply Discord expects.
 *
 * This function owns both levels of the switch — by `type`, then by command name — so the whole of
 * the bot's Discord-facing behaviour is testable without an HTTP layer.
 *
 * @param interaction - The interaction, already validated by `interactionSchema`
 * @returns The reply to send back in the HTTP response body
 * @throws Error when the command name is not in the registry — Discord was told about a command
 *   this build does not have, which is a deploy/registration mismatch, not a user error
 */
export function routeInteraction(interaction: Interaction): InteractionReply {
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

      return command.execute(interaction);
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
