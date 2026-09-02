import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Clock } from '../../common';
import type { Env } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import {
  BattleSessionsService,
  isReminderDay,
} from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { BotChannelService } from './bot-channel.service';
import { DiscordRestClient } from './discord-rest';
import { buildReminder, type DueSession } from './reminder';

/**
 * What one run did — the cron response body, and what `/nhac-diem-danh` reports back.
 *
 * A tagged union rather than `{ sent: boolean }`, because the two ways of sending nothing are not
 * the same event: `no-channel` is waiting on an admin, `nothing-due` is the ordinary quiet morning.
 * Collapsing them left the caller unable to tell which had happened, so `/nhac-diem-danh` had to
 * re-read the channel itself just to pick its wording, and the cron response could not say why it
 * stayed silent.
 */
export type ReminderOutcome =
  | {
      status: 'sent';
      /** Battle days the message covered */
      sessionCount: number;
      /** People mentioned, each counted once however many days they are missing from */
      missingCount: number;
    }
  /** No channel configured yet — an admin has not run `/cau-hinh-kenh`. */
  | { status: 'no-channel' }
  /** Nothing closes tomorrow, or everyone whose deadline does has already answered. */
  | { status: 'nothing-due' };

/**
 * Finds who still has not answered for a deadline falling tomorrow, and says so in Discord.
 *
 * Both the cron endpoint and `/nhac-diem-danh` call `run`: a scheduled reminder and a hand-run one
 * must not be able to disagree about who is missing.
 */
@Injectable()
export class ReminderService {
  constructor(
    private readonly battleSessions: BattleSessionsService,
    private readonly attendance: AttendanceService,
    private readonly characters: CharactersService,
    private readonly channels: BotChannelService,
    private readonly rest: DiscordRestClient,
    private readonly clock: Clock,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private readonly logger = new Logger(ReminderService.name);

  /**
   * Post the reminder, if there is anything to remind about.
   *
   * Silence is a normal outcome, not a failure: no deadline falls tomorrow, or everyone whose
   * deadline does has already answered. A daily "nothing today" is the fastest way to get a channel
   * muted.
   *
   * @returns What the run did, tagged so the caller can tell the two silences apart
   * @throws Error when Discord rejects the message — the caller decides how loud that is
   */
  async run(): Promise<ReminderOutcome> {
    const channelId = await this.channels.get();

    if (!channelId) {
      this.logger.warn(
        'Chưa cấu hình channel nhắc điểm danh — chạy /cau-hinh-kenh trong channel muốn dùng.',
      );

      return { status: 'no-channel' };
    }

    const now = this.clock.now();
    const sessions = await this.battleSessions.listByWeek();
    const dueSessions = sessions.filter((session) =>
      isReminderDay(new Date(session.deadline), now),
    );

    if (dueSessions.length === 0) return { status: 'nothing-due' };

    const [members, records] = await Promise.all([
      this.characters.listRows(),
      this.attendance.getRecords(),
    ]);

    const due: DueSession[] = dueSessions
      .map((session) => ({
        session,
        // A record existing is the whole test: answering "Không" is answering.
        missing: members
          .filter(
            (member) =>
              !records.some(
                (record) =>
                  record.sessionId === session.id &&
                  record.characterId === member.id,
              ),
          )
          .map((member) => ({
            name: member.name,
            discordId: member.discordId,
          })),
      }))
      .filter((day) => day.missing.length > 0);

    if (due.length === 0) return { status: 'nothing-due' };

    await this.rest.postMessage(
      channelId,
      buildReminder(due, this.config.get('WEB_ORIGIN', { infer: true })),
    );

    return {
      status: 'sent',
      sessionCount: due.length,
      // By name, not by row: one person missing three days is one person to nudge.
      missingCount: new Set(
        due.flatMap((day) => day.missing.map((member) => member.name)),
      ).size,
    };
  }
}
