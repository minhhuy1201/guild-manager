import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BattleSession } from '@guild/shared/schemas';

import { Clock } from '../../common';
import type { Env } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import {
  BattleSessionsService,
  isDueForReminder,
  type ReminderScope,
} from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { BotChannelService } from './bot-channel.service';
import { DiscordRestClient } from './discord-rest';
import { DmSenderService } from './dm-sender.service';
import { buildReminder } from './reminder';
import {
  hasUndelivered,
  reminderFailureText,
  reminderUndeliveredText,
  type UndeliveredGroups,
} from './reminder-alert';

/**
 * What one run did - the cron response body, and what `/nhac-diem-danh` reports back.
 *
 * A tagged union rather than `{ sent: boolean }`, because `nothing-due` is the ordinary quiet
 * morning while `sent` may still carry people who could not be reached.
 */
export type ReminderOutcome =
  | ({
      status: 'sent';
      /** Battle days the reminders covered */
      sessionCount: number;
      /** People who had to be reminded, each counted once however many days they are missing from */
      missingCount: number;
      /** How many of them received their reminder */
      deliveredCount: number;
    } & UndeliveredGroups)
  /** Nothing in the scope is due, or everyone has already answered for what is. */
  | { status: 'nothing-due' };

/** One member and the battle days they have not answered for. */
interface MemberReminder {
  name: string;
  discordId: string | null;
  sessions: BattleSession[];
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
 * Finds who still has not answered for a deadline due for a reminder, and DMs each of them once.
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
    private readonly dmSender: DmSenderService,
    private readonly clock: Clock,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private readonly logger = new Logger(ReminderService.name);

  /**
   * The cron's run: `run('today')`, plus a post in the admin channel when it threw or when someone
   * could not be reached. A clean run stays silent. The error is rethrown so Vercel still records
   * the run as failed. `/nhac-diem-danh` keeps calling `run`: the admin already reads the outcome
   * in chat.
   *
   * @returns What the run did
   * @throws The error `run` threw, unchanged
   */
  async runScheduled(): Promise<ReminderOutcome> {
    let outcome: ReminderOutcome;
    try {
      outcome = await this.run('today');
    } catch (error) {
      await this.alert(reminderFailureText());
      throw error;
    }

    if (outcome.status === 'sent' && hasUndelivered(outcome)) {
      await this.alert(reminderUndeliveredText(outcome));
    }

    return outcome;
  }

  /**
   * DM every member who has not answered for a due day, one message each covering all their days.
   *
   * Silence is a normal outcome, not a failure: no deadline in the scope is due, or everyone has
   * already answered for the ones that are.
   *
   * @param scope - Which deadlines to look at: `today` for the daily rule, `week` for every open one
   * @returns What the run did, including who could not be reached
   */
  async run(scope: ReminderScope): Promise<ReminderOutcome> {
    const now = this.clock.now();
    const sessions = await this.battleSessions.listByWeek();
    const dueSessions = sessions.filter((session) =>
      isDueForReminder(
        new Date(session.deadline),
        session.isAttendanceClosed,
        now,
        scope,
      ),
    );

    if (dueSessions.length === 0) return { status: 'nothing-due' };

    const [members, records] = await Promise.all([
      this.characters.listRows(),
      // Not `getRecords()`, which would derive the week a second time - and materialising it writes.
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

    const reminders: MemberReminder[] = members
      .map((member) => ({
        name: member.name,
        discordId: member.discordId,
        sessions: dueSessions.filter(
          (session) => !answered.has(answerKey(session.id, member.id)),
        ),
      }))
      .filter((reminder) => reminder.sessions.length > 0);

    if (reminders.length === 0) return { status: 'nothing-due' };

    const groups = await this.deliver(reminders);

    return {
      status: 'sent',
      sessionCount: new Set(
        reminders.flatMap((reminder) =>
          reminder.sessions.map((session) => session.id),
        ),
      ).size,
      missingCount: reminders.length,
      deliveredCount:
        reminders.length -
        groups.unlinked.length -
        groups.blocked.length -
        groups.unsent.length,
      ...groups,
    };
  }

  /**
   * Send each linked member their reminder and sort everyone who did not get one.
   * @param reminders - Who to remind and for which days
   * @returns The names of the people who could not be reached, by reason
   */
  private async deliver(
    reminders: readonly MemberReminder[],
  ): Promise<UndeliveredGroups> {
    const webOrigin = this.config.get('WEB_ORIGIN', { infer: true });
    const groups: UndeliveredGroups = { unlinked: [], blocked: [], unsent: [] };
    const linked: {
      name: string;
      discordId: string;
      sessions: BattleSession[];
    }[] = [];

    for (const reminder of reminders) {
      if (reminder.discordId === null) {
        groups.unlinked.push(reminder.name);
        continue;
      }

      linked.push({ ...reminder, discordId: reminder.discordId });
    }

    const results = await this.dmSender.sendAll(
      linked.map((member) => ({
        discordId: member.discordId,
        payload: buildReminder(member.sessions, webOrigin),
      })),
    );

    linked.forEach((member, index) => {
      const result = results[index];

      if (result === 'blocked') groups.blocked.push(member.name);
      else if (result === 'unsent') groups.unsent.push(member.name);
    });

    return groups;
  }

  /**
   * Post one line to the admin channel. Never throws: the run's own failure is what must reach
   * Vercel, and a failing alert must not replace it.
   * @param content - The message to post
   */
  private async alert(content: string): Promise<void> {
    try {
      const channelId = await this.channels.get('ADMIN_ALERT');
      if (!channelId) {
        this.logger.warn(
          'Chưa cấu hình channel cảnh báo admin - chạy /cau-hinh-kenh với mục đích "Cảnh báo admin".',
        );

        return;
      }
      await this.rest.postMessage(channelId, { content });
    } catch (error) {
      // Swallowed: see above. The log is the only place left to say it.
      this.logger.error('Không gửi được tin cảnh báo admin', error as Error);
    }
  }
}
