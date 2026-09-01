import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Proves the whole path end to end: Discord → signature check → router → reply. It answers from
 * memory, so a failure can only be the plumbing, never the data.
 */
export const pingCommand: SlashCommand = {
  definition: {
    name: 'ping',
    description: 'Kiểm tra bot còn sống',
  },

  execute: (): CommandReply => ({
    type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
    data: { content: 'Pong! Bot đang chạy.' },
  }),
};
