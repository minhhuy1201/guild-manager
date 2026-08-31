import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { guildWarDeadline, isWithinDeadlineCap } from '@guild/shared/lib';
import { DEADLINE_CAP_MESSAGE, weekSchema } from '@guild/shared/schemas';
import type {
  BattleSession,
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
  Week,
} from '@guild/shared/schemas';

import { Clock } from '../../common';
import { verifyResponse } from '../../config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toBattleSession } from './battle-sessions.codec';
import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarMatchCount,
  guildWarSessionId,
  isSameWeek,
  parseWeekStart,
  weekStartOf,
  type ScheduledWeek,
  type WeekAnchor,
} from './session-schedule';

/** What must be read alongside each session to build the entity. */
const SESSION_INCLUDE = {
  _count: { select: { attendanceRecords: true, formationMatches: true } },
} as const;

/**
 * The shared filter + ordering clause for every "sessions of a week" query, so the returned order
 * cannot differ between read paths.
 * @param weekStart - Monday marker of the week to read
 * @returns The `where` and `orderBy` for `battleSession.findMany`
 */
const weekSessionQuery = (weekStart: WeekAnchor) =>
  ({
    where: { weekStart },
    orderBy: { dateTime: 'asc' },
  }) as const;

/** A session in the week, label built, without attendance/formation counts. */
export interface ScheduledSession {
  id: string;
  label: string;
  dateTime: Date;
  isGuildWar: boolean;
  opponent: string | null;
}

/**
 * Owns the schedule's lifecycle: generates the Guild War for the open and next week, and serves
 * scrim CRUD to admins. Other modules (attendance, team builder) read the schedule through this
 * service rather than querying the table.
 */
