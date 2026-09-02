import { canManageGuild } from '@guild/shared/lib';

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
 * The channel is read here only so the refusal can name the fix; `run` reads it again and is the one
 * that decides.
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

    const channelId = await deps.channels.get();

    if (!channelId) return ephemeralText(NO_CHANNEL);

    const result = await deps.reminders.run();

    if (!result.sent) return ephemeralText(NOTHING_TO_SAY);

    return ephemeralText(
      `Đã nhắc ${result.missingCount} người cho ${result.sessionCount} ngày đánh.`,
    );
  },
};
