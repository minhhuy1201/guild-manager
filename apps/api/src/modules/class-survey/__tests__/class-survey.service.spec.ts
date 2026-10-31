import { BadRequestException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE, type RequestActor } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { vn } from '../../../__tests__/vn-date';
import { CharactersService } from '../../characters/characters.public';
import { ClassSurveyService } from '../class-survey.service';

const NOW = vn('2026-11-01T12:00');

const ADMIN: RequestActor = {
  sub: 'admin-discord',
  role: GuildRole.ADMIN,
  type: TOKEN_TYPE.access,
  capabilities: [],
  grantedCommands: [],
};

const MEMBERS = [
  { id: 'meo', name: 'Mèo Béo', guildClass: 'TO_VAN', discordId: '111' },
  { id: 'cun', name: 'Cún Con', guildClass: 'THIET_Y', discordId: null },
];

describe('ClassSurveyService', () => {
  let prisma: {
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
    classSurvey: { findFirst: jest.Mock; create: jest.Mock };
    classSurveyAnswer: { findMany: jest.Mock };
  };
  let characters: { listRows: jest.Mock };
  let service: ClassSurveyService;

  beforeEach(() => {
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      classSurvey: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'new', ...args.data }),
          ),
      },
      classSurveyAnswer: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((run: (client: unknown) => unknown) => run(prisma)),
    };
    characters = { listRows: jest.fn().mockResolvedValue(MEMBERS) };
    service = new ClassSurveyService(
      prisma as unknown as PrismaService,
      characters as unknown as CharactersService,
      new FixedClock(NOW),
    );
  });

  describe('open', () => {
    it('opens a survey that is open until its deadline', async () => {
      const closesAt = vn('2026-11-06T23:59');

      await expect(
        service.open('Update 06/11', closesAt, ADMIN),
      ).resolves.toEqual({
        id: 'new',
        title: 'Update 06/11',
        closesAt: closesAt.toISOString(),
        isOpen: true,
      });
      expect(prisma.classSurvey.create).toHaveBeenCalledWith({
        data: {
          title: 'Update 06/11',
          closesAt,
          createdAt: NOW,
          createdById: ADMIN.sub,
        },
      });
    });

    it('refuses a second survey while one is still open', async () => {
      prisma.classSurvey.findFirst.mockResolvedValue({
        id: 'old',
        title: 'Đợt trước',
        closesAt: vn('2026-11-03T23:59'),
      });

      await expect(
        service.open('Đợt hai', vn('2026-11-06T23:59'), ADMIN),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.classSurvey.create).not.toHaveBeenCalled();
    });

    it('looks for an open survey as one whose deadline is after now', async () => {
      await service.open('Đợt', vn('2026-11-06T23:59'), ADMIN);

      expect(prisma.classSurvey.findFirst).toHaveBeenCalledWith({
        where: { closesAt: { gt: NOW } },
      });
    });

    it.each([
      ['in the past', vn('2026-10-31T23:59')],
      ['exactly now', NOW],
    ])('refuses a deadline %s', async (_label, closesAt) => {
      await expect(service.open('Đợt', closesAt, ADMIN)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.classSurvey.create).not.toHaveBeenCalled();
    });
  });

  describe('current', () => {
    const OPEN = {
      id: 'open',
      title: 'Đang mở',
      closesAt: vn('2026-11-06T23:59'),
    };
    const CLOSED = {
      id: 'closed',
      title: 'Đã đóng',
      closesAt: vn('2026-10-01T23:59'),
    };

    it('returns the open survey when there is one', async () => {
      prisma.classSurvey.findFirst.mockImplementation(
        (args: { where?: unknown }) =>
          Promise.resolve(args.where ? OPEN : CLOSED),
      );

      const view = await service.current();

      expect(view.survey).toEqual({
        id: 'open',
        title: 'Đang mở',
        closesAt: OPEN.closesAt.toISOString(),
        isOpen: true,
      });
    });

    it('falls back to the latest closed survey, marked closed', async () => {
      prisma.classSurvey.findFirst.mockImplementation(
        (args: { where?: unknown }) =>
          Promise.resolve(args.where ? null : CLOSED),
      );

      const view = await service.current();

      expect(view.survey).toMatchObject({ id: 'closed', isOpen: false });
      expect(prisma.classSurvey.findFirst).toHaveBeenLastCalledWith({
        orderBy: { closesAt: 'desc' },
      });
    });

    it('returns survey null with every member when none has ever run', async () => {
      const view = await service.current();

      expect(view.survey).toBeNull();
      expect(view.members).toEqual([
        { id: 'meo', name: 'Mèo Béo', guildClass: 'TO_VAN', answer: null },
        { id: 'cun', name: 'Cún Con', guildClass: 'THIET_Y', answer: null },
      ]);
      expect(prisma.classSurveyAnswer.findMany).not.toHaveBeenCalled();
    });

    it('lists a row per Character, with answers where given', async () => {
      prisma.classSurvey.findFirst.mockResolvedValue(OPEN);
      prisma.classSurveyAnswer.findMany.mockResolvedValue([
        {
          characterId: 'meo',
          fromClass: 'TO_VAN',
          targetClass: 'HUYEN_CO',
          confidence: 'SURE',
        },
        {
          characterId: 'cun',
          fromClass: 'THIET_Y',
          targetClass: null,
          confidence: null,
        },
      ]);

      const view = await service.current();

      expect(view.members).toEqual([
        {
          id: 'meo',
          name: 'Mèo Béo',
          guildClass: 'TO_VAN',
          answer: {
            kind: 'CHANGE',
            fromClass: 'TO_VAN',
            targetClass: 'HUYEN_CO',
            confidence: 'SURE',
          },
        },
        {
          id: 'cun',
          name: 'Cún Con',
          guildClass: 'THIET_Y',
          answer: { kind: 'KEEP', fromClass: 'THIET_Y' },
        },
      ]);
    });
  });

  describe('unanswered', () => {
    it('is null when no survey is open', async () => {
      await expect(service.unanswered()).resolves.toBeNull();
      expect(prisma.classSurvey.findFirst).toHaveBeenCalledWith({
        where: { closesAt: { gt: NOW } },
      });
    });

    it('lists every Character without an answer, linked or not', async () => {
      prisma.classSurvey.findFirst.mockResolvedValue({
        id: 'open',
        title: 'Đang mở',
        closesAt: vn('2026-11-06T23:59'),
      });
      prisma.classSurveyAnswer.findMany.mockResolvedValue([
        { characterId: 'meo' },
      ]);

      const result = await service.unanswered();

      expect(result?.survey.id).toBe('open');
      expect(result?.unanswered).toEqual([
        { id: 'cun', name: 'Cún Con', discordId: null },
      ]);
    });
  });
});
