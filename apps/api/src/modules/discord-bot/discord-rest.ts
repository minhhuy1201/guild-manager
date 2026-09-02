import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config';
import type { MessagePayload } from './commands/command.types';

/** Base of Discord's REST API, pinned to the version the payload shapes were written against. */
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * The bot's outgoing calls to Discord.
 *
 * Every reply to an interaction travels back inside that webhook's own HTTP response, so until the
 * reminder existed the bot never called Discord at all. This is that one direction: a message sent
 * because a schedule said so, not because somebody typed something.
 *
 * A hand-written `fetch` wrapper rather than `discord.js`: what is needed is one route, and that
 * library is built around a gateway WebSocket a Vercel Function cannot hold open.
 */
@Injectable()
export class DiscordRestClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Post a message into a channel.
   * @param channelId - Discord channel id
   * @param payload - The message body, the same shape an interaction reply carries
   * @returns A promise resolving once Discord has accepted the message
   * @throws Error when Discord rejects the call. The status **and** its response body are both in
   *   the message: "the reminder never arrived" is otherwise unanswerable from a log
   */
  async postMessage(channelId: string, payload: MessagePayload): Promise<void> {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.config.get('DISCORD_BOT_TOKEN', { infer: true })}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Discord từ chối gửi tin vào channel ${channelId} (${response.status}): ${await response.text()}`,
      );
    }
  }
}
