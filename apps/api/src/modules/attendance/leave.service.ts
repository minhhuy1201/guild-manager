import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canManageGuild, vnDateKey } from '@guild/shared/lib';
import type { CreateLeaveInput, Leave } from '@guild/shared/schemas';

import { Clock, type JwtPayload } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { TeamBuilderService } from '../team-builder/team-builder.public';
import { fromDateKey, toLeave, toLeaveWindow } from './leave.codec';
import {
  isLeaveCovering,
  type CoverageSession,
  type LeaveWindow,
} from './leave-coverage';

const CHARACTER_NOT_FOUND = 'Không tìm thấy thành viên.';
const NOT_YOUR_CHARACTER = 'Bạn chỉ khai nghỉ được cho nhân vật của mình.';
const LEAVE_ENDED = 'Ngày kết thúc đã qua.';
const LEAVE_NOT_FOUND = 'Không tìm thấy lần nghỉ.';
const NOT_YOUR_LEAVE = 'Bạn chỉ hủy được lần nghỉ của mình.';

/**
 * `YYYY-MM-DD` as `dd/mm` for a message.
 * @param key - Calendar day
 * @returns The day and month
 */
function dayMonth(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

/**
 * Leaves: a member's declared stretch of days away. A leave never writes attendance rows - the
 * attendance reads merge it in (see `leave-coverage.ts`) - but filing one clears the answers and
 * line-up slots it overrides.
 */
@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly teamBuilder: TeamBuilderService,
    private readonly clock: Clock,
  ) {}

  /**
   * Uncancelled leaves that have not ended yet, guild-wide.
   * @returns Leaves soonest first
   */
  async listActive(): Promise<Leave[]> {
    return this.readActive({});
  }

  /**
   * Uncancelled leaves of one character that have not ended yet - for `/huy-nghi-phep` and the web banner.
   * @param characterId - Whose leaves
   * @returns Leaves soonest first
   */
  async listActiveFor(characterId: string): Promise<Leave[]> {
    return this.readActive({ characterId });
  }

  /**
   * Leaves overlapping the days of some sessions, cancelled ones included: a cancelled leave still
   * covers the days that closed before it was cancelled.
   * @param sessions - Sessions being read
   * @returns The leaves as the coverage rule reads them
   */
  async windowsForSessions(
    sessions: CoverageSession[],
  ): Promise<LeaveWindow[]> {
    if (sessions.length === 0) return [];

    const days = sessions
      .map((session) => vnDateKey(session.dateTime))
      .sort((a, b) => a.localeCompare(b));
    const rows = await this.prisma.leave.findMany({
      where: {
        startDate: { lte: fromDateKey(days[days.length - 1]) },
        endDate: { gte: fromDateKey(days[0]) },
      },
      // Two leaves can cover one cell (a cancelled one still covers days that closed before it);
      // newest first makes the one the cell reads deterministic.
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toLeaveWindow);
  }

  /**
   * File a leave, and clear what it overrides: the answer and the line-up slot of every covered day.
   * @param input - Who, which days and why
   * @param actor - JWT payload of the caller
   * @returns The created leave
   * @throws NotFoundException when the character does not exist
   * @throws ForbiddenException when a member files for somebody else
   * @throws BadRequestException when a member's leave already ended
   * @throws ConflictException when it overlaps an active leave of the same character
   */
  async create(input: CreateLeaveInput, actor: JwtPayload): Promise<Leave> {
    const now = this.clock.now();
    const { characterId, startDate, endDate, reason } = input;
    const isAdmin = canManageGuild(actor.role);

    const [characterExists, own] = await Promise.all([
      this.characters.exists(characterId),
      this.ownCharacterId(actor),
    ]);
    if (!characterExists) throw new NotFoundException(CHARACTER_NOT_FOUND);
    if (!isAdmin && characterId !== own) {
      throw new ForbiddenException(NOT_YOUR_CHARACTER);
    }
    if (!isAdmin && endDate < vnDateKey(now)) {
      throw new BadRequestException(LEAVE_ENDED);
    }

    const sessions = await this.battleSessions.readCoverageInRange(
      startDate,
      endDate,
    );

    return this.prisma.$transaction(async (tx) => {
      // Serialises filings for one character: the overlap read below and the insert after it must
      // not interleave with another filing, or both pass the check. Released at commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${characterId}))`;

      const active = await tx.leave.findMany({
        where: { characterId, cancelledAt: null },
      });
      const clash = active
        .map(toLeaveWindow)
        .find(
          (other) => other.startDate <= endDate && other.endDate >= startDate,
        );
      if (clash) {
        throw new ConflictException(
          `Khoảng nghỉ trùng với lần nghỉ ${dayMonth(clash.startDate)} - ${dayMonth(clash.endDate)}.`,
        );
      }

      const created = await tx.leave.create({
        data: {
          characterId,
          startDate: fromDateKey(startDate),
          endDate: fromDateKey(endDate),
          reason: reason ? reason : null,
          createdAt: now,
          createdByCharacterId: own,
          createdByAdmin: isAdmin,
          cancelledByAdmin: false,
        },
      });

      // The same rule the reads use, so what gets cleared is exactly what will read as "Không".
      const window = toLeaveWindow(created);
      const covered = sessions.filter((session) =>
        isLeaveCovering(window, session),
      );

      await tx.attendanceRecord.deleteMany({
        where: { characterId, sessionId: { in: covered.map((s) => s.id) } },
      });
      for (const session of covered) {
        await this.teamBuilder.releaseCharacterFromSession(
          { id: session.id, dateTime: session.dateTime.toISOString() },
          characterId,
          tx,
        );
      }

      return toLeave(created);
    });
  }

  /**
   * Cancel a leave. The row is kept with a timestamp so days that closed before it stay "Không".
   * @param id - Leave to cancel
   * @param actor - JWT payload of the caller
   * @returns The leave; unchanged when it was already cancelled
   * @throws NotFoundException when no such leave exists
   * @throws ForbiddenException when a member cancels somebody else's leave
   */
  async cancel(id: string, actor: JwtPayload): Promise<Leave> {
    const [found, own] = await Promise.all([
      this.prisma.leave.findUnique({ where: { id } }),
      this.ownCharacterId(actor),
    ]);
    if (!found) throw new NotFoundException(LEAVE_NOT_FOUND);

    const isAdmin = canManageGuild(actor.role);
    if (!isAdmin && found.characterId !== own) {
      throw new ForbiddenException(NOT_YOUR_LEAVE);
    }
    if (found.cancelledAt) return toLeave(found);

    const cancelled = await this.prisma.leave.update({
      where: { id },
      data: {
        cancelledAt: this.clock.now(),
        cancelledByCharacterId: own,
        cancelledByAdmin: isAdmin,
      },
    });

    return toLeave(cancelled);
  }

  private async readActive(filter: { characterId?: string }): Promise<Leave[]> {
    const rows = await this.prisma.leave.findMany({
      where: {
        ...filter,
        cancelledAt: null,
        endDate: { gte: fromDateKey(vnDateKey(this.clock.now())) },
      },
      orderBy: { startDate: 'asc' },
    });

    return rows.map(toLeave);
  }

  /**
   * The character bound to the caller.
   * @param actor - JWT payload of the caller
   * @returns The character id, or null for an account without a character (rescue admin)
   */
  private async ownCharacterId(actor: JwtPayload): Promise<string | null> {
    const member = await this.characters.findByDiscordId(actor.sub);

    return member?.id ?? null;
  }
}
