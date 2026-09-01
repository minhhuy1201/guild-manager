import type { CommandReply, MessagePayload } from './commands/command.types';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from './discord.constants';

/**
 * How a reply is shaped, kept out of both the router and the commands.
 *
 * It lives in its own file because the commands need it and the router imports the commands: with
 * these helpers on the router, the registry and the router would import each other and neither
 * would finish loading.
 */

/**
 * Wrap a message body as a new, private reply.
 *
 * Every reply the bot sends is ephemeral: attendance is answered by one person, and a channel full
 * of bot messages helps nobody.
 *
 * @param payload - The message body
 * @returns The reply Discord shows only to the caller
 */
export function ephemeral(payload: MessagePayload): CommandReply {
  return {
    type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
    data: { ...payload, flags: MESSAGE_FLAG.ephemeral },
  };
}

/**
 * A private reply that is only a sentence.
 * @param content - The sentence, already in Vietnamese and safe to show verbatim
 * @returns The reply
 */
export function ephemeralText(content: string): CommandReply {
  return ephemeral({ content });
}
