import type { AttendanceService } from '../../attendance/attendance.public';
import type { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import type { CharactersService } from '../../characters/characters.public';
import type { ActorResolver } from '../actor-resolver';
import type {
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
} from '../discord.constants';
import type { ApplicationCommandInteraction } from '../interaction.schema';

/** What gets sent to Discord so the command appears in the chat box. */
export interface SlashCommandDefinition {
  /** Name typed after the slash, lowercase, no spaces */
  name: string;
  /** One line Discord shows next to the name while typing */
  description: string;
  /** Arguments Discord collects before sending the command. Omitted when there are none. */
  options?: SlashCommandOption[];
}

/** One argument of a slash command, in the shape Discord's registration route expects. */
export interface SlashCommandOption {
  name: string;
  description: string;
  /** A value from `COMMAND_OPTION_TYPE` */
  type: number;
  required: boolean;
}

/** One button. `custom_id` is snake_case because Discord's payload is read and written verbatim. */
export interface ButtonComponent {
  type: (typeof COMPONENT_TYPE)['button'];
  /** A value from `BUTTON_STYLE` */
  style: number;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

/** A horizontal strip of components. Discord allows at most 5 of these per message. */
export interface ActionRow {
  type: (typeof COMPONENT_TYPE)['actionRow'];
  components: ButtonComponent[];
}

/** The body of a message the bot sends or rewrites. */
export interface MessagePayload {
  content: string;
  components?: ActionRow[];
  /** A bit field from `MESSAGE_FLAG` */
  flags?: number;
}

/** A reply that sends a new message. */
export interface CommandReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['channelMessageWithSource'];
  data: MessagePayload;
}

/** A reply that rewrites the message the button sits on. */
export interface UpdateMessageReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['updateMessage'];
  data: MessagePayload;
}

/**
 * What a command is allowed to reach.
 *
 * Passed as an argument rather than injected: `src/scripts/register-discord-commands.ts` imports
 * `commandDefinitions` without booting Nest, so a command must stay a plain object. It also keeps a
 * command testable with a hand-written stub instead of a Nest testing module.
 */
export interface CommandDeps {
  attendance: AttendanceService;
  battleSessions: BattleSessionsService;
  characters: CharactersService;
  actors: ActorResolver;
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
   * @param deps - The services this command may use
   * @returns The reply Discord shows
   */
  execute(
    interaction: ApplicationCommandInteraction,
    deps: CommandDeps,
  ): Promise<CommandReply>;
}
