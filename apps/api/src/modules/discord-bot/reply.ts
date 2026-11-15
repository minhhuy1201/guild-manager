import type {
  CommandReply,
  DeferredReply,
  MessagePayload,
} from './commands/command.types';
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

/**
 * Wrap a message body as a reply the whole channel sees.
 *
 * Used by `/diem-danh-ho`: the person being marked has to know it happened, and Discord shows an
 * ephemeral message to exactly one viewer — so reaching them at all means the message is public.
 * The buttons are safe in the open because `AttendanceService.mark` re-checks every press: a
 * bystander marking somebody else is refused, while the person it is about may fix their own answer.
 *
 * @param payload - The message body
 * @returns The reply Discord posts in the channel
 */
export function publicMessage(payload: MessagePayload): CommandReply {
  return {
    type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
    data: payload,
  };
}

/**
 * Acknowledge now and answer privately once `followUp` resolves.
 *
 * For a command whose work can outlast Discord's 3-second window. The flag is set on the
 * acknowledgement because Discord decides privacy there: the edited message inherits it.
 *
 * @param followUp - The slow work, resolving to the message that replaces the "thinking" state
 * @returns The deferred reply
 */
export function deferredEphemeral(
  followUp: () => Promise<MessagePayload>,
): DeferredReply {
  return {
    type: INTERACTION_RESPONSE_TYPE.deferredChannelMessageWithSource,
    data: { flags: MESSAGE_FLAG.ephemeral },
    followUp,
  };
}
