import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * The one row this table holds today: where the attendance reminder is posted.
 * A constant rather than an enum — see the model's comment in schema.prisma.
 */
export const ATTENDANCE_REMINDER = 'ATTENDANCE_REMINDER';

/**
 * Reads and writes the channel the bot posts the attendance reminder to.
 *
 * Talks to Prisma straight from the service rather than through a repository: two calls on one
 * table is not the "complex or repeated queries" that earns one.
 */
@Injectable()
export class BotChannelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The configured channel.
   *
   * `null` is a normal state, not a failure: an admin may simply not have run `/cau-hinh-kenh` yet.
   * Unlike a missing env variable this cannot be checked at boot, so the caller decides what to do
   * about it.
   *
   * @returns The Discord channel id, or null when nothing is configured
   */
  async get(): Promise<string | null> {
    const row = await this.prisma.botChannel.findUnique({
      where: { purpose: ATTENDANCE_REMINDER },
    });

    return row?.channelId ?? null;
  }

  /**
   * Point the reminder at a channel, replacing whatever was there.
   * @param channelId - Discord channel id
   * @returns A promise resolving once the row is written
   */
  async set(channelId: string): Promise<void> {
    await this.prisma.botChannel.upsert({
      where: { purpose: ATTENDANCE_REMINDER },
      create: { purpose: ATTENDANCE_REMINDER, channelId },
      update: { channelId },
    });
  }
}
