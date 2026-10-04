import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { callerDiscordId, commandOptionValue } from '../interaction.schema';
import { submitLeave } from '../leave-reply';
import type { CommandReply, SlashCommand } from './command.types';

const FROM_OPTION = 'tu-ngay';
const TO_OPTION = 'den-ngay';
const REASON_OPTION = 'ly-do';

/**
 * Declare a leave for the caller's own character.
 * The dates are free text (`dd/mm`) because Discord has no date picker for a slash command.
 */
export const nghiPhepCommand: SlashCommand = {
  definition: {
    name: 'nghi-phep',
    description: 'Khai nghỉ phép một khoảng ngày',
    options: [
      {
        name: FROM_OPTION,
        description: 'Từ ngày, dạng dd/mm (ví dụ 05/10)',
        type: COMMAND_OPTION_TYPE.string,
        required: true,
      },
      {
        name: TO_OPTION,
        description: 'Đến hết ngày, dạng dd/mm (ví dụ 12/10)',
        type: COMMAND_OPTION_TYPE.string,
        required: true,
      },
      {
        name: REASON_OPTION,
        description: 'Lý do (không bắt buộc)',
        type: COMMAND_OPTION_TYPE.string,
        required: false,
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const from = commandOptionValue(interaction, FROM_OPTION);
    const to = commandOptionValue(interaction, TO_OPTION);

    if (!from || !to) {
      // Discord enforces `required: true`, so a missing value means the registered definition and
      // this build disagree - the fix is `pnpm --filter api discord:register`.
      throw new Error('Thiếu option của /nghi-phep.');
    }

    return submitLeave(
      callerDiscordId(interaction),
      { from, to, reason: commandOptionValue(interaction, REASON_OPTION) },
      deps,
    );
  },
};
