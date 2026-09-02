import { canManageGuild } from '@guild/shared/lib';
import { Logger } from '@nestjs/common';

import { NOT_LINKED } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeralText } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown to a member who tried to configure the channel. */
const ADMIN_ONLY = 'Chỉ admin mới đặt được channel thông báo.';

/** Posted into the channel being configured — the proof that the bot can post there at all. */
const CONFIRMATION =
  '✅ Channel này đã được đặt làm nơi bot nhắc điểm danh hằng ngày.';

/** Shown when Discord refuses that confirmation post. */
const CANNOT_POST =
  'Bot không gửi được tin vào channel này. Kiểm tra bot có thấy channel và có quyền ' +
  'Send Messages không, rồi chạy lại lệnh.';

/** Shown once the channel is stored. */
const SAVED = 'Đã lưu. Từ giờ bot sẽ nhắc điểm danh trong channel này.';

const logger = new Logger('cau-hinh-kenh');

/**
 * Point the daily attendance reminder at the channel this command was typed in — admins only.
 *
 * No option: the channel is already inside the signed interaction, and asking an admin to enable
 * Developer Mode and copy an id adds three steps and a place to mistype.
 *
 * The confirmation is posted **before** the row is written, and a refusal aborts the whole command.
 * A channel the bot cannot post in is not a configuration; without this check the mistake would
 * surface at 9am the next morning, inside a job nobody is watching, and the cost is a reminder that
 * cannot be sent late.
 */
export const cauHinhKenhCommand: SlashCommand = {
  definition: {
    name: 'cau-hinh-kenh',
    description: 'Đặt channel này làm nơi bot nhắc điểm danh (chỉ admin)',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const channelId = interaction.channel_id;

    try {
      await deps.rest.postMessage(channelId, { content: CONFIRMATION });
    } catch (error) {
      // Discord's own reason stays in the log; the admin gets the action to take.
      logger.warn(
        `Không gửi được tin xác nhận vào channel ${channelId}`,
        error as Error,
      );

      return ephemeralText(CANNOT_POST);
    }

    await deps.channels.set(channelId);

    return ephemeralText(SAVED);
  },
};
