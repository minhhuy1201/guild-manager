import type { AttendanceService } from '../../attendance/attendance.public';
import type { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import type { CharactersService } from '../../characters/characters.public';
import type { ActorResolver } from '../actor-resolver';
import type {
  BUTTON_STYLE,
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

/**
 * A button that sends an interaction back. `custom_id` is snake_case because Discord's payload is
 * read and written verbatim.
 */
export interface CustomIdButton {
  type: (typeof COMPONENT_TYPE)['button'];
  /** A value from `BUTTON_STYLE`, never `link` */
  style: number;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

/**
 * A button that opens a URL. Discord handles the click itself and sends nothing back, which is why
 * this variant has no `custom_id` to route on.
 */
export interface LinkButton {
  type: (typeof COMPONENT_TYPE)['button'];
  style: (typeof BUTTON_STYLE)['link'];
  label: string;
  url: string;
}

/** One button of either kind. */
export type ButtonComponent = CustomIdButton | LinkButton;

/** A horizontal strip of components. Discord allows at most 5 of these per message. */
export interface ActionRow {
  type: (typeof COMPONENT_TYPE)['actionRow'];
  components: ButtonComponent[];
}

/**
 * The framed, coloured block a message may carry alongside its text.
 *
 * There is deliberately no `fields`: a field is the one part of an embed Discord lays out in
 * columns, and it renders no markdown heading, so the whole body lives in `description` where `###`
 * both stacks the entries vertically and makes them legible.
 */
export interface EmbedPayload {
  title: string;
  description: string;
  /** Left border colour, a 24-bit integer — see `EMBED_COLOR` */
  color: number;
  footer: { text: string };
}

/** The body of a message the bot sends or rewrites. */
export interface MessagePayload {
  content: string;
  /** Discord allows up to 10; the bot never sends more than one. */
  embeds?: EmbedPayload[];
  components?: ActionRow[];
  /** A bit field from `MESSAGE_FLAG` */
  flags?: number;
  /**
   * What this message is allowed to ping, snake_case because it is Discord's payload. Present to
   * *close* the default, not to open it: an embed built from admin-entered text could otherwise
   * carry an `@everyone` nobody intended. Each list is declared only by the message that pings that
   * kind — the announcement names roles, the reminder names users.
   */
  allowed_mentions?: { roles?: string[]; users?: string[] };
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
 * Configuration a command may read, resolved from env once by `InteractionRouter`.
 *
 * A flat value object rather than `ConfigService`: a command needs exactly these two strings, and a
 * test builds them as a literal instead of stubbing a Nest provider.
 */
export interface CommandLinks {
  /** Origin of the web app, linked from the announcement */
  webOrigin: string;
  /** Discord ID of the guild role `/thong-bao` mentions */
  guildRoleId: string;
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
  links: CommandLinks;
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
