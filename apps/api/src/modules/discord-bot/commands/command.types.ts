import type { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import type { ApplicationCommandInteraction } from '../interaction.schema';

/** What gets sent to Discord so the command appears in the chat box. */
export interface SlashCommandDefinition {
  /** Name typed after the slash, lowercase, no spaces */
  name: string;
  /** One line Discord shows next to the name while typing */
  description: string;
}

/** A reply visible in the channel the command was used in. */
export interface CommandReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['channelMessageWithSource'];
  data: { content: string };
}

/**
 * One command, whole. Keeping the Discord-facing definition next to the handler is what makes
 * adding a command a one-file change.
 */
export interface SlashCommand {
  definition: SlashCommandDefinition;
  /**
   * Answer one invocation.
   * @param interaction - The validated command invocation
   * @returns The reply Discord shows in the channel
   */
  execute(interaction: ApplicationCommandInteraction): CommandReply;
}
