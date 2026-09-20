import { buildAnnouncement } from '../announcement';
import { publicMessage } from '../reply';
import { requireAdmin } from '../require-admin';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Shown to a member who tried to announce.
 * The refusal stays ephemeral even though the announcement itself is public: a channel does not
 * need to watch someone be told no.
 */
const ADMIN_ONLY = 'Chỉ admin mới đăng thông báo được.';

/**
 * Post this week's schedule for the whole guild — admins only.
 *
 * It never runs on its own. There is no scheduler behind it and none is planned: the announcement
 * carries a mention that pings every member, and who gets pinged when is a decision an admin makes,
 * not a cron expression.
 *
 * The role is checked here rather than left to a service, because the reply *is* the effect — by
 * the time anything downstream could refuse, the message would already be in the channel.
 */
export const thongBaoCommand: SlashCommand = {
  definition: {
    name: 'thong-bao',
    description: 'Đăng lịch đánh tuần này cho cả bang (chỉ admin)',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const check = await requireAdmin(interaction, deps, ADMIN_ONLY);

    if (!check.ok) return check.reply;

    const sessions = await deps.battleSessions.listByWeek();

    return publicMessage(buildAnnouncement(sessions, deps.links));
  },
};
