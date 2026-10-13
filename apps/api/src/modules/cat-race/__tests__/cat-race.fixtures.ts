import { FixedClock } from '../../../common/clock/clock';
import { CatRaceService } from '../cat-race.service';

export const NOW = new Date('2026-10-12T03:00:00.000Z');

/** Prisma double: every delegate this module touches, and a `$transaction` that runs on itself. */
export function createPrisma() {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
    catRaceEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    catRaceParticipant: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    catRacePrize: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    catRaceEntrant: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    catRaceRound: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    character: { count: jest.fn(), findUniqueOrThrow: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prisma),
  );

  return prisma;
}

export type PrismaDouble = ReturnType<typeof createPrisma>;

/** An open TICKET event row (pass `mode` to change it), and the detail include the service re-reads at the end of a write. */
export function openEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    name: 'Đợt',
    mode: 'TICKET',
    createdById: 'admin',
    createdAt: NOW,
    endedAt: null,
    discordPostedAt: null,
    participants: [],
    prizes: [],
    ...overrides,
  };
}

export function buildService(
  prisma: PrismaDouble,
  random: (max: number) => number = () => 0,
) {
  return new CatRaceService(prisma as never, new FixedClock(NOW), random);
}
