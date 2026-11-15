import { Injectable, Logger } from '@nestjs/common';
import { assertNever } from '@guild/shared/lib';

import { Clock } from '../../common';
import type { MessagePayload } from './commands/command.types';
import { DISCORD_ERROR_CODE } from './discord.constants';
import {
  DISCORD_RATE_LIMITED,
  DiscordApiError,
  DiscordRestClient,
} from './discord-rest';
import type { OutgoingFile } from './discord-rest';

/** Longest a 429 may ask us to wait before we give up on that recipient instead. */
const MAX_RETRY_WAIT_SECONDS = 10;

/** How long to wait after a 429 that did not say. */
const DEFAULT_RETRY_WAIT_SECONDS = 1;

/**
 * How long a run may go before it stops starting new deliveries. A Vercel Function is killed at
 * 300 seconds, and a kill mid-run loses the report and invites a duplicate send on retry; stopping
 * here leaves time to answer, and the rest is reported as unsent.
 */
const SEND_BUDGET_MS = 220_000;

/** Milliseconds in a second, for turning Discord's `retry_after` into a timer. */
const SECOND_MS = 1000;

/** One direct message to send. */
export interface DmRecipient {
  discordId: string;
  payload: MessagePayload;
  /** Attachments for the message; omitted or empty sends text only. */
  files?: OutgoingFile[];
}

/**
 * How one recipient's delivery ended: `blocked` means the member does not accept DMs from the bot
 * (Discord 50007), `unsent` means it did not go out for any other reason, including a run that
 * stopped before reaching them.
 */
export type DmResult = 'sent' | 'blocked' | 'unsent';

/** A single attempt's outcome; `too-fast` ends the whole run. */
type DeliveryResult = DmResult | 'too-fast';

/**
 * Sends direct messages one recipient at a time and sorts each ending into a {@link DmResult}.
 *
 * Shared by every feature that DMs members (Team notice, Attendance reminder) so the rate-limit and
 * time-budget rules live in one place.
 */
@Injectable()
export class DmSenderService {
  private readonly logger = new Logger(DmSenderService.name);

  constructor(
    private readonly rest: DiscordRestClient,
    private readonly clock: Clock,
  ) {}

  /**
   * Send every recipient their message, in order.
   *
   * Stops starting deliveries once Discord says DMs are opened too fast (going on risks the bot
   * being blocked from opening any) or the time budget is spent; everyone still waiting is `unsent`.
   *
   * @param recipients - Who to message and with what
   * @returns One result per recipient, in the same order
   */
  async sendAll(recipients: readonly DmRecipient[]): Promise<DmResult[]> {
    const results: DmResult[] = [];
    const startedAt = this.clock.now().getTime();
    let stopped = false;

    for (const recipient of recipients) {
      if (!stopped && this.isOutOfTime(startedAt)) {
        this.logger.warn(
          'Hết thời gian nhắn riêng, phần còn lại được báo là chưa nhắn.',
        );
        stopped = true;
      }

      if (stopped) {
        results.push('unsent');
        continue;
      }

      const result = await this.deliver(recipient);

      switch (result) {
        case 'sent':
        case 'blocked':
        case 'unsent':
          results.push(result);
          break;
        case 'too-fast':
          stopped = true;
          results.push('unsent');
          break;
        default:
          assertNever(result);
      }
    }

    return results;
  }

  /**
   * Whether the run has used up its time budget.
   * @param startedAt - When the run began, in epoch milliseconds
   * @returns true once no new delivery should start
   */
  private isOutOfTime(startedAt: number): boolean {
    return this.clock.now().getTime() - startedAt > SEND_BUDGET_MS;
  }

  /**
   * Open the recipient's DM and post their message into it, sorting a refusal into what it means.
   *
   * A 429 is waited out and tried once more; a second one is given up on. Every other failure is
   * logged with Discord's own body, because the report only says "unsent".
   *
   * @param recipient - Who to message and with what
   * @param canRetry - Whether a 429 may still be waited out
   * @returns How the delivery ended
   */
  private async deliver(
    recipient: DmRecipient,
    canRetry = true,
  ): Promise<DeliveryResult> {
    const { discordId, payload, files = [] } = recipient;

    try {
      const dmChannelId = await this.rest.openDm(discordId);

      if (files.length > 0) {
        await this.rest.postMessageWithFiles(dmChannelId, payload, files);
      } else {
        await this.rest.postMessage(dmChannelId, payload);
      }

      return 'sent';
    } catch (error) {
      if (error instanceof DiscordApiError) {
        if (error.code === DISCORD_ERROR_CODE.cannotMessageUser) {
          return 'blocked';
        }

        if (error.code === DISCORD_ERROR_CODE.openingDmsTooFast) {
          this.logger.warn(
            `Discord báo mở DM quá nhanh (${error.code}), dừng nhắn riêng: ${error.message}`,
          );

          return 'too-fast';
        }

        const wait = error.retryAfter ?? DEFAULT_RETRY_WAIT_SECONDS;

        if (
          canRetry &&
          error.status === DISCORD_RATE_LIMITED &&
          wait <= MAX_RETRY_WAIT_SECONDS
        ) {
          await new Promise((resolve) => setTimeout(resolve, wait * SECOND_MS));

          return this.deliver(recipient, false);
        }
      }

      this.logger.warn(
        `Không nhắn riêng được cho ${discordId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      return 'unsent';
    }
  }
}
