/**
 * Interaction types Discord sends. Only the ones the bot answers are listed; an unlisted value is
 * rejected by `interactionSchema` rather than passed on.
 *
 * https://discord.com/developers/docs/interactions/receiving-and-responding
 */
export const INTERACTION_TYPE = {
  /** Discord's own health check, sent when the endpoint URL is saved and periodically after */
  ping: 1,
  /** Someone ran a slash command */
  applicationCommand: 2,
  /** Someone pressed a button or used a select menu on one of the bot's messages */
  messageComponent: 3,
} as const;

/** Response types the bot may answer with. */
export const INTERACTION_RESPONSE_TYPE = {
  /** The only valid answer to a PING */
  pong: 1,
  /** A message visible in the channel the command was used in */
  channelMessageWithSource: 4,
  /**
   * Rewrite the message the component sits on, instead of sending a new one.
   * Pressing three buttons then leaves one message showing the latest state, not three.
   */
  updateMessage: 7,
} as const;

/** Message flags. A bit field, so values are OR-ed if more are ever needed. */
export const MESSAGE_FLAG = {
  /** Only the person who triggered the interaction can see the message */
  ephemeral: 64,
} as const;

/** Component types. A button may only live inside an action row. */
export const COMPONENT_TYPE = {
  actionRow: 1,
  button: 2,
} as const;

/**
 * Button styles. On the attendance board colour encodes *state*, not meaning: an answer that is not
 * currently chosen is always `secondary`, so exactly one button per row is ever lit. Colouring both
 * (green "Có", red "Không") left nothing to tell the two apart, and a lit red button read as
 * "you picked Không".
 */
export const BUTTON_STYLE = {
  /** Blurple — a call to action that is not an answer to anything */
  primary: 1,
  /** Grey — the answer that is not currently chosen */
  secondary: 2,
  /** Green — "Có", when it is the current answer */
  success: 3,
  /** Red — "Không", when it is the current answer */
  danger: 4,
  /** Opens a URL. Carries `url` instead of `custom_id`, and sends no interaction back */
  link: 5,
} as const;

/**
 * Left border of the announcement embed, as Discord's 24-bit integer. Blurple: the announcement is
 * the bot speaking for itself, not a status the attendance colours above describe.
 */
export const EMBED_COLOR = 0x5865f2;

/** Slash command option types. Only the ones the bot declares are listed. */
export const COMMAND_OPTION_TYPE = {
  /** A guild member picker — the value arrives as a Discord ID string */
  user: 6,
  /** A channel picker — the value arrives as a channel id string */
  channel: 7,
} as const;

/**
 * Discord accepts at most 5 action rows per message. The attendance board spends one row per
 * battle day, so this is the number of days it can offer buttons for.
 */
export const MAX_ACTION_ROWS = 5;

/** Discord rejects the whole message when a component's custom_id exceeds this. */
export const MAX_CUSTOM_ID_LENGTH = 100;

/** Header carrying the Ed25519 signature — lowercase, the form Express normalises headers to. */
export const DISCORD_SIGNATURE_HEADER = 'x-signature-ed25519';

/** Header carrying the timestamp that is signed together with the body. */
export const DISCORD_TIMESTAMP_HEADER = 'x-signature-timestamp';
