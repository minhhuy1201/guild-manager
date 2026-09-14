import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { assertNever, Clock } from '../../common';
import type { Env } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import {
  BattleSessionsService,
  isDeadlinePassed,
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
  /** Nothing in the scope is due, or everyone has already answered for what is. */
  | { status: 'nothing-due' };

/**
 * Which deadlines one run looks at.
 *
 * `today` is the daily rule the cron follows (`isReminderDay`). `week` is every deadline of the open
 * week still ahead: an admin who wants to nudge on Monday for a Wednesday match would otherwise have
 * to wait until the morning `today` reaches it.
 */
export type ReminderScope = 'today' | 'week';

/**
 * Whether a deadline belongs in a run of the given scope.
 *
 * A passed deadline is out in every scope: a reminder day can be the deadline's own day, so a
 * hand-run `/nhac-diem-danh` in the afternoon would otherwise ping people who can no longer answer.
 *
 * @param deadline - The session's attendance deadline
 * @param now - The current instant
 * @param scope - Which deadlines the run looks at
 * @returns true when the session should be reminded about in this run
 */
function isDue(deadline: Date, now: Date, scope: ReminderScope): boolean {
  if (isDeadlinePassed(deadline, now)) return false;

  switch (scope) {
    case 'today':
      return isReminderDay(deadline, now);

    case 'week':
      return true;

    default:
      return assertNever(scope, 'Phạm vi nhắc điểm danh ngoài dự kiến');
  }
}

/**
 * Key identifying one person's answer for one battle day.
 *
 * `:` is safe as the separator: a Character id is a slug (`meo-beo-k7ma3x`) and a BattleSession id is
 * `gw-<YYYY-MM-DD>` or a cuid, so no two pairs can compose the same key.
 *
 * @param sessionId - Battle day the answer belongs to
 * @param characterId - Person who answered
 * @returns The composed key
 */
function answerKey(sessionId: string, characterId: string): string {
  return `${sessionId}:${characterId}`;
}

/**
 * Finds who still has not answered for a deadline due for a reminder, and says so in Discord.
 *
 * Both the cron endpoint and `/nhac-diem-danh` call `run`: a scheduled reminder and a hand-run one
 * must not be able to disagree about who is missing. They may differ only in which deadlines they
 * look at, and that is the explicit `scope` argument.
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
   * Silence is a normal outcome, not a failure: no deadline in the scope is due, or everyone has
   * already answered for the ones that are. A daily "nothing today" is the fastest way to get a
   * channel muted.
   *
   * @param scope - Which deadlines to look at: `today` for the daily rule, `week` for every open one
   * @returns What the run did, tagged so the caller can tell the two silences apart
   * @throws Error when Discord rejects the message — the caller decides how loud that is
   */
  async run(scope: ReminderScope): Promise<ReminderOutcome> {
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
      isDue(new Date(session.deadline), now, scope),
    );

    if (dueSessions.length === 0) return { status: 'nothing-due' };

    const [members, records] = await Promise.all([
      this.characters.listRows(),
      // Not `getRecords()`, which would derive the week a second time — and materialising it writes.
      // The whole week, not just `dueSessions`: narrowing what is read is a separate change.
      this.attendance.getRecordsForSessions(
        sessions.map((session) => session.id),
      ),
    ]);

    // A record existing is the whole test: answering "Không" is answering. The set holds the pair
    // and nothing else, so `isPresent` cannot creep into that rule.
    const answered = new Set(
      records.map((record) => answerKey(record.sessionId, record.characterId)),
    );

    const due: DueSession[] = dueSessions
      .map((session) => ({
        session,
        missing: members
          .filter((member) => !answered.has(answerKey(session.id, member.id)))
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
