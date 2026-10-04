import { Logger } from '@nestjs/common';

import type { BotChannelPurpose } from '../bot-channel.service';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { isDiscordForbidden } from '../discord-rest';
import {
  type ApplicationCommandInteraction,
  commandOptionValue,
} from '../interaction.schema';
import { ephemeralText } from '../reply';
import { requireAdmin } from '../require-admin';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown to a member who tried to configure the channel. */
const ADMIN_ONLY = 'Chỉ admin mới đặt được channel thông báo.';

/** Name of the option, used both when registering and when reading the invocation. */
const PURPOSE_OPTION = 'muc-dich';

/** What an admin can pick for `muc-dich`. The value is the `BotChannelPurpose` itself. */
const PURPOSE_CHOICES = [
  { name: 'Nhắc điểm danh', value: 'ATTENDANCE_REMINDER' },
  { name: 'Cảnh báo admin', value: 'ADMIN_ALERT' },
] as const satisfies readonly { name: string; value: BotChannelPurpose }[];

/** Left empty, the command sets the reminder channel - what it did before the option existed. */
const DEFAULT_PURPOSE: BotChannelPurpose = 'ATTENDANCE_REMINDER';

/**
 * What each purpose posts as proof, and what the admin reads once it is saved.
 * The confirmation is posted into the channel being configured.
 */
const PURPOSE_COPY: Record<
  BotChannelPurpose,
  { confirmation: string; saved: string }
> = {
  ATTENDANCE_REMINDER: {
    confirmation:
      '✅ Channel này đã được đặt làm nơi bot nhắc điểm danh hằng ngày.',
    saved: 'Đã lưu. Từ giờ bot sẽ nhắc điểm danh trong channel này.',
  },
  ADMIN_ALERT: {
    confirmation: '✅ Channel này đã được đặt làm nơi bot báo lỗi cho admin.',
    saved: 'Đã lưu. Từ giờ bot sẽ báo lỗi nhắc điểm danh trong channel này.',
  },
};

/** Shown when Discord refuses that confirmation post for lack of permission. */
const CANNOT_POST =
  'Bot không gửi được tin vào channel này. Kiểm tra bot có thấy channel và có quyền ' +
  'Send Messages không, rồi chạy lại lệnh.';

/**
 * Shown when the confirmation post failed for any other reason.
 *
 * Separate from `CANNOT_POST` because telling an admin to check a permission that is already correct
 * sends them looking for a fault that is not theirs. Deliberately says nothing about *why*: this
 * branch covers a 500, a 429 and a network failure alike, so any more specific wording would be
 * wrong for two of the three. What both messages share is the part that matters: nothing was saved.
 */
const CANNOT_REACH =
  'Discord đang gặp sự cố nên chưa lưu gì cả. Thử lại lệnh sau ít phút.';

const logger = new Logger('cau-hinh-kenh');

/**
 * Purpose the admin picked, or the default when they left the option empty.
 * @param interaction - The command invocation
 * @returns The purpose to configure
 * @throws Error when the value is none of the choices - the registered definition and this build
 *   disagree, and the fix is `pnpm --filter api discord:register`
 */
function purposeOf(
  interaction: ApplicationCommandInteraction,
): BotChannelPurpose {
  const value = commandOptionValue(interaction, PURPOSE_OPTION);

  if (value === null) return DEFAULT_PURPOSE;

  const choice = PURPOSE_CHOICES.find((candidate) => candidate.value === value);

  if (!choice) {
    throw new Error(
      `Option ${PURPOSE_OPTION} của /cau-hinh-kenh không hợp lệ: ${value} - chạy pnpm --filter api discord:register`,
    );
  }

  return choice.value;
}

/**
 * Point the daily attendance reminder, or the admin failure alert, at the channel this command was
 * typed in — admins only.
 *
 * No channel option: the channel is already inside the signed interaction, and asking an admin to
 * enable Developer Mode and copy an id adds three steps and a place to mistype.
 *
 * The confirmation is posted **before** the row is written, and a refusal aborts the whole command.
 * A channel the bot cannot post in is not a configuration; without this check the mistake would
 * surface at 9am the next morning, inside a job nobody is watching, and the cost is a reminder that
 * cannot be sent late.
 */
export const cauHinhKenhCommand: SlashCommand = {
  definition: {
    name: 'cau-hinh-kenh',
    description:
      'Đặt channel này làm nơi bot nhắc điểm danh hoặc báo lỗi (chỉ admin)',
    options: [
      {
        name: PURPOSE_OPTION,
        description:
          'Kênh nhắc điểm danh (mặc định) hay kênh báo lỗi cho admin',
        type: COMMAND_OPTION_TYPE.string,
        required: false,
        choices: [...PURPOSE_CHOICES],
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const check = await requireAdmin(interaction, deps, ADMIN_ONLY);

    if (!check.ok) return check.reply;

    const purpose = purposeOf(interaction);
    const copy = PURPOSE_COPY[purpose];
    const channelId = interaction.channel_id;

    try {
      await deps.rest.postMessage(channelId, { content: copy.confirmation });
    } catch (error) {
      // Discord's own reason stays in the log; the admin gets the action to take.
      logger.warn(
        `Không gửi được tin xác nhận vào channel ${channelId}`,
        error as Error,
      );

      // Every failure still aborts — see the note above on why nothing is saved until the bot has
      // proved it can post. Only which sentence the admin reads depends on the reason.
      return ephemeralText(
        isDiscordForbidden(error) ? CANNOT_POST : CANNOT_REACH,
      );
    }

    await deps.channels.set(purpose, channelId);

    return ephemeralText(copy.saved);
  },
};
