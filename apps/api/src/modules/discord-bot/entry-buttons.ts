import type { ActionRow } from './commands/command.types';
import { ANNOUNCEMENT_ATTENDANCE_ID } from './custom-id';
import { BUTTON_STYLE, COMPONENT_TYPE } from './discord.constants';

/**
 * Where the link button sends people: the login screen, already carrying the attendance page as its
 * `redirect`.
 *
 * Not the bare origin. The site's root answers a signed-out request with the guild's public landing
 * page, which is right for a stranger typing the domain and wrong for this button - everyone reading
 * it is in the guild's Discord and means to go and answer. The login screen sends a signed-in member
 * straight on to attendance and a signed-out one through Discord and then to attendance, so both
 * arrive where the message is pointing. The path is spelled out here the same way `auth.service.ts`
 * spells out its own; the web app's routes are not something this app imports.
 */
const ATTENDANCE_ENTRY_PATH = '/dang-nhap?redirect=%2F';

/**
 * The row of buttons under any message the bot addresses to the whole guild.
 *
 * Shared by the weekly announcement and the attendance reminder rather than built inside each: the
 * two messages make the same offer — answer here, or go look at the site — and two copies of one
 * row drift the first time a label changes.
 *
 * @param webOrigin - Origin of the web app
 * @returns One action row holding both buttons
 */
export function buildEntryButtons(webOrigin: string): ActionRow {
  return {
    type: COMPONENT_TYPE.actionRow,
    components: [
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.primary,
        label: '✅ Điểm danh ngay',
        custom_id: ANNOUNCEMENT_ATTENDANCE_ID,
      },
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.link,
        label: '🌐 Mở website',
        url: `${webOrigin}${ATTENDANCE_ENTRY_PATH}`,
      },
    ],
  };
}
