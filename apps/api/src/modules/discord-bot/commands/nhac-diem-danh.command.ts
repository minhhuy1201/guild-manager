import { canManageGuild } from '@guild/shared/lib';

import { assertNever } from '../../../common';
import { NOT_LINKED } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeralText } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown to a member who tried to run the reminder. */
const ADMIN_ONLY = 'Chỉ admin mới chạy được lệnh nhắc.';

/** Shown when no channel has been configured yet — the fix is one command away. */
const NO_CHANNEL =
  'Chưa có channel nào để nhắc. Gõ /cau-hinh-kenh trong channel muốn dùng.';

/** Shown when nothing is due, or everyone whose deadline is due has already answered. */
const NOTHING_TO_SAY =
  'Không có ai cần nhắc: hoặc mai không có hạn nào, hoặc mọi người đã trả lời đủ.';

/**
 * Run the daily reminder right now — admins only.
 *
 * It calls the very same `ReminderService.run` the cron endpoint calls, so a hand-run reminder and
 * a scheduled one cannot disagree about who is missing. Its reason for existing is that the
 * scheduled path is otherwise unverifiable until the next morning.
 *
 * Every branch below comes from the outcome `run` reports, so this command asks the database
 * nothing of its own — the run is the single source of truth for what happened, wording included.
 */
export const nhacDiemDanhCommand: SlashCommand = {
  definition: {
    name: 'nhac-diem-danh',
    description: 'Nhắc ngay những ai chưa điểm danh (chỉ admin)',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const outcome = await deps.reminders.run();

    switch (outcome.status) {
      case 'no-channel':
        return ephemeralText(NO_CHANNEL);

      case 'nothing-due':
        return ephemeralText(NOTHING_TO_SAY);

      case 'sent':
        return ephemeralText(
          `Đã nhắc ${outcome.missingCount} người cho ${outcome.sessionCount} ngày đánh.`,
        );

      default:
        return assertNever(outcome, 'Kết quả nhắc điểm danh ngoài dự kiến');
    }
  },
};
