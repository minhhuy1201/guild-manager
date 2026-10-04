import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * What the bot posts in a channel. A union rather than a Prisma enum - see the model's comment in
 * schema.prisma: the value never crosses the network.
 */
export type BotChannelPurpose = 'ATTENDANCE_REMINDER' | 'ADMIN_ALERT';

/**
 * Reads and writes the channels the bot posts to, by purpose.
 *
 * Talks to Prisma straight from the service rather than through a repository: two calls on one
 * table is not the "complex or repeated queries" that earns one.
 */
@Injectable()
export class BotChannelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The channel configured for a purpose.
   *
   * `null` is a normal state, not a failure: an admin may simply not have run `/cau-hinh-kenh` yet.
   * Unlike a missing env variable this cannot be checked at boot, so the caller decides what to do
   * about it.
   *
   * @param purpose - What the channel is for
   * @returns The Discord channel id, or null when nothing is configured
   */
  async get(purpose: BotChannelPurpose): Promise<string | null> {
    const row = await this.prisma.botChannel.findUnique({
      where: { purpose },
    });

    return row?.channelId ?? null;
  }

  /**
   * Point a purpose at a channel, replacing whatever was there.
   * @param purpose - What the channel is for
   * @param channelId - Discord channel id
   * @returns A promise resolving once the row is written
   */
  async set(purpose: BotChannelPurpose, channelId: string): Promise<void> {
    await this.prisma.botChannel.upsert({
      where: { purpose },
      create: { purpose, channelId },
      update: { channelId },
    });
  }
}
