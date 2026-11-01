import { vnDateKey } from '@guild/shared/lib';
import type { ClassSurvey } from '@guild/shared/schemas';

import type {
  ActionRow,
  CommandLinks,
  MessagePayload,
} from './commands/command.types';
import { encodeSurveyFillId } from './custom-id';
import {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  EMBED_COLOR,
  MAX_CONTENT_LENGTH,
} from './discord.constants';
import { takeWithinLimit } from './message-limits';

const FOOTER = 'Guild Manager';

/** Where the link button sends people: the login screen, carrying the survey page as its `redirect`. */
const SURVEY_ENTRY_PATH = '/dang-nhap?redirect=%2Fluu-phai';

/**
 * `dd/mm/yyyy` of a Vietnam calendar day.
 * @param instant - Any instant on that day
 * @returns The day as members write it
 */
export function formatVnDay(instant: Date): string {
  const key = vnDateKey(instant);

  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

/**
 * The fill button plus the link to the web page, shared by the announcement and the reminder.
 * @param surveyId - Survey the fill button belongs to
 * @param webOrigin - Origin of the web app
 * @returns The action row
 */
function surveyButtons(surveyId: string, webOrigin: string): ActionRow {
  return {
    type: COMPONENT_TYPE.actionRow,
    components: [
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.primary,
        label: '📝 Điền khảo sát',
        custom_id: encodeSurveyFillId(surveyId),
      },
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.link,
        label: '🌐 Xem trên website',
        url: `${webOrigin}${SURVEY_ENTRY_PATH}`,
      },
    ],
  };
}

/**
 * The public message announcing a Class survey: pings the guild role, names the survey and its
 * deadline, and offers the fill button plus a link to the web page.
 *
 * The role mention sits in `content` because Discord only notifies for mentions in the message
 * text; `allowed_mentions` opens that one role and nothing else, so a title cannot ping anyone.
 *
 * @param survey - The survey just opened
 * @param links - Web origin and the guild role to mention
 * @returns The message body, ready to be wrapped by `publicMessage`
 */
export function buildSurveyMessage(
  survey: ClassSurvey,
  links: Pick<CommandLinks, 'webOrigin' | 'guildRoleId'>,
): MessagePayload {
  const deadline = formatVnDay(new Date(survey.closesAt));

  return {
    content: `<@&${links.guildRoleId}>`,
    embeds: [
      {
        title: `📋 ${survey.title}`,
        description: [
          `**Hạn chót:** hết ngày ${deadline}`,
          'Sửa lại được đến hạn chót.',
        ].join('\n'),
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [surveyButtons(survey.id, links.webOrigin)],
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}

/** Who a reminder is for: members it can ping, and how many it cannot reach. */
export type SurveyReminderAudience = {
  /** Discord ids of the unanswered members who have a linked account */
  discordIds: readonly string[];
  /** Unanswered members with no Discord account linked */
  unlinkedCount: number;
};

/**
 * The reminder: pings each unanswered member and repeats the fill button.
 *
 * Mentions sit in `content` (an embed never pings) and are trimmed to the message limit; the lead
 * line says how many were left out. `allowed_mentions.users` is exactly the ids that survived the
 * trim, so nobody is pinged by a mention Discord would have cut.
 *
 * @param survey - The open survey
 * @param audience - Pingable ids and the count of members who cannot be pinged
 * @param links - Web origin for the link button
 * @returns The message body, ready to be wrapped by `publicMessage`
 */
export function buildSurveyReminder(
  survey: ClassSurvey,
  audience: SurveyReminderAudience,
  links: Pick<CommandLinks, 'webOrigin'>,
): MessagePayload {
  const deadline = formatVnDay(new Date(survey.closesAt));
  const unlinkedNote =
    audience.unlinkedCount > 0
      ? `\n(${audience.unlinkedCount} người chưa điền nhưng chưa liên kết Discord nên không ping được.)`
      : '';
  const lead = `📋 **${survey.title}** - bạn chưa điền khảo sát lưu phái, hạn hết ngày ${deadline}.${unlinkedNote}`;
  const mentions = takeWithinLimit(
    audience.discordIds.map((id) => `<@${id}>`),
    {
      separator: ' ',
      // The lead line and the newline joining it to the mentions.
      limit: MAX_CONTENT_LENGTH - lead.length - 1,
      more: (count) => `và ${count} người nữa`,
    },
  );

  return {
    content: mentions.text ? `${lead}\n${mentions.text}` : lead,
    components: [surveyButtons(survey.id, links.webOrigin)],
    // `kept` is a prefix, so exactly the ids the content mentions may ping.
    allowed_mentions: {
      users: audience.discordIds.slice(0, mentions.kept.length),
    },
  };
}
