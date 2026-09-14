import { canManageGuild } from '@guild/shared/lib';

import { assertNever } from '../../../common';
import type { ReminderScope } from '../../battle-sessions/battle-sessions.public';
import { NOT_LINKED } from '../attendance-board';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { isDiscordForbidden } from '../discord-rest';
import {
  type ApplicationCommandInteraction,
  callerDiscordId,
  commandOptionValue,
} from '../interaction.schema';
import { ephemeralText } from '../reply';
import type { ReminderOutcome } from '../reminder.service';
import type { CommandReply, SlashCommand } from './command.types';

/** Name of the option, used both when registering and when reading the invocation. */
const SCOPE_OPTION = 'pham-vi';

/**
 * What an admin can pick for `pham-vi`. The value is the `ReminderScope` itself, so the choice list
 * is the only mapping there is.
 */
const SCOPE_CHOICES = [
  { name: 'Hôm nay - giống lượt nhắc 9h sáng', value: 'today' },
  { name: 'Cả tuần - mọi trận còn hạn điểm danh', value: 'week' },
] as const satisfies readonly { name: string; value: ReminderScope }[];

/** Left empty, the command runs the cron's own rule - what it did before the option existed. */
const DEFAULT_SCOPE: ReminderScope = 'today';

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

/**
 * Shown when nothing is due, or everyone whose deadline is due has already answered - per scope,
 * because "nothing today" is exactly the case where the admin may want the wider one instead.
 */
const NOTHING_TO_SAY: Record<ReminderScope, string> = {
  today:
    'Không có ai cần nhắc: hôm nay chưa có hạn nào tới lượt nhắc, hoặc mọi người đã trả lời đủ. ' +
    'Muốn nhắc sớm cho cả tuần thì chọn phạm vi "Cả tuần".',
  week: 'Không có ai cần nhắc: tuần này không còn trận nào còn hạn, hoặc mọi người đã trả lời đủ.',
};

/**
 * Scope the admin picked, or the default when they left the option empty.
 * @param interaction - The command invocation
 * @returns The scope to run
 * @throws Error when the value is none of the choices - the registered definition and this build
 *   disagree, and the fix is `pnpm --filter api discord:register`
 */
function scopeOf(interaction: ApplicationCommandInteraction): ReminderScope {
  const value = commandOptionValue(interaction, SCOPE_OPTION);

  if (value === null) return DEFAULT_SCOPE;

  const choice = SCOPE_CHOICES.find((candidate) => candidate.value === value);

  if (!choice) {
    throw new Error(
      `Option ${SCOPE_OPTION} của /nhac-diem-danh không hợp lệ: ${value}`,
    );
  }

  return choice.value;
}

/**
 * Run the attendance reminder right now - admins only.
 *
 * It calls the very same `ReminderService.run` the cron endpoint calls, so a hand-run reminder and
 * a scheduled one cannot disagree about who is missing. It exists for two reasons: the scheduled
 * path is otherwise unverifiable until the next morning (scope `today`), and an admin sometimes
 * wants to nudge earlier than the daily rule would (scope `week`).
 *
 * Every branch below comes from the outcome `run` reports, so this command asks the database
 * nothing of its own — the run is the single source of truth for what happened, wording included.
 */
export const nhacDiemDanhCommand: SlashCommand = {
  definition: {
    name: 'nhac-diem-danh',
    description: 'Nhắc ngay những ai chưa điểm danh (chỉ admin)',
    options: [
      {
        name: SCOPE_OPTION,
        description:
          'Nhắc cho hạn của hôm nay (mặc định) hay mọi trận còn hạn trong tuần',
        type: COMMAND_OPTION_TYPE.string,
        required: false,
        choices: [...SCOPE_CHOICES],
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const scope = scopeOf(interaction);

    // `run` posts to Discord and lets a refusal through; its JSDoc leaves how loud that is to the
    // caller. Loud here means one sentence naming the action, not the router's generic apology.
    let outcome: ReminderOutcome;
    try {
      outcome = await deps.reminders.run(scope);
    } catch (error) {
      if (isDiscordForbidden(error)) return ephemeralText(CANNOT_POST);

      throw error;
    }

    switch (outcome.status) {
      case 'no-channel':
        return ephemeralText(NO_CHANNEL);

      case 'nothing-due':
        return ephemeralText(NOTHING_TO_SAY[scope]);

      case 'sent':
        return ephemeralText(
          `Đã nhắc ${outcome.missingCount} người cho ${outcome.sessionCount} ngày đánh.`,
        );

      default:
        return assertNever(outcome, 'Kết quả nhắc điểm danh ngoài dự kiến');
    }
  },
};
