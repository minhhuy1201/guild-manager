import { vnParts } from '@guild/shared/lib';
import { ATTENDANCE_REASON_MAX_LENGTH } from '@guild/shared/schemas';

import type { ModalReply } from './commands/command.types';
import { LEAVE_MODAL_ID } from './custom-id';
import {
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
  TEXT_INPUT_STYLE,
} from './discord.constants';
import type { ModalSubmitInteraction } from './interaction.schema';

const FROM_INPUT = 'tu-ngay';
const TO_INPUT = 'den-ngay';
const REASON_INPUT = 'ly-do';

/**
 * The leave form, "from" pre-filled with today.
 * @param today - Now, from `Clock`
 * @returns The reply that opens the modal
 */
export function buildLeaveModal(today: Date): ModalReply {
  const { day, month } = vnParts(today);
  const todayText = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;

  return {
    type: INTERACTION_RESPONSE_TYPE.modal,
    data: {
      custom_id: LEAVE_MODAL_ID,
      title: 'Xin nghỉ',
      components: [
        {
          type: COMPONENT_TYPE.label,
          label: 'Từ ngày (dd/mm)',
          component: {
            type: COMPONENT_TYPE.textInput,
            custom_id: FROM_INPUT,
            style: TEXT_INPUT_STYLE.short,
            required: true,
            value: todayText,
          },
        },
        {
          type: COMPONENT_TYPE.label,
          label: 'Đến hết ngày (dd/mm)',
          component: {
            type: COMPONENT_TYPE.textInput,
            custom_id: TO_INPUT,
            style: TEXT_INPUT_STYLE.short,
            required: true,
            placeholder: 'Ví dụ 12/10',
          },
        },
        {
          type: COMPONENT_TYPE.label,
          label: 'Lý do (không bắt buộc)',
          component: {
            type: COMPONENT_TYPE.textInput,
            custom_id: REASON_INPUT,
            style: TEXT_INPUT_STYLE.paragraph,
            required: false,
            max_length: ATTENDANCE_REASON_MAX_LENGTH,
          },
        },
      ],
    },
  };
}

/**
 * Read the three boxes of a submitted leave form.
 * @param interaction - The validated submission
 * @returns The typed texts; an empty reason is `null`. A box Discord left out reads as empty text,
 *   which the date parser then refuses with the usual format message.
 */
export function readLeaveModal(interaction: ModalSubmitInteraction): {
  from: string;
  to: string;
  reason: string | null;
} {
  const valueOf = (customId: string): string =>
    interaction.data.components.find(
      (label) => label.component.custom_id === customId,
    )?.component.value ?? '';

  return {
    from: valueOf(FROM_INPUT),
    to: valueOf(TO_INPUT),
    reason: valueOf(REASON_INPUT).trim() || null,
  };
}
