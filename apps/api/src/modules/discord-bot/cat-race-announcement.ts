import type { CatRaceAnnouncement } from '../cat-race/cat-race.public';
import type { MessagePayload } from './commands/command.types';
import {
  EMBED_COLOR,
  MAX_CONTENT_LENGTH,
  MAX_EMBED_DESCRIPTION_LENGTH,
} from './discord.constants';
import { takeWithinLimit } from './message-limits';

const LEAD = '🎉 **Kết quả đua mèo** - chúc mừng các bạn trúng giải!';
const FOOTER = 'Guild Manager';
const SECTION_SEPARATOR = '\n\n';

/**
 * Who a winner is on screen: a tag when their Discord is known, the captured name otherwise.
 * @param winner - A winner of the summary
 * @returns The text to print
 */
function label(winner: { discordId: string | null; name: string }): string {
  return winner.discordId ? `<@${winner.discordId}>` : winner.name;
}

/**
 * The summary post of an ended cat race: one embed titled with the event name, a section per prize
 * that has winners. The tags sit in `content` as well because a mention inside an embed never pings.
 * Ticket counts are left out on purpose.
 * @param announcement - Event name and winners per prize
 * @returns The message body
 */
export function buildCatRaceAnnouncement(
  announcement: CatRaceAnnouncement,
): MessagePayload {
  const prizes = announcement.prizes.filter(
    (prize) => prize.winners.length > 0,
  );
  const sections = prizes.map(
    (prize) => `**${prize.name}**\n${prize.winners.map(label).join(', ')}`,
  );
  const taggedIds = [
    ...new Set(
      prizes.flatMap((prize) =>
        prize.winners.flatMap((w) => (w.discordId ? [w.discordId] : [])),
      ),
    ),
  ];
  const mentions = takeWithinLimit(
    taggedIds.map((id) => `<@${id}>`),
    {
      separator: ' ',
      // The lead line and the newline joining it to the mentions.
      limit: MAX_CONTENT_LENGTH - LEAD.length - 1,
      more: (count) => `và ${count} người nữa`,
    },
  );
  const description = takeWithinLimit(sections, {
    separator: SECTION_SEPARATOR,
    limit: MAX_EMBED_DESCRIPTION_LENGTH,
    more: (count) => `… và ${count} hạng mục nữa.`,
  }).text;

  return {
    content: mentions.text ? `${LEAD}\n${mentions.text}` : LEAD,
    embeds: [
      {
        title: announcement.eventName,
        description,
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    // `kept` is a prefix, so exactly the ids the content mentions may ping.
    allowed_mentions: { users: taggedIds.slice(0, mentions.kept.length) },
  };
}
