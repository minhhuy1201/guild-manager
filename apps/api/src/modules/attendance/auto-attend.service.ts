import { Injectable, NotFoundException } from '@nestjs/common';
import type { AutoAttendStatus } from '@guild/shared/schemas';

import { Clock, type RequestActor } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { closingMoment } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { toAutoAttendStatus, toAutoAttendWindow } from './auto-attend.codec';
import type { AutoAttendWindow } from './auto-attend-coverage';
import type { CoverageSession } from './leave-coverage';

const CHARACTER_NOT_FOUND = 'Không tìm thấy thành viên.';

/**
 * Auto-attend: a member's standing "Có" for every battle day still open. It never writes attendance
 * rows - the attendance reads merge it in (see `leave-coverage.ts`) - so turning it on or off only
 * opens or closes a period.
 */
@Injectable()
export class AutoAttendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Where the caller's Auto-attend stands.
   * @param actor - JWT payload of the caller
   * @returns Whether it is on, and since when
   * @throws NotFoundException when the caller has no character (rescue admin)
   */
  async status(actor: RequestActor): Promise<AutoAttendStatus> {
    const characterId = await this.requireCharacterId(actor);
    const running = await this.prisma.autoAttendPeriod.findFirst({
      where: { characterId, disabledAt: null },
    });

    return toAutoAttendStatus(running);
  }

  /**
   * Turn the caller's Auto-attend on or off. Asking for the state it is already in changes nothing.
   * @param actor - JWT payload of the caller
   * @param enabled - The state to end up in
   * @returns The status after the change
   * @throws NotFoundException when the caller has no character (rescue admin)
   */
  async set(actor: RequestActor, enabled: boolean): Promise<AutoAttendStatus> {
    const characterId = await this.requireCharacterId(actor);

    return this.prisma.$transaction(async (tx) => {
      // Serialises switches for one character: the read of the running period and the write after it
      // must not interleave with another switch (web and Discord at the same moment), or two periods
      // end up running. Released at commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${characterId}))`;

      // Read after the lock so the stored moments follow the order the lock serialises: a switch-off
      // that waited behind a switch-on must not stamp a `disabledAt` earlier than that `enabledAt`.
      const now = this.clock.now();

      const running = await tx.autoAttendPeriod.findFirst({
        where: { characterId, disabledAt: null },
      });

      if (enabled) {
        if (running) return toAutoAttendStatus(running);

        const created = await tx.autoAttendPeriod.create({
          data: { characterId, enabledAt: now },
        });

        return toAutoAttendStatus(created);
      }

      if (running) {
        await tx.autoAttendPeriod.update({
          where: { id: running.id },
          data: { disabledAt: now },
        });
      }

      return toAutoAttendStatus(null);
    });
  }

  /**
   * Periods that can cover some of these sessions, ended ones included: a period turned off after a
   * day closed still covers that day.
   * @param sessions - Sessions being read
   * @returns The periods as the coverage rule reads them
   */
  async windowsForSessions(
    sessions: CoverageSession[],
  ): Promise<AutoAttendWindow[]> {
    if (sessions.length === 0) return [];

    const closings = sessions.map((session) =>
      closingMoment(session.deadline, session.attendanceClosedAt).getTime(),
    );
    const rows = await this.prisma.autoAttendPeriod.findMany({
      where: {
        enabledAt: { lt: new Date(Math.max(...closings)) },
        OR: [
          { disabledAt: null },
          { disabledAt: { gte: new Date(Math.min(...closings)) } },
        ],
      },
    });

    return rows.map(toAutoAttendWindow);
  }

  /**
   * The character bound to the caller.
   * @param actor - JWT payload of the caller
   * @returns The character id
   * @throws NotFoundException when the caller has no character (rescue admin)
   */
  private async requireCharacterId(actor: RequestActor): Promise<string> {
    const member = await this.characters.findByDiscordId(actor.sub);
    if (!member) throw new NotFoundException(CHARACTER_NOT_FOUND);

    return member.id;
  }
}
