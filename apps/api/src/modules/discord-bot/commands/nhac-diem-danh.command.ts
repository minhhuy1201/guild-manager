import { canManageGuild } from '@guild/shared/lib';

import { assertNever } from '../../../common';
import { NOT_LINKED } from '../attendance-board';
import { isDiscordForbidden } from '../discord-rest';
import { callerDiscordId } from '../interaction.schema';
import { ephemeralText } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown to a member who tried to run the reminder. */
const ADMIN_ONLY = 'Chỉ admin mới chạy được lệnh nhắc.';

/** Shown when no channel has been configured yet — the fix is one command away. */
const NO_CHANNEL =
  'Chưa có channel nào để nhắc. Gõ /cau-hinh-kenh trong channel muốn dùng.';

/**
 * Shown when Discord refuses the reminder post for lack of permission.
 *
 * The same refusal `/cau-hinh-kenh` already translates, worded for this command: the channel was
 * configured once and something changed since, so the fix is to check it or configure it again.
 */
const CANNOT_POST =
  'Bot không gửi được tin vào channel nhắc điểm danh. Kiểm tra bot còn thấy channel đó và có ' +
  'quyền Send Messages không, hoặc chạy lại /cau-hinh-kenh trong channel muốn dùng.';

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

    // `run` posts to Discord and lets a refusal through; its JSDoc leaves how loud that is to the
    // caller. Loud here means one sentence naming the action, not the router's generic apology.
    let outcome;
    try {
      outcome = await deps.reminders.run();
    } catch (error) {
      if (isDiscordForbidden(error)) return ephemeralText(CANNOT_POST);

      throw error;
    }

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
