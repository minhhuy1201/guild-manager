import { callerDiscordId } from '../interaction.schema';
import { formatLeaveRange, resolveLeaveCaller } from '../leave-reply';
import { ephemeralText } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

const NOTHING_TO_CANCEL = 'Bạn không có lần nghỉ nào để hủy.';

/** Cancel the caller's current leave, or the nearest upcoming one when none is running. */
export const huyNghiPhepCommand: SlashCommand = {
  definition: {
    name: 'huy-nghi-phep',
    description: 'Hủy lần nghỉ phép đang diễn ra hoặc sắp tới',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const caller = await resolveLeaveCaller(callerDiscordId(interaction), deps);
    if (!caller.ok) return caller.reply;

    // Soonest first, so a running leave comes before an upcoming one.
    const [nearest] = await deps.leaves.listActiveFor(caller.characterId);
    if (!nearest) return ephemeralText(NOTHING_TO_CANCEL);

    const cancelled = await deps.leaves.cancel(nearest.id, caller.actor);

    return ephemeralText(
      `Đã hủy lần nghỉ ${formatLeaveRange(cancelled.startDate, cancelled.endDate)}.`,
    );
  },
};
