import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import type { Env } from '../../config';
import type { MessagePayload } from './commands/command.types';

/**
 * How long one call, JSON or upload, may take before it is abandoned. Without it a hung connection holds the
 * whole Vercel Function until the platform kills it, which for the Team notices loses the report.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** Base of Discord's REST API, pinned to the version the payload shapes were written against. */
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * The two fields of a refusal's JSON body a caller acts on. Each falls back to null on its own, so
 * one field of the wrong type does not hide the other.
 */
const refusalBodySchema = z.object({
  code: z.number().nullable().catch(null),
  retry_after: z.number().nullable().catch(null),
});

/** Discord's answer to "open a DM". Only the channel id is read. */
const dmChannelSchema = z.object({ id: z.string() });

/**
 * A call Discord refused.
 *
 * Carries the status apart from the message so a caller can tell the refusals apart — a 403 is an
 * admin who has not granted the bot a permission yet and can fix it in Discord, everything else is
 * the system's problem. The message keeps both the status and the response body, because "the
 * message never arrived" is otherwise unanswerable from a log.
 */
export class DiscordApiError extends Error {
  /** Discord's JSON error code (e.g. 50007), null when the body carries none */
  readonly code: number | null;

  /** Seconds Discord asks the caller to wait after a 429, null when the body carries none */
  readonly retryAfter: number | null;

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

    const refusal = DiscordApiError.readRefusal(body);

    this.code = refusal.code;
    this.retryAfter = refusal.retry_after;
  }

  /**
   * Read `code` and `retry_after` out of a response body.
   * @param body - Discord's response body, JSON or not
   * @returns Both fields, null where absent or unreadable
   */
  private static readRefusal(body: string): {
    code: number | null;
    retry_after: number | null;
  } {
    const none = { code: null, retry_after: null };
    let json: unknown;

    try {
      json = JSON.parse(body);
    } catch {
      // A 502 from Discord's edge is HTML; there is nothing to read and the raw body is already in
      // the message.
      return none;
    }

    const parsed = refusalBodySchema.safeParse(json);

    return parsed.success ? parsed.data : none;
  }
}

/** Status Discord answers with when the bot lacks a permission in the channel. */
export const DISCORD_FORBIDDEN = 403;

/** Status Discord answers with when the bot is sending faster than a route allows. */
export const DISCORD_RATE_LIMITED = 429;

/**
 * Whether this error is Discord refusing a post for lack of permission.
 *
 * Several callers translate that refusal - `/cau-hinh-kenh`, the roster announcement,
 * `/nhac-diem-danh` and the cron's admin alert - and each says something different about which
 * channel and which permission, so only the detection is shared. Copying the `instanceof` plus the status again is what
 * `CLAUDE.md` calls the sign of a missed extraction.
 *
 * @param error - The caught error
 * @returns true when Discord answered 403
 */
export function isDiscordForbidden(error: unknown): boolean {
  return error instanceof DiscordApiError && error.status === DISCORD_FORBIDDEN;
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
   * Open (or fetch the existing) DM channel with a user.
   *
   * Discord returns the existing channel when one is already open, so nothing needs storing between
   * calls. Opening many of these quickly can get the bot blocked from opening new ones (error
   * 40003), which is why the caller sends one at a time.
   *
   * @param userId - Discord user id of the recipient
   * @returns The DM channel id to post into
   * @throws DiscordApiError when Discord rejects the call
   */
  async openDm(userId: string): Promise<string> {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
      method: 'POST',
      headers: {
        ...this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    await this.ensureAccepted(`user:${userId}`, response);

    return dmChannelSchema.parse(await response.json()).id;
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    await this.ensureAccepted(channelId, response);
  }
}
