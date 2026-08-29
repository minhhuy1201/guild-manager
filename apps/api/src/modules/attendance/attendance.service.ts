import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageGuild, canViewAllAttendance } from '@guild/shared/lib';
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
import { toAttendanceRecord } from './attendance.codec';

/** Message shown when a non-admin marks attendance for someone else's character. */
const NOT_YOUR_CHARACTER = 'Bạn chỉ điểm danh được cho nhân vật của mình.';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Characters for the attendance screen, filtered by the caller's role.
   * Filtered here, not in the UI: hiding it on the web only means DevTools reveals the whole table.
   * @param actor - JWT payload of the caller
   * @returns The whole guild for leaders/admins; only their own character for members
   */
  async getCharacters(actor: JwtPayload): Promise<Character[]> {
    if (canViewAllAttendance(actor.role)) return this.characters.list();

    const own = await this.ownCharacterId(actor);
    if (!own) return [];

    const row = await this.characters.findById(own);

    return row ? [toCharacter(row)] : [];
  }

  /**
   * Attendance entries of the open week, filtered by the caller's role.
   * @param actor - JWT payload of the caller
   * @returns The whole guild for leaders/admins; only their own rows for members
   */
  async getRecords(actor: JwtPayload): Promise<AttendanceRecord[]> {
    const seesEveryone = canViewAllAttendance(actor.role);
    const own = seesEveryone ? null : await this.ownCharacterId(actor);

    if (!seesEveryone && !own) return [];

    const sessions = await this.battleSessions.listByWeek();
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        sessionId: { in: sessions.map((session) => session.id) },
        ...(own === null ? {} : { characterId: own }),
      },
      orderBy: { markedAt: 'desc' },
    });

    return records.map(toAttendanceRecord);
  }

  /**
   * Yes/no tallies per session in the open week.
   * @returns Tallies per session, carrying no identities
   */
  async getSummary(): Promise<AttendanceSummary[]> {
    const sessions = await this.battleSessions.listByWeek();
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
   * Members and leaders may only mark their own character, and only before the deadline. Admins may
   * mark on behalf of others and are not blocked by the deadline (used to fix mistakes after a battle).
   * @param input - characterId, sessionId and isPresent
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
    const { characterId, sessionId, isPresent } = input;
    const isAdmin = canManageGuild(actor.role);

    if (!(await this.characters.exists(characterId))) {
      throw new NotFoundException('Không tìm thấy thành viên.');
    }

    const own = await this.ownCharacterId(actor);
    if (!isAdmin && characterId !== own) {
      throw new ForbiddenException(NOT_YOUR_CHARACTER);
    }

    const session = await this.battleSessions.findById(sessionId);
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

    const record = await this.prisma.attendanceRecord.upsert({
      where: { characterId_sessionId: { characterId, sessionId } },
      create: {
        characterId,
        sessionId,
        isPresent,
        markedAt: now,
        markedByCharacterId: own,
      },
      update: { isPresent, markedAt: now, markedByCharacterId: own },
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
