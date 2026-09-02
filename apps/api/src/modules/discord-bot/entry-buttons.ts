import type { ActionRow } from './commands/command.types';
import { ANNOUNCEMENT_ATTENDANCE_ID } from './custom-id';
import { BUTTON_STYLE, COMPONENT_TYPE } from './discord.constants';

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
        url: webOrigin,
      },
    ],
  };
}
