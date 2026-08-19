import { PrismaPg } from '@prisma/adapter-pg';

import { deadlineCapFor, guildWarDeadline } from '@guild/shared/lib';

import { PrismaClient } from '../src/generated/prisma/client';
import { getEditableWeeks } from '../src/modules/battle-sessions/session-schedule';
import { loadPrismaEnv } from './load-env';

/**
 * Script chạy tay MỘT LẦN, đưa hạn chót của dữ liệu cũ về đúng luật trần
 * (xem docs/custom-spec/2026-08-18-deadline-cap-design.md):
 *
 *   PRISMA_ENV_FILE=.env.production pnpm --filter api db:fix-deadlines
 *
 * Chỉ đụng vào tuần đang mở và tuần kế — tuần đã qua là bản ghi lịch sử, quản
 * trị viên không sửa được nữa và hạn chót ở đó chỉ còn tác dụng hiển thị.
 *
 * Đây là lần duy nhất dự án kẹp giá trị hạn chót; luật chạy thường trực thì từ
 * chối request chứ không sửa ngầm.
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
    const weekStarts = getEditableWeeks().map((week) => week.weekStart);
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
 * Mốc sớm hơn trong hai mốc.
 * @param a - Mốc thứ nhất
 * @param b - Mốc thứ hai
 * @returns Mốc có thời điểm nhỏ hơn
 */
function earliest(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

void main();
