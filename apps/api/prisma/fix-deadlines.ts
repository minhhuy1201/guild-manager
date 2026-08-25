import { PrismaPg } from '@prisma/adapter-pg';

import { deadlineCapFor, guildWarDeadline } from '@guild/shared/lib';

import { PrismaClient } from '../src/generated/prisma/client';
import { getEditableWeeks } from '../src/modules/battle-sessions/session-schedule';
import { loadPrismaEnv } from './load-env';

/**
 * ONE-OFF manual script bringing legacy deadlines back within the cap rule
 * (see docs/custom-spec/2026-08-18-deadline-cap-design.md):
 *
 *   PRISMA_ENV_FILE=.env.production pnpm --filter api db:fix-deadlines
 *
 * Touches only the open week and the next one — past weeks are history, no longer editable, and
 * their deadlines are display-only.
 *
 * This is the only place the project clamps a deadline; the standing rule rejects the request
 * instead of silently fixing it.
 */
async function main(): Promise<void> {
  const envFile = loadPrismaEnv();
  const connectionString =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      `Thiếu DATABASE_URL — kiểm tra file "${envFile}" của apps/api.`,
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const weekStarts = getEditableWeeks(new Date()).map(
      (week) => week.weekStart,
    );
    const sessions = await prisma.battleSession.findMany({
      where: { weekStart: { in: weekStarts } },
    });

    const fixes = sessions
      .map((session) => ({
        id: session.id,
        current: session.deadline,
        next: session.isGuildWar
          ? guildWarDeadline(session.weekStart)
          : earliest(session.deadline, deadlineCapFor(session.dateTime)),
      }))
      .filter(({ current, next }) => current.getTime() !== next.getTime());

    await prisma.$transaction(
      fixes.map(({ id, next }) =>
        prisma.battleSession.update({
          where: { id },
          data: { deadline: next },
        }),
      ),
    );

    console.log(
      `Đã kiểm tra ${sessions.length} trận của 2 tuần đang mở trong database ` +
        `của "${envFile}", sửa ${fixes.length} hạn chót.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * The earlier of two instants.
 * @param a - First instant
 * @param b - Second instant
 * @returns The smaller of the two
 */
function earliest(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

void main();
