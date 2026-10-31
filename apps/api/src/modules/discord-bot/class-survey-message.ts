import type { ClassSurvey } from '@guild/shared/schemas';

import type { CommandLinks, MessagePayload } from './commands/command.types';
import { encodeSurveyFillId } from './custom-id';
import { BUTTON_STYLE, COMPONENT_TYPE, EMBED_COLOR } from './discord.constants';
import { vnDateKey } from '@guild/shared/lib';

const FOOTER = 'Guild Manager';

/** Where the link button sends people: the login screen, carrying the survey page as its `redirect`. */
const SURVEY_ENTRY_PATH = '/dang-nhap?redirect=%2Fluu-phai';

/**
 * `dd/mm/yyyy` of a Vietnam calendar day.
 * @param instant - Any instant on that day
 * @returns The day as members write it
 */
function formatVnDay(instant: Date): string {
  const key = vnDateKey(instant);

  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
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
    components: [
      {
        type: COMPONENT_TYPE.actionRow,
        components: [
          {
            type: COMPONENT_TYPE.button,
            style: BUTTON_STYLE.primary,
            label: '📝 Điền khảo sát',
            custom_id: encodeSurveyFillId(survey.id),
          },
          {
            type: COMPONENT_TYPE.button,
            style: BUTTON_STYLE.link,
            label: '🌐 Xem trên website',
            url: `${links.webOrigin}${SURVEY_ENTRY_PATH}`,
          },
        ],
      },
    ],
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