@Injectable()
export class BattleSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /**
   * Monday marker of the open attendance week.
   * Returns a typed marker rather than an ISO string: comparing weeks is `isSameWeek`'s job, not a
   * string comparison at the call site.
   * @returns Monday 00:00 Vietnam time
   */
  getActiveWeek(): WeekAnchor {
    return getActiveWeek(this.clock.now()).weekStart;
  }

  /**
   * The open attendance week.
   * Separate from `getEditableWeeks` because every signed-in user needs this one to read the
   * attendance screen, while the schedulable weeks are an admin's business.
   * @returns The week attendance is currently open for
   */
  getCurrentWeek(): Week {
    return toWeekResponse(getActiveWeek(this.clock.now()), true);
  }

  /**
   * The weeks an admin may schedule: the open week and the next one.
   * @returns Two weeks, the open one first
   */
  getEditableWeeks(): Week[] {
    return getEditableWeeks(this.clock.now()).map((week, index) =>
      toWeekResponse(week, index === 0),
    );
  }

  /**
   * Sessions of one week, ordered by battle time.
   * The open and next week are guaranteed to have their Guild War; past weeks return only what is
   * stored.
   * @param weekStart - ISO marker of the week to view. Omitted = the open week; a mid-week marker resolves to that week's Monday
   * @returns Sessions ordered by battle time
   * @throws RangeError when `weekStart` is not a valid instant — the HTTP boundary blocks it in the DTO, so this only happens on in-process calls
   */
  async listByWeek(weekStart?: string): Promise<BattleSession[]> {
    const now = this.clock.now();
    const target = parseWeekStart(weekStart, now);

    await this.materializeWeek(target, now);

    const rows = await this.prisma.battleSession.findMany({
      ...weekSessionQuery(target),
      include: SESSION_INCLUDE,
    });

    return rows.map((row) => toBattleSession(row, now));
  }

  /**
   * Ensure the week holds every system-generated session (currently the Guild War).
   * A week outside the schedulable range is a no-op, so callers may call unconditionally.
   * @param week - Monday marker of the week to materialise
   * @returns A promise resolving once the week is ready to read
   */
  async ensureWeekMaterialized(week: WeekAnchor): Promise<void> {
    await this.materializeWeek(week, this.clock.now());
  }

  /**
   * Body of `ensureWeekMaterialized`, split out so `listByWeek` can reuse the exact moment it
   * already read instead of reading the clock a second time.
   * @param week - Monday 00:00 marker of the week to materialise
   * @param now - Current moment
   * @returns A promise resolving once the week is ready to read
   */
  private async materializeWeek(week: WeekAnchor, now: Date): Promise<void> {
    if (!this.isEditableWeek(week, now)) return;

    await this.ensureGuildWar(week);
  }

  /**
   * Sessions of one week, ordered by battle time, labels built.
   * Does not generate sessions — call `ensureWeekMaterialized` first if needed.
   * @param week - Monday marker of the week to read
   * @returns Sessions ordered by battle time
   */
  async readWeekSessions(week: WeekAnchor): Promise<ScheduledSession[]> {
    const rows = await this.prisma.battleSession.findMany({
      ...weekSessionQuery(week),
      select: {
        id: true,
        dateTime: true,
        isGuildWar: true,
        opponent: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      label: formatSessionLabel(row.dateTime, row.isGuildWar),
      dateTime: row.dateTime,
      isGuildWar: row.isGuildWar,
      opponent: row.opponent,
    }));
  }

  /**
   * Weeks that still hold schedule data, newest first.
   * Rows in the database are always Monday markers (every write path goes through `weekStartOf`),
   * but they are rebuilt through `weekStartOf` anyway — it is the only valid constructor, and it is
   * the identity on an already-correct marker.
   * @returns Monday markers, newest first
   */
  async listWeekAnchors(): Promise<WeekAnchor[]> {
    const rows = await this.prisma.battleSession.findMany({
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'desc' },
    });

    return rows.map((row) => weekStartOf(row.weekStart));
  }

  /**
   * Read one session by id.
   * @param id - Id of the session
   * @returns The session, or null when it does not exist
   */
  async findById(id: string): Promise<BattleSession | null> {
    const now = this.clock.now();
    const row = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });

    return row ? toBattleSession(row, now) : null;
  }

  /**
   * Create a scrim. Guild Wars cannot be created — the system generates those.
   * @param input - Battle time, deadline and opponent guild name
   * @returns The created session
   * @throws BadRequestException when the session falls outside the schedulable weeks or the deadline exceeds the 10:00 cap on the battle day
   */
  async create(input: CreateBattleSessionInput): Promise<BattleSession> {
    const now = this.clock.now();
    const dateTime = new Date(input.dateTime);
    const deadline = new Date(input.deadline);

    this.assertEditableWeek(weekStartOf(dateTime), now);
    this.assertDeadlineWithinCap(deadline, dateTime);

    const created = await this.prisma.battleSession.create({
      data: {
        dateTime,
        deadline,
        matchCount: input.matchCount,
        opponent: normalizeOpponent(input.opponent),
        isGuildWar: false,
        weekStart: weekStartOf(dateTime),
      },
      include: SESSION_INCLUDE,
    });

    return toBattleSession(created, now);
  }

  /**
   * Edit a session. Moving the battle time into another week updates the `weekStart` of both the
   * session and its formations in one transaction.
   *
   * A Guild War's deadline is owned by the system: sending one is an error, and the stored value is
   * always recomputed from the week containing the session.
   * @param id - Id of the session to edit
   * @param input - Fields to change
   * @returns The updated session
   * @throws NotFoundException when the session no longer exists
   * @throws BadRequestException when the week is not schedulable, the deadline exceeds the cap, or an opponent/deadline is set on a Guild War
   */
  async update(
    id: string,
    input: UpdateBattleSessionInput,
  ): Promise<BattleSession> {
    const now = this.clock.now();
    const current = await this.prisma.battleSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    this.assertEditableWeek(weekStartOf(current.weekStart), now);

    const opponent =
      input.opponent === undefined
        ? current.opponent
        : normalizeOpponent(input.opponent);
    if (current.isGuildWar && opponent !== null) {
      throw new BadRequestException('Trận Bang Chiến không có đối thủ.');
    }
    if (current.isGuildWar && input.deadline !== undefined) {
      throw new BadRequestException(
        'Hạn chót của trận Bang Chiến cố định 17:00 Thứ 5, không sửa được.',
      );
    }
    if (current.isGuildWar && input.matchCount !== undefined) {
      throw new BadRequestException(
        'Số trận của Bang Chiến do hệ thống tính theo tuần, không sửa được.',
      );
    }

    const dateTime = input.dateTime
      ? new Date(input.dateTime)
      : current.dateTime;
    const weekStart = weekStartOf(dateTime);

    this.assertEditableWeek(weekStart, now);

    // Guild War: the system recomputes it from the week now containing the session, even if the
    // session was just moved. Scrim: merge the incoming values with the stored row.
    let deadline = guildWarDeadline(weekStart);

    if (!current.isGuildWar) {
      deadline = input.deadline ? new Date(input.deadline) : current.deadline;
      this.assertDeadlineWithinCap(deadline, dateTime);
    }

    // A Guild War's match count follows the week it now sits in, exactly like its deadline.
    const matchCount = current.isGuildWar
      ? guildWarMatchCount(weekStart)
      : (input.matchCount ?? current.matchCount);

    // One transaction, not two statements: between them the day would claim one match while still
    // holding two formations — the very state `saveFormation` refuses.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (matchCount < current.matchCount) {
        await tx.formationMatch.deleteMany({
          where: { sessionId: id, matchIndex: { gt: matchCount } },
        });
      }

      return tx.battleSession.update({
        where: { id },
        data: { dateTime, deadline, opponent, weekStart, matchCount },
        include: SESSION_INCLUDE,
      });
    });

    return toBattleSession(updated, now);
  }

  /**
   * Delete a scrim. Its attendance and formations go with it (cascade).
   * @param id - Id of the session to delete
   * @returns A promise resolving once it is deleted
   * @throws NotFoundException when the session no longer exists
   * @throws BadRequestException when it is a Guild War or belongs to a past week
   */
  async remove(id: string): Promise<void> {
    const now = this.clock.now();
    const current = await this.prisma.battleSession.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }
    if (current.isGuildWar) {
      throw new BadRequestException('Không thể xoá trận Bang Chiến.');
    }

    this.assertEditableWeek(weekStartOf(current.weekStart), now);

    await this.prisma.battleSession.delete({ where: { id } });
  }

  /**
   * Ensure the week has its Guild War. Idempotent thanks to the deterministic id.
   * @param weekStart - Monday 00:00 marker of the week
   * @returns A promise resolving once the session exists
   */
  private async ensureGuildWar(weekStart: WeekAnchor): Promise<void> {
    const dateTime = guildWarDateTime(weekStart);
    const matchCount = guildWarMatchCount(weekStart);

    await this.prisma.battleSession.upsert({
      where: { id: guildWarSessionId(weekStart) },
      create: {
        id: guildWarSessionId(weekStart),
        weekStart,
        dateTime,
        deadline: guildWarDeadline(weekStart),
        matchCount,
        isGuildWar: true,
      },
      // The battle time is left alone — an admin may have moved it. The deadline and the match
      // count are the opposite: the system owns both, so a legacy row breaking either rule
      // corrects itself.
      update: { deadline: guildWarDeadline(weekStart), matchCount },
    });
  }

  /**
   * Whether this week is within the range admins may schedule.
   * @param weekStart - Monday 00:00 marker of the week
   * @param now - Current moment
   * @returns true for the open week or the next one
   */
  private isEditableWeek(weekStart: WeekAnchor, now: Date): boolean {
    return getEditableWeeks(now).some((week) =>
      isSameWeek(week.weekStart, weekStart),
    );
  }

  /**
   * Reject an operation on a week outside the schedulable range.
   * @param weekStart - Monday marker of the week
   * @param now - Current moment
   * @returns Nothing when valid
   * @throws BadRequestException when the week is past or too far ahead
   */
  private assertEditableWeek(weekStart: WeekAnchor, now: Date): void {
    if (!this.isEditableWeek(weekStart, now)) {
      throw new BadRequestException(
        'Chỉ thiết lập được lịch của tuần này và tuần sau.',
      );
    }
  }

  /**
   * Reject a deadline beyond the cap: 10:00 on the battle day, and never later than the battle.
   * @param deadline - Attendance deadline
   * @param dateTime - Battle time
   * @returns Nothing when valid
   * @throws BadRequestException when the deadline is past the cap
   */
  private assertDeadlineWithinCap(deadline: Date, dateTime: Date): void {
    if (!isWithinDeadlineCap(deadline, dateTime)) {
      throw new BadRequestException(DEADLINE_CAP_MESSAGE);
    }
  }
}

/**
 * Normalise the opponent guild name: trim both ends, an empty string means none.
 * @param value - The submitted value (undefined = unchanged)
 * @returns The normalised name, or null
 */
function normalizeOpponent(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

/**
 * Turn a scheduled week into the object returned to the client.
 * @param week - Week computed by `session-schedule`
 * @param isActive - Whether this is the open attendance week
 * @returns The contract-shaped week, times as ISO strings
 */
function toWeekResponse(week: ScheduledWeek, isActive: boolean): Week {
  return verifyResponse(weekSchema, {
    weekStart: week.weekStart.toISOString(),
    weekEnd: week.weekEnd.toISOString(),
    isActive,
  } satisfies Week);
}
