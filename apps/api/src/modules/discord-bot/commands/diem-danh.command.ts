import { buildAttendanceBoard } from '../attendance-board';
import { ephemeral, ephemeralText } from '../reply';
import { callerDiscordId } from '../interaction.schema';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown when nobody assigned this Discord ID to a character yet. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/** Shown to a rescue admin who has no character of their own to mark. */
const NO_OWN_CHARACTER =
  'Tài khoản admin này không gắn với nhân vật nào — dùng /diem-danh-ho.';

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

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!resolved.characterId) return ephemeralText(NO_OWN_CHARACTER);

    const row = await deps.characters.findById(resolved.characterId);

    if (!row) return ephemeralText(NOT_LINKED);

    const board = await buildAttendanceBoard(
      { characterId: row.id, characterName: row.name },
      resolved.actor,
      deps,
    );

    return ephemeral(board);
  },
};
