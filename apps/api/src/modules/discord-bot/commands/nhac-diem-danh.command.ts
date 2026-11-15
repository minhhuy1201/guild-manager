import { GrantableCommand } from '@guild/shared/enums';
import { assertNever } from '../../../common';
import type { ReminderScope } from '../../battle-sessions/battle-sessions.public';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import {
  type ApplicationCommandInteraction,
  commandOptionValue,
} from '../interaction.schema';
import { deferredEphemeral } from '../reply';
import { undeliveredLines } from '../reminder-alert';
import { requireCommand } from '../require-command';
import type {
  CommandResult,
  MessagePayload,
  SlashCommand,
} from './command.types';

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
      `Option ${SCOPE_OPTION} của /nhac-diem-danh không hợp lệ: ${value} - chạy pnpm --filter api discord:register`,
    );
  }

  return choice.value;
}

/**
 * Run the attendance reminder right now - an Admin, or a Manager granted this command.
 *
 * It calls the very same `ReminderService.run` the cron endpoint calls, so a hand-run reminder and
 * a scheduled one cannot disagree about who is missing. It exists for two reasons: the scheduled
 * path is otherwise unverifiable until the next morning (scope `today`), and an admin sometimes
 * wants to nudge earlier than the daily rule would (scope `week`).
 *
 * Every branch below comes from the outcome `run` reports, so this command asks the database
 * nothing of its own — the run is the single source of truth for what happened, wording included.
 */
export const nhacDiemDanhCommand: SlashCommand<CommandResult> = {
  definition: {
    name: 'nhac-diem-danh',
    description: 'Nhắc ngay những ai chưa điểm danh (cần được cấp quyền)',
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

  execute: async (interaction, deps): Promise<CommandResult> => {
    const check = await requireCommand(
      interaction,
      deps,
      GrantableCommand.NHAC_DIEM_DANH,
    );

    if (!check.ok) return check.reply;

    const scope = scopeOf(interaction);

    // Sending one DM per member takes longer than Discord's 3 seconds, so acknowledge now; the
    // router runs the follow-up and edits the original response with its result.
    return deferredEphemeral(async (): Promise<MessagePayload> => {
      const outcome = await deps.reminders.run(scope);

      switch (outcome.status) {
        case 'nothing-due':
          return { content: NOTHING_TO_SAY[scope] };

        case 'sent':
          return {
            content: [
              `Đã nhắc ${outcome.deliveredCount}/${outcome.missingCount} người cho ${outcome.sessionCount} ngày đánh.`,
              ...undeliveredLines(outcome),
            ].join('\n'),
          };

        default:
          return assertNever(outcome, 'Kết quả nhắc điểm danh ngoài dự kiến');
      }
    });
  },
};
