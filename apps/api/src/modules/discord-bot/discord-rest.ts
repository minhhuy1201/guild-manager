import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config';
import type { MessagePayload } from './commands/command.types';

/** Base of Discord's REST API, pinned to the version the payload shapes were written against. */
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * A call Discord refused.
 *
 * Carries the status apart from the message so a caller can tell the refusals apart — a 403 is an
 * admin who has not granted the bot a permission yet and can fix it in Discord, everything else is
 * the system's problem. The message keeps both the status and the response body, because "the
 * message never arrived" is otherwise unanswerable from a log.
 */
export class DiscordApiError extends Error {
  constructor(
    /** HTTP status Discord answered with */
    readonly status: number,
    /** Channel the message was meant for */
    readonly channelId: string,
    /** Discord's own response body */
    readonly body: string,
  ) {
    super(
      `Discord từ chối gửi tin vào channel ${channelId} (${status}): ${body}`,
    );
    this.name = 'DiscordApiError';
  }
}

/** One file travelling with a message — Discord takes them as multipart parts. */
export interface OutgoingFile {
  /** Name Discord shows under the message */
  filename: string;
  /**
   * Raw bytes of the file. Pinned to an `ArrayBuffer` backing store because that is what `Blob`
   * accepts — the default `ArrayBufferLike` also admits a `SharedArrayBuffer`, which it does not.
   */
  bytes: Uint8Array<ArrayBuffer>;
  /** MIME type, e.g. `image/webp` */
  contentType: string;
}

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
   * URL of a channel's message route.
   * @param channelId - Discord channel id
   * @returns The absolute endpoint
   */
  private messagesUrl(channelId: string): string {
    return `${DISCORD_API_BASE}/channels/${channelId}/messages`;
  }

  /**
   * The bot authorization header every outgoing call carries.
   * @returns The header pair
   */
  private authHeader(): Record<string, string> {
    return {
      Authorization: `Bot ${this.config.get('DISCORD_BOT_TOKEN', { infer: true })}`,
    };
  }

  /**
   * Turn a refusal into an error a log can be read from.
   * @param channelId - Channel the message was meant for
   * @param response - Discord's response
   * @returns A promise resolving when the response was fine
   * @throws DiscordApiError when Discord rejects the call, carrying its status and response body
   */
  private async ensureAccepted(
    channelId: string,
    response: Response,
  ): Promise<void> {
    if (response.ok) return;

    throw new DiscordApiError(
      response.status,
      channelId,
      await response.text(),
    );
  }

  /**
   * Post a message into a channel.
   * @param channelId - Discord channel id
   * @param payload - The message body, the same shape an interaction reply carries
   * @returns A promise resolving once Discord has accepted the message
   * @throws Error when Discord rejects the call, carrying the status and the response body
   */
  async postMessage(channelId: string, payload: MessagePayload): Promise<void> {
    const response = await fetch(this.messagesUrl(channelId), {
      method: 'POST',
      headers: {
        ...this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    await this.ensureAccepted(channelId, response);
  }

  /**
   * Post a message carrying files — the line-up images of a formation announcement.
   *
   * Multipart rather than JSON because Discord takes an upload no other way: the message body goes
   * in a `payload_json` part and each file in a `files[n]` part, tied together by an `attachments`
   * entry per file. `Content-Type` is deliberately absent — `fetch` writes it itself, boundary
   * included, and setting it by hand loses that boundary and the whole message with it.
   *
   * @param channelId - Discord channel id
   * @param payload - The message body
   * @param files - Files to attach, in the order they should appear
   * @returns A promise resolving once Discord has accepted the message
   * @throws Error when Discord rejects the call, carrying the status and the response body
   */
  async postMessageWithFiles(
    channelId: string,
    payload: MessagePayload,
    files: OutgoingFile[],
  ): Promise<void> {
    const form = new FormData();

    form.append(
      'payload_json',
      JSON.stringify({
        ...payload,
        attachments: files.map((file, index) => ({
          id: index,
          filename: file.filename,
        })),
      }),
    );

    files.forEach((file, index) => {
      form.append(
        `files[${index}]`,
        new Blob([file.bytes], { type: file.contentType }),
        file.filename,
      );
    });

    const response = await fetch(this.messagesUrl(channelId), {
      method: 'POST',
      headers: this.authHeader(),
      body: form,
    });

    await this.ensureAccepted(channelId, response);
  }
}
