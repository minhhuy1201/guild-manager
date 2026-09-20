import { buildAttendanceBoard, withPressNote } from '../attendance-board';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { commandOptionValue } from '../interaction.schema';
import { ephemeralText, publicMessage } from '../reply';
import { requireAdmin } from '../require-admin';
import type { CommandReply, SlashCommand } from './command.types';

/** Name of the option, used both when registering and when reading the invocation. */
const TARGET_OPTION = 'nguoi';

/**
 * Shown to a member who tried to mark on someone else's behalf.
 * Refusals stay ephemeral even though the board is public: only the caller needs them, and a channel
 * does not need to watch someone be told no.
 */
const ADMIN_ONLY = 'Chỉ admin mới điểm danh hộ được.';

/**
 * Attendance on behalf of somebody else — admins only.
 *
 * The role is checked here rather than left to `AttendanceService`, which only refuses at write
 * time: the board appears before anyone presses anything, and showing a board whose every button
 * is guaranteed to be rejected is worse than saying so. The write rule itself is untouched and runs
 * again on every press.
 */
export const diemDanhHoCommand: SlashCommand = {
  definition: {
    name: 'diem-danh-ho',
    description: 'Điểm danh hộ một thành viên khác (chỉ admin)',
    options: [
      {
        name: TARGET_OPTION,
        description: 'Người cần điểm danh hộ',
        type: COMMAND_OPTION_TYPE.user,
        required: true,
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const check = await requireAdmin(interaction, deps, ADMIN_ONLY);

    if (!check.ok) return check.reply;

    const targetDiscordId = commandOptionValue(interaction, TARGET_OPTION);

    if (!targetDiscordId) {
      // Discord enforces `required: true`, so an empty value means the registered definition and
      // this build disagree — say which option, the fix is `pnpm --filter api discord:register`.
      throw new Error(`Thiếu option ${TARGET_OPTION} của /diem-danh-ho.`);
    }

    const row = await deps.characters.findByDiscordId(targetDiscordId);

    if (!row) {
      return ephemeralText(`<@${targetDiscordId}> chưa được gán nhân vật nào.`);
    }

    const board = await buildAttendanceBoard(
      {
        characterId: row.id,
        characterName: row.name,
        discordId: row.discordId,
      },
      check.caller.actor,
      deps,
    );

    // Public, unlike every other reply the bot sends: an ephemeral message reaches one viewer, and
    // the whole point here is that the person being marked — mentioned in the heading, so they are
    // notified — sees it too. The channel can press the buttons as well, so the board says who they
    // are for; anyone else is refused privately by `handleAttendanceButton`.
    return publicMessage(withPressNote(board, row.discordId));
  },
};
