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

/** What one run did — the cron response body, and what `/nhac-diem-danh` reports back. */
export interface ReminderResult {
  /** Whether a message was actually posted */
  sent: boolean;
  /** Battle days the message covered */
  sessionCount: number;
  /** People mentioned, each counted once however many days they are missing from */
  missingCount: number;
}

/** Nothing to say, in the shape `run` returns. */
const NOTHING: ReminderResult = {
  sent: false,
  sessionCount: 0,
  missingCount: 0,
};

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
   * @returns What the run did
   * @throws Error when Discord rejects the message — the caller decides how loud that is
   */
  async run(): Promise<ReminderResult> {
    const channelId = await this.channels.get();

    if (!channelId) {
      this.logger.warn(
        'Chưa cấu hình channel nhắc điểm danh — chạy /cau-hinh-kenh trong channel muốn dùng.',
      );

      return NOTHING;
    }

    const now = this.clock.now();
    const sessions = await this.battleSessions.listByWeek();
    const dueSessions = sessions.filter((session) =>
      isReminderDay(new Date(session.deadline), now),
    );

    if (dueSessions.length === 0) return NOTHING;

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

    if (due.length === 0) return NOTHING;

    await this.rest.postMessage(
      channelId,
      buildReminder(due, this.config.get('WEB_ORIGIN', { infer: true })),
    );

    return {
      sent: true,
      sessionCount: due.length,
      // By name, not by row: one person missing three days is one person to nudge.
      missingCount: new Set(
        due.flatMap((day) => day.missing.map((member) => member.name)),
      ).size,
    };
  }
}
