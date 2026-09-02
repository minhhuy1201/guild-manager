import { canManageGuild } from '@guild/shared/lib';

import { NOT_LINKED } from '../attendance-board';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { callerDiscordId, commandOptionValue } from '../interaction.schema';
import { ephemeralText, publicMessage } from '../reply';
import type { CommandLinks, CommandReply, SlashCommand } from './command.types';

/** Option names, used both when registering and when reading the invocation. */
const MEMBER_OPTION = 'nguoi';
const SECT_OPTION = 'luu-phai';

/**
 * Shown to a member who tried to welcome somebody.
 * The refusal stays ephemeral even though the welcome itself is public: a channel does not need to
 * watch someone be told no.
 */
const ADMIN_ONLY = 'Chỉ admin mới chào thành viên mới được.';

/**
 * The welcome itself.
 *
 * "Chat bang ở đây nha" carries no channel mention on purpose: the message is posted in that very
 * channel, so "ở đây" already points at it.
 *
 * @param newMemberId - Discord ID of the member being welcomed
 * @param sectChannelId - Channel of the member's sect, picked when the command was typed
 * @param channelIds - The three channels configured once in the environment
 * @returns The message text, ready to post
 */
function buildWelcome(
  newMemberId: string,
  sectChannelId: string,
  channelIds: CommandLinks['channelIds'],
): string {
  return [
    `Chào mừng <@${newMemberId}> gia nhập bang!`,
    '- Chat bang ở đây nha',
    `- Các thông báo thì ở <#${channelIds.bangChien}> , <#${channelIds.nghichThuyHan}>`,
    `- Chat lưu phái <#${sectChannelId}>`,
    `- Bây giờ ông vào <#${channelIds.khamAcc}> để up gear nhé`,
  ].join('\n');
}

/**
 * Welcome a new member and point them at the channels they need — admins only.
 *
 * The role is checked here rather than left to a service, because the reply *is* the effect — by
 * the time anything downstream could refuse, the message would already be in the channel. Same
 * reason it is public rather than ephemeral: an ephemeral message reaches only whoever typed the
 * command, and the whole point is that the new member is mentioned, and so notified.
 */
export const chaoMungCommand: SlashCommand = {
  definition: {
    name: 'chao-mung',
    description:
      'Chào một thành viên mới và chỉ họ các channel cần biết (chỉ admin)',
    options: [
      {
        name: MEMBER_OPTION,
        description: 'Thành viên mới cần chào',
        type: COMMAND_OPTION_TYPE.user,
        required: true,
      },
      {
        name: SECT_OPTION,
        description: 'Channel chat lưu phái của thành viên đó',
        type: COMMAND_OPTION_TYPE.channel,
        required: true,
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const newMemberId = commandOptionValue(interaction, MEMBER_OPTION);
    const sectChannelId = commandOptionValue(interaction, SECT_OPTION);

    // Discord enforces `required: true`, so an empty value means the registered definition and this
    // build disagree — name the option, the fix is `pnpm --filter api discord:register`. Two guard
    // clauses rather than a loop: a loop narrows neither value, and each one would need a `!`.
    if (!newMemberId) {
      throw new Error(`Thiếu option ${MEMBER_OPTION} của /chao-mung.`);
    }

    if (!sectChannelId) {
      throw new Error(`Thiếu option ${SECT_OPTION} của /chao-mung.`);
    }

    return publicMessage({
      content: buildWelcome(newMemberId, sectChannelId, deps.links.channelIds),
      allowed_mentions: { users: [newMemberId] },
    });
  },
};
