import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageGuild } from '@guild/shared/lib';
import {
  attendanceSummarySchema,
  type AttendanceRecord,
  type AttendanceSummary,
  type Character,
  type MarkAttendanceInput,
} from '@guild/shared/schemas';

import { Clock, type JwtPayload } from '../../common';
import { verifyResponse } from '../../config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  BattleSessionsService,
  isSameWeek,
  weekStartOf,
} from '../battle-sessions/battle-sessions.public';
import {
  CharactersService,
  toCharacter,
} from '../characters/characters.public';
import { TeamBuilderService } from '../team-builder/team-builder.public';
import { toAttendanceRecord } from './attendance.codec';

/** Message shown when a non-admin marks attendance for someone else's character. */
const NOT_YOUR_CHARACTER = 'Bạn chỉ điểm danh được cho nhân vật của mình.';

/**
 * The reason to persist alongside an answer.
 * A "Có" answer carries no reason, and an empty string is the same state as never having given one,
 * so both collapse to null — decided here rather than trusted from the request body, which keeps one
 * representation of "no reason" in the database.
 * @param isPresent - The answer being written
 * @param reason - Reason from the request body, already trimmed by Zod
 * @returns The reason to store, or null
 */
function resolveReason(
  isPresent: boolean,
  reason: string | null | undefined,
): string | null {
  if (isPresent) return null;

  return reason ? reason : null;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly teamBuilder: TeamBuilderService,
    private readonly clock: Clock,
  ) {}

  /**
   * Characters for the attendance screen — the whole guild, whoever is asking.
   * Attendance is guild-wide information: everyone signed in sees every member, and only the right
   * to *write* an entry still depends on the role.
   * @returns Every character in the guild
   */
  async getCharacters(): Promise<Character[]> {
    // Through `toCharacter`, not `characters.list()`: that one carries the Discord identity, which
    // this screen must not hand out.
    const rows = await this.characters.listRows();

    return rows.map(toCharacter);
  }

  /**
   * Attendance entries of one week — the whole guild's, whoever is asking.
   *
   * The History screen reads past weeks through this, which is why the week is a parameter rather
   * than always the open one: without it, a week rolling over at 22:00 Saturday took the finished
   * week off every member's screen with no way to look it up again.
   *
   * @param weekStart - Any instant inside the week to read; omitted means the open week
   * @returns Every record of that week, newest first
   */
  async getRecords(weekStart?: string): Promise<AttendanceRecord[]> {
    const sessions = await this.battleSessions.listByWeek(weekStart);

    return this.getRecordsForSessions(sessions.map((session) => session.id));
  }

  /**
   * Attendance entries of sessions the caller already holds.
   *
   * Split out of `getRecords` for the caller that has just listed the week itself: `listByWeek`
   * materialises the Guild War, so deriving the week twice meant a second write on every read.
   *
   * @param sessionIds - Sessions to read entries for
   * @returns Their records, newest first
   */
  async getRecordsForSessions(
    sessionIds: string[],
  ): Promise<AttendanceRecord[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { markedAt: 'desc' },
    });

    return records.map(toAttendanceRecord);
  }

  /**
   * Yes/no tallies per session in one week.
   *
   * Takes the week for the same reason `getRecords` does, and deliberately with the same signature:
   * the two answer the same question at different resolutions, so one of them silently pinned to
   * the open week would make a caller that passes a week to both quietly disagree with itself.
   *
   * @param weekStart - Any instant inside the week to read; omitted means the open week
   * @returns Tallies per session of that week, carrying no identities
   */
  async getSummary(weekStart?: string): Promise<AttendanceSummary[]> {
    const sessions = await this.battleSessions.listByWeek(weekStart);
    const grouped = await this.prisma.attendanceRecord.groupBy({
      by: ['sessionId', 'isPresent'],
      where: { sessionId: { in: sessions.map((session) => session.id) } },
      _count: { _all: true },
    });

    return sessions.map((session) => {
      const rows = grouped.filter((row) => row.sessionId === session.id);
      /**
       * Count of one answer in the session under consideration.
       * @param isPresent - Answer to count
       * @returns The count, 0 when nobody gave that answer
       */
      const countOf = (isPresent: boolean): number =>
        rows.find((row) => row.isPresent === isPresent)?._count._all ?? 0;

      return verifyResponse(attendanceSummarySchema, {
        sessionId: session.id,
        coCount: countOf(true),
        khongCount: countOf(false),
      } satisfies AttendanceSummary);
    });
  }

  /**
   * Record attendance for a character in a session.
   * Members may only mark their own character, and only before the deadline. Admins may
   * mark on behalf of others and are not blocked by the deadline (used to fix mistakes after a battle).
   * @param input - characterId, sessionId, isPresent and the optional absence reason, which is
   * stored only for a "Không" answer — a "Có" answer clears it
   * @param actor - JWT payload of the caller
   * @returns The written record
   * @throws NotFoundException when the character or session is not in the open week
   * @throws ForbiddenException when a non-admin marks someone else's character
   * @throws ConflictException when a non-admin marks a session past its deadline
   */
  async mark(
    input: MarkAttendanceInput,
    actor: JwtPayload,
  ): Promise<AttendanceRecord> {
    const now = this.clock.now();
    const { characterId, sessionId, isPresent, reason } = input;
    const isAdmin = canManageGuild(actor.role);

    // Three independent reads, so one round trip rather than three: a Discord button press answers
    // inside the interaction's 3-second window, and this method sits on that path.
    const [characterExists, own, session] = await Promise.all([
      this.characters.exists(characterId),
      this.ownCharacterId(actor),
      this.battleSessions.findById(sessionId),
    ]);

    // The guards stay in their original order — the caller must keep seeing the most specific
    // refusal, not whichever read happened to disqualify first.
    if (!characterExists) {
      throw new NotFoundException('Không tìm thấy thành viên.');
    }

    if (!isAdmin && characterId !== own) {
      throw new ForbiddenException(NOT_YOUR_CHARACTER);
    }

    // Non-admins may only mark the open week; admins may fix other weeks.
    //
    // `findById` returns an entity, so `weekStart` is an ISO string; re-wrapping it through
    // `weekStartOf` keeps the comparison on the same single path as everywhere else.
    const inActiveWeek =
      session !== null &&
      isSameWeek(
        weekStartOf(new Date(session.weekStart)),
        this.battleSessions.getActiveWeek(),
      );
    if (!session || (!isAdmin && !inActiveWeek)) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    // Reuse the flag `findById` just built instead of recomputing it: the deadline rule is
    // evaluated in exactly one place, so the client's flag and the write guard cannot diverge.
    if (!isAdmin && session.isDeadlinePassed) {
      throw new ConflictException('Đã quá hạn điểm danh ngày này.');
    }

    const absenceReason = resolveReason(isPresent, reason);

    // One transaction, because "answered Không" and "still in the day's formation" is a state the
    // comment below says must not exist. As two round trips it could: the answer committed, the
    // release failed on a timeout or an exhausted pool, and the request answered 500 with the
    // formation left untouched and no way to notice but by eye.
    const record = await this.prisma.$transaction(async (tx) => {
      const written = await tx.attendanceRecord.upsert({
        where: { characterId_sessionId: { characterId, sessionId } },
        create: {
          characterId,
          sessionId,
          isPresent,
          markedAt: now,
          markedByCharacterId: own,
          reason: absenceReason,
        },
        update: {
          isPresent,
          markedAt: now,
          markedByCharacterId: own,
          reason: absenceReason,
        },
      });

      // A member who has just said "Không" must not stay in the day's formation: the team builder
      // would otherwise keep showing them as placed until someone notices by hand.
      if (!isPresent) {
        await this.teamBuilder.releaseCharacterFromSession(
          session,
          characterId,
          tx,
        );
      }

      return written;
    });

    return toAttendanceRecord(record);
  }

  /**
   * The character bound to the caller.
   * @param actor - JWT payload of the caller
   * @returns The character id, or null when the account has no character (rescue admin)
   */
  private async ownCharacterId(actor: JwtPayload): Promise<string | null> {
    const member = await this.characters.findByDiscordId(actor.sub);

    return member?.id ?? null;
  }
}
