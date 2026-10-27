import { vnDateKey } from '@guild/shared/lib';
import type { AutoAttendStatus } from '@guild/shared/schemas';

import type {
  CommandDeps,
  CommandReply,
  MessagePayload,
  UpdateMessageReply,
} from './commands/command.types';
import { AUTO_ATTEND_OFF_ID, AUTO_ATTEND_ON_ID } from './custom-id';
import {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
} from './discord.constants';
import { resolveOwnCaller } from './own-caller';
import { ephemeral } from './reply';

/**
 * What a member reads before turning Auto-attend on. It is the confirmation: the switch only
 * happens when they press "Bật" under it.
 */
const WARNING =
  'Mọi trận đánh trong tương lai sẽ được tự động điểm danh **CÓ** cho bạn. ' +
  'Lưu ý: trận nào bận thì vào đổi thành **KHÔNG** trước hạn chót, hoặc dùng Xin nghỉ.';

/**
 * `dd/mm` of the day an instant falls on in Vietnam.
 * @param iso - ISO instant
 * @returns The day and month, as members write them
 */
function dayMonth(iso: string): string {
  const key = vnDateKey(new Date(iso));

  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

/**
 * The private panel: where Auto-attend stands and the one button that changes it.
 * @param status - The caller's Auto-attend
 * @returns The message body
 */
export function buildAutoAttendPanel(status: AutoAttendStatus): MessagePayload {
  if (status.enabled && status.enabledAt) {
    return {
      content: `Bạn đang bật tự động điểm danh từ ${dayMonth(status.enabledAt)}.`,
      components: [
        {
          type: COMPONENT_TYPE.actionRow,
          components: [
            {
              type: COMPONENT_TYPE.button,
              style: BUTTON_STYLE.secondary,
              label: 'Tắt',
              custom_id: AUTO_ATTEND_OFF_ID,
            },
          ],
        },
      ],
    };
  }

  return {
    content: `Tự động điểm danh đang **tắt**.\n\n${WARNING}`,
    components: [
      {
        type: COMPONENT_TYPE.actionRow,
        components: [
          {
            type: COMPONENT_TYPE.button,
            style: BUTTON_STYLE.primary,
            label: 'Bật',
            custom_id: AUTO_ATTEND_ON_ID,
          },
        ],
      },
    ],
  };
}

/**
 * Answer the "Tự động điểm danh" button: a new private message with the caller's current state.
 * @param discordId - Discord ID from the signed interaction
 * @param deps - Services the bot reaches
 * @returns The reply Discord shows only to the caller
 */
export async function openAutoAttend(
  discordId: string,
  deps: CommandDeps,
): Promise<CommandReply> {
  const caller = await resolveOwnCaller(discordId, deps);
  if (!caller.ok) return caller.reply;

  const status = await deps.autoAttend.status(caller.actor);

  return ephemeral(buildAutoAttendPanel(status));
}

/**
 * Answer the panel's "Bật" or "Tắt": switch, then rewrite the panel with the state that is true now.
 * A refusal is a new private message, never an update, so it does not replace the panel.
 * @param discordId - Discord ID from the signed interaction
 * @param enabled - The state the pressed button asks for
 * @param deps - Services the bot reaches
 * @returns The panel rewritten in place, or the refusal
 */
export async function switchAutoAttend(
  discordId: string,
  enabled: boolean,
  deps: CommandDeps,
): Promise<UpdateMessageReply | CommandReply> {
  const caller = await resolveOwnCaller(discordId, deps);
  if (!caller.ok) return caller.reply;

  const status = await deps.autoAttend.set(caller.actor, enabled);

  return {
    type: INTERACTION_RESPONSE_TYPE.updateMessage,
    data: buildAutoAttendPanel(status),
  };
}
