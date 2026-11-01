import { GrantableCommand } from '@guild/shared/enums';
import { fromVnParts, vnDateKey } from '@guild/shared/lib';
import { SURVEY_TITLE_MAX_LENGTH } from '@guild/shared/schemas';

import {
  buildSurveyMessage,
  buildSurveyReminder,
} from '../class-survey-message';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { invokedSubcommand } from '../interaction.schema';
import { parseLeaveDateInput } from '../leave-date-input';
import { ephemeralText, publicMessage } from '../reply';
import { requireCommand } from '../require-command';
import type { CommandDeps, CommandReply, SlashCommand } from './command.types';

/** Subcommand and option names, used both when registering and when reading the invocation. */
const OPEN_SUBCOMMAND = 'mo';
const REMIND_SUBCOMMAND = 'nhac';
const TITLE_OPTION = 'ten';
const DEADLINE_OPTION = 'han';

const NO_OPEN_SURVEY =
  'Hiện không có đợt khảo sát nào đang mở. Mở một đợt bằng /khao-sat-luu-phai mo.';
const EVERYONE_ANSWERED = 'Mọi người đã điền khảo sát, không cần nhắc ai.';

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
 * `nhac`: ping every unanswered member who has a linked Discord account.
 * @param deps - Services the command may reach
 * @returns A public reminder, or a private sentence when there is nobody to ping
 */
async function remind(deps: CommandDeps): Promise<CommandReply> {
  const targets = await deps.classSurveys.unanswered();

  if (!targets) return ephemeralText(NO_OPEN_SURVEY);
  if (targets.unanswered.length === 0) return ephemeralText(EVERYONE_ANSWERED);

  const discordIds = targets.unanswered.flatMap((member) =>
    member.discordId ? [member.discordId] : [],
  );

  if (discordIds.length === 0) {
    return ephemeralText(
      `${targets.unanswered.length} người chưa điền nhưng chưa liên kết Discord nên không ping được.`,
    );
  }

  return publicMessage(
    buildSurveyReminder(
      targets.survey,
      {
        discordIds,
        unlinkedCount: targets.unanswered.length - discordIds.length,
      },
      deps.links,
    ),
  );
}

/**
 * Class survey - an Admin, or a Manager granted this command.
 *
 * `mo` opens a round and posts the public announcement; `nhac` pings the members who have not answered. Everything about the round itself (one open
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
            max_length: SURVEY_TITLE_MAX_LENGTH,
          },
          {
            name: DEADLINE_OPTION,
            description: 'Hạn chót dạng dd/mm hoặc dd/mm/yyyy (hết ngày đó)',
            type: COMMAND_OPTION_TYPE.string,
            required: true,
          },
        ],
      },
      {
        name: REMIND_SUBCOMMAND,
        description: 'Ping những người chưa điền đợt khảo sát đang mở',
        type: COMMAND_OPTION_TYPE.subCommand,
        required: false,
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

    if (subcommand?.name === REMIND_SUBCOMMAND) return remind(deps);

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
