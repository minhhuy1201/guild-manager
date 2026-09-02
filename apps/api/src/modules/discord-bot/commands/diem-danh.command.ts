import { buildOwnBoard } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeral } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Attendance for the caller's own character.
 *
 * Everything it needs is derived from the Discord ID inside the signed interaction: the command
 * takes no arguments, so there is nothing a caller could point at somebody else.
 */
export const diemDanhCommand: SlashCommand = {
  definition: {
    name: 'diem-danh',
    description: 'Điểm danh các ngày đánh trong tuần',
  },

  execute: async (interaction, deps): Promise<CommandReply> =>
    ephemeral(await buildOwnBoard(callerDiscordId(interaction), deps)),
};
