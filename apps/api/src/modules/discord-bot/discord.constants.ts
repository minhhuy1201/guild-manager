/**
 * Interaction types Discord sends. Only the two the bot answers are listed; an unlisted value is
 * rejected by `interactionSchema` rather than passed on.
 *
 * https://discord.com/developers/docs/interactions/receiving-and-responding
 */
export const INTERACTION_TYPE = {
  /** Discord's own health check, sent when the endpoint URL is saved and periodically after */
  ping: 1,
  /** Someone ran a slash command */
  applicationCommand: 2,
} as const;

/** Response types the bot may answer with. */
export const INTERACTION_RESPONSE_TYPE = {
  /** The only valid answer to a PING */
  pong: 1,
  /** A message visible in the channel the command was used in */
  channelMessageWithSource: 4,
} as const;

/** Header carrying the Ed25519 signature — lowercase, the form Express normalises headers to. */
export const DISCORD_SIGNATURE_HEADER = 'x-signature-ed25519';

/** Header carrying the timestamp that is signed together with the body. */
export const DISCORD_TIMESTAMP_HEADER = 'x-signature-timestamp';
