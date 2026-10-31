import { GrantableCommand } from '@guild/shared/enums';
import { fromVnParts, vnDateKey } from '@guild/shared/lib';

import { buildSurveyMessage } from '../class-survey-message';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { invokedSubcommand } from '../interaction.schema';
import { parseLeaveDateInput } from '../leave-date-input';
import { ephemeralText, publicMessage } from '../reply';
import { requireCommand } from '../require-command';
import type { CommandReply, SlashCommand } from './command.types';

/** Subcommand and option names, used both when registering and when reading the invocation. */
const OPEN_SUBCOMMAND = 'mo';
const TITLE_OPTION = 'ten';
const DEADLINE_OPTION = 'han';

const BAD_DATE = 'Hạn phải có dạng dd/mm hoặc dd/mm/yyyy, ví dụ 06/11.';
const PAST_DATE = 'Hạn chót đã qua. Chọn hôm nay hoặc một ngày sau đó.';

/** The deadline is the last millisecond of its day: 23:59:00.000 plus this. */
const END_OF_MINUTE_MS = 59_999;

/**
 * The last instant of a Vietnam calendar day.
 * @param dateKey - `YYYY-MM-DD`
 * @returns 23:59:59.999 Vietnam time of that day
 */
function endOfVnDay(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = fromVnParts({ year, month, day, hour: 23, minute: 59 });

  return new Date(start.getTime() + END_OF_MINUTE_MS);
}

/**
 * Class survey - an Admin, or a Manager granted this command.
 *
 * `mo` opens a round and posts the public announcement. Everything about the round itself (one open
 * at a time, deadline in the future) is `ClassSurveyService.open`'s, so web and Discord cannot
 * disagree; this command only reads the typed date and phrases the message.
 */
export const khaoSatLuuPhaiCommand: SlashCommand = {
  definition: {
    name: 'khao-sat-luu-phai',
    description: 'Khảo sát lưu phái sau bản update (cần được cấp quyền)',
    options: [
      {
        name: OPEN_SUBCOMMAND,
        description: 'Mở một đợt khảo sát mới và báo cả bang',
        type: COMMAND_OPTION_TYPE.subCommand,
        required: false,
        options: [
          {
            name: TITLE_OPTION,
            description: 'Tên đợt khảo sát, ví dụ "Update 06/11"',
            type: COMMAND_OPTION_TYPE.string,
            required: true,
          },
          {
            name: DEADLINE_OPTION,
            description: 'Hạn chót dạng dd/mm hoặc dd/mm/yyyy (hết ngày đó)',
            type: COMMAND_OPTION_TYPE.string,
            required: true,
          },
        ],
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const check = await requireCommand(
      interaction,
      deps,
      GrantableCommand.KHAO_SAT_LUU_PHAI,
    );

    if (!check.ok) return check.reply;

    const subcommand = invokedSubcommand(interaction);
    const title = subcommand?.option(TITLE_OPTION);
    const deadlineText = subcommand?.option(DEADLINE_OPTION);

    // Discord enforces `required`, so a missing one means the registered definition and this build
    // disagree - the fix is `pnpm --filter api discord:register`.
    if (subcommand?.name !== OPEN_SUBCOMMAND || !title || !deadlineText) {
      throw new Error(
        'Lệnh /khao-sat-luu-phai thiếu subcommand hoặc option - chạy pnpm --filter api discord:register',
      );
    }

    const now = deps.clock.now();
    const dateKey = parseLeaveDateInput(deadlineText, now);

    if (!dateKey) return ephemeralText(BAD_DATE);
    if (dateKey < vnDateKey(now)) return ephemeralText(PAST_DATE);

    const survey = await deps.classSurveys.open(
      title.trim(),
      endOfVnDay(dateKey),
      check.caller.actor,
    );

    return publicMessage(buildSurveyMessage(survey, deps.links));
  },
};
