import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  formationWeekSchema,
  sessionFormationSchema,
  teamNamesSchema,
} from '@guild/shared/schemas';
import type {
  FormationWeek,
  MatchFormation,
  MatchInput,
  SessionFormation,
  TeamNames,
} from '@guild/shared/schemas';

import { Clock } from '../../common';
import { verifyResponse } from '../../config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  BattleSessionsService,
  isSameWeek,
  isSessionLocked,
  parseWeekStart,
  weekEndOf,
} from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { decodeMatch, encodeMatch } from './formation-grid';

/** Prisma error code for a foreign key violation (here, a slot pointing at a deleted member). */
const FOREIGN_KEY_VIOLATION = 'P2003';

/** How many days old formations are kept. Past that they are purged. */
const RETENTION_DAYS = 56;

/** Milliseconds in a day. */
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TeamBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * List the weeks that still hold formation data, newest first.
   * Read-only — retention runs on the write path (`saveFormation`), not here.
   * @returns Weeks, newest first, the open week flagged isActive
   */
  async getWeeks(): Promise<FormationWeek[]> {
    const activeWeek = this.battleSessions.getActiveWeek();

    // Materialise first, read second: the open week needs its sessions to show up here.
    await this.battleSessions.ensureWeekMaterialized(activeWeek);

    const anchors = await this.battleSessions.listWeekAnchors();

    return anchors.map((anchor) =>
      verifyResponse(formationWeekSchema, {
        weekStart: anchor.toISOString(),
        weekEnd: weekEndOf(anchor).toISOString(),
        isActive: isSameWeek(anchor, activeWeek),
      } satisfies FormationWeek),
    );
  }

  /**
   * Delete formations older than RETENTION_DAYS.
   * Formations only — BattleSession and attendance belong to other modules.
   * The repo has no scheduler, so `saveFormation` calls this; it stays public so a cron or an ops
   * command can call it later without going through the write path.
   * @param now - Current moment
   * @returns Number of deleted records
   */
  async purgeExpiredFormations(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

    const { count } = await this.prisma.formationMatch.deleteMany({
      where: { session: { weekStart: { lt: cutoff } } },
    });

    return count;
  }

  /**
   * Sessions of one week with their saved formations.
   * @param weekStart - ISO marker of the week to view. Omitted = the open week; a mid-week marker resolves to that week's Monday
   * @returns Battle days ordered by time, each with its matches' formations and a locked flag
   * @throws RangeError when `weekStart` is not a valid instant — the HTTP boundary blocks it in the DTO, so this only happens on in-process calls
   */
  async getFormations(weekStart?: string): Promise<SessionFormation[]> {
    const now = this.clock.now();
    const target = parseWeekStart(weekStart, now);

    await this.battleSessions.ensureWeekMaterialized(target);

    const sessions = await this.battleSessions.readWeekSessions(target);
    if (sessions.length === 0) return [];

    const matchesBySession = await this.loadMatchesBySession(
      sessions.map((session) => session.id),
    );

    return sessions.map((session) =>
      verifyResponse(sessionFormationSchema, {
        sessionId: session.id,
        label: session.label,
        opponent: session.opponent,
        dateTime: session.dateTime.toISOString(),
        isGuildWar: session.isGuildWar,
        locked: isSessionLocked(session.dateTime, now),
        matches: matchesBySession.get(session.id) ?? [],
      } satisfies SessionFormation),
    );
  }

  /**
   * Read the saved formations of several battle days, grouped by sessionId.
   * @param sessionIds - Ids of the battle days to read
   * @returns A map from sessionId to formations in match 1 → match 2 order
   */
  private async loadMatchesBySession(
    sessionIds: string[],
  ): Promise<Map<string, MatchFormation[]>> {
    const matches = await this.prisma.formationMatch.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { matchIndex: 'asc' },
      include: { slots: true },
    });

    const grouped = new Map<string, MatchFormation[]>();

    for (const match of matches) {
      grouped.set(match.sessionId, [
        ...(grouped.get(match.sessionId) ?? []),
        decodeMatch(match.slots),
      ]);
    }

    return grouped;
  }

  /**
   * Overwrite the WHOLE day's formation. Idempotent — sending the same payload repeatedly gives the
   * same result. Delete-then-recreate rather than diffing slot by slot: ~120 rows at most, and it
   * makes "drop match 2" just a one-element array instead of a dedicated endpoint.
   * @param sessionId - Id of the battle day whose formation is saved
   * @param matches - Each match's formation and notes, in match 1 → match 2 order
   * @returns The battle day with the formation just written
   * @throws NotFoundException when no battle day carries that sessionId
   * @throws ConflictException when the battle day is past its battle time, or when a member is deleted
   *   mid-write and the foreign key breaks
   */
  async saveFormation(
    sessionId: string,
    matches: MatchInput[],
  ): Promise<SessionFormation> {
    const now = this.clock.now();
    const session = await this.battleSessions.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    const dateTime = new Date(session.dateTime);
    if (isSessionLocked(dateTime, now)) {
      throw new ConflictException('Trận này đã đánh xong, không sửa được nữa.');
    }

    // Retention runs on the WRITE path, not the read path: data only grows when someone saves, and
    // `GET` must stay read-only. It runs BEFORE the transaction so a failing `deleteMany` cannot turn
    // a successful save into a 500. The two sets are disjoint — purge filters weeks older than 56
    // days, and here the session is certainly unplayed — so this order cannot delete what was just written.
    await this.purgeExpiredFormations(now);

    const savedMatches = await this.prisma
      .$transaction(async (tx) => {
        // Filter BEFORE writing: a character just removed from the guild but still in the draft would
        // break the whole insert on its foreign key. That slot's note is kept — a note describes the
        // position, not the person.
        // Read through `tx`, not the outer client: it narrows the window between the filter and the
        // insert to within one transaction. Under READ COMMITTED this is not an absolute guarantee —
        // a DELETE committing at just the wrong moment still breaks the foreign key — but reading
        // outside the transaction would widen that window to the whole request.
        const knownIds = await this.characters.listIds(tx);
        const cleaned: MatchFormation[] = matches.map((match) => ({
          slots: Object.fromEntries(
            Object.entries(match.slots).filter(([, characterId]) =>
              knownIds.has(characterId),
            ),
          ),
          notes: match.notes,
        }));

        await tx.formationMatch.deleteMany({ where: { sessionId } });

        for (const [index, match] of cleaned.entries()) {
          await tx.formationMatch.create({
            data: {
              sessionId,
              matchIndex: index + 1,
              slots: { create: encodeMatch(match) },
            },
          });
        }

        return cleaned;
      })
      .catch((error: unknown) => {
        // The filter above narrows the window but cannot close it: READ COMMITTED does not lock the
        // rows read, so a DELETE committing after `listIds` still breaks the insert's foreign key.
        // Turn it into a readable message instead of a 500 — the right move is to reload and save again.
        if (isForeignKeyViolation(error)) {
          throw new ConflictException(
            'Có thành viên vừa bị xoá khỏi bang, vui lòng tải lại trang rồi lưu lại.',
          );
        }

        throw error;
      });

    return verifyResponse(sessionFormationSchema, {
      sessionId: session.id,
      label: session.label,
      opponent: session.opponent,
      dateTime: session.dateTime,
      isGuildWar: session.isGuildWar,
      locked: isSessionLocked(dateTime, now),
      matches: savedMatches,
    } satisfies SessionFormation);
  }

  /**
   * The team names shown on the formation grid's column headers.
   * Global data: one map for the whole app, not one per week or per battle day.
   * @returns Team number (as a decimal string) → name; teams still on their number are absent
   */
  async getTeamNames(): Promise<TeamNames> {
    const rows = await this.prisma.teamName.findMany({
      orderBy: { team: 'asc' },
    });

    return verifyResponse(
      teamNamesSchema,
      Object.fromEntries(
        rows.map((row) => [String(row.team), row.name]),
      ) satisfies TeamNames,
    );
  }

  /**
   * Overwrite the WHOLE team name map. Delete-then-recreate for the same reason `saveFormation`
   * does it: ten rows at most, and clearing a name back to its plain number becomes a missing key
   * rather than a dedicated endpoint.
   * Not guarded by a session lock — the names are global configuration and belong to no battle day,
   * so a played battle never freezes them.
   * @param names - Team number (as a decimal string) → name; a team left out loses its name
   * @returns The map just written
   */
  async saveTeamNames(names: TeamNames): Promise<TeamNames> {
    const rows = Object.entries(names).map(([team, name]) => ({
      team: Number(team),
      name,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.teamName.deleteMany({});
      if (rows.length > 0) await tx.teamName.createMany({ data: rows });
    });

    return verifyResponse(teamNamesSchema, names satisfies TeamNames);
  }
}

/**
 * Whether this error is a Prisma foreign key violation.
 * @param error - The caught error
 * @returns true for P2003
 */
function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === FOREIGN_KEY_VIOLATION
  );
}
