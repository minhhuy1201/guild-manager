import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SURVEY_TITLE_MAX_LENGTH } from '@guild/shared/schemas';
import {
  ClassChangeConfidence,
  GuildClass,
  GuildRole,
} from '@guild/shared/enums';

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
    classSurvey: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    classSurveyAnswer: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let characters: {
    listRows: jest.Mock;
    findByDiscordId: jest.Mock;
    findById: jest.Mock;
  };
  let service: ClassSurveyService;

  beforeEach(() => {
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      classSurvey: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'new', ...args.data }),
          ),
      },
      classSurveyAnswer: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest
          .fn()
          .mockImplementation((args: { create: Record<string, unknown> }) =>
            Promise.resolve({ id: 'a1', ...args.create }),
          ),
      },
      $transaction: jest.fn((run: (client: unknown) => unknown) => run(prisma)),
    };
    characters = {
      listRows: jest.fn().mockResolvedValue(MEMBERS),
      findByDiscordId: jest
        .fn()
        .mockResolvedValue({ id: 'meo', guildClass: 'TO_VAN' }),
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'meo', guildClass: 'TO_VAN' }),
    };
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

    it.each([
      ['longer than the limit', 'x'.repeat(SURVEY_TITLE_MAX_LENGTH + 1)],
      ['blank', '   '],
    ])(
      'refuses a title that is %s before touching the database',
      async (_name, title) => {
        await expect(
          service.open(title, vn('2026-11-06T23:59'), ADMIN),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(prisma.classSurvey.create).not.toHaveBeenCalled();
      },
    );

    it('stores the title trimmed, at exactly the limit', async () => {
      const title = 'x'.repeat(SURVEY_TITLE_MAX_LENGTH);

      await service.open(` ${title} `, vn('2026-11-06T23:59'), ADMIN);

      expect(prisma.classSurvey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title }) as unknown,
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

  describe('answer', () => {
    const OPEN = {
      id: 'open',
      title: 'Đang mở',
      closesAt: vn('2026-11-06T23:59'),
    };
    const CHANGE = {
      kind: 'CHANGE',
      targetClass: GuildClass.HUYEN_CO,
      confidence: ClassChangeConfidence.SURE,
    } as const;

    beforeEach(() => {
      prisma.classSurvey.findUnique.mockResolvedValue(OPEN);
    });

    it('saves a change with the caller class as fromClass and the clock as answeredAt', async () => {
      await expect(service.answer('open', ADMIN, CHANGE)).resolves.toEqual({
        kind: 'CHANGE',
        fromClass: 'TO_VAN',
        targetClass: 'HUYEN_CO',
        confidence: 'SURE',
      });
      expect(characters.findByDiscordId).toHaveBeenCalledWith(ADMIN.sub);
      expect(prisma.classSurveyAnswer.upsert).toHaveBeenCalledWith({
        where: {
          surveyId_characterId: { surveyId: 'open', characterId: 'meo' },
        },
        create: {
          surveyId: 'open',
          characterId: 'meo',
          fromClass: 'TO_VAN',
          targetClass: 'HUYEN_CO',
          confidence: 'SURE',
          answeredAt: NOW,
        },
        update: {
          fromClass: 'TO_VAN',
          targetClass: 'HUYEN_CO',
          confidence: 'SURE',
          answeredAt: NOW,
        },
      });
    });

    it('saves "keep" with neither target nor confidence', async () => {
      await expect(
        service.answer('open', ADMIN, { kind: 'KEEP' }),
      ).resolves.toEqual({ kind: 'KEEP', fromClass: 'TO_VAN' });
      expect(prisma.classSurveyAnswer.upsert).toHaveBeenCalledWith({
        where: {
          surveyId_characterId: { surveyId: 'open', characterId: 'meo' },
        },
        create: {
          surveyId: 'open',
          characterId: 'meo',
          fromClass: 'TO_VAN',
          targetClass: null,
          confidence: null,
          answeredAt: NOW,
        },
        update: {
          fromClass: 'TO_VAN',
          targetClass: null,
          confidence: null,
          answeredAt: NOW,
        },
      });
    });

    it('refuses an unknown survey', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue(null);

      await expect(service.answer('nope', ADMIN, CHANGE)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.classSurveyAnswer.upsert).not.toHaveBeenCalled();
    });

    it('refuses an answer once the deadline has passed', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue({
        ...OPEN,
        closesAt: vn('2026-11-01T11:00'),
      });

      await expect(service.answer('open', ADMIN, CHANGE)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.classSurveyAnswer.upsert).not.toHaveBeenCalled();
    });

    it('refuses a caller with no Character', async () => {
      characters.findByDiscordId.mockResolvedValue(null);

      await expect(service.answer('open', ADMIN, CHANGE)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.classSurveyAnswer.upsert).not.toHaveBeenCalled();
    });

    it('refuses a target equal to the current class', async () => {
      await expect(
        service.answer('open', ADMIN, {
          ...CHANGE,
          targetClass: GuildClass.TO_VAN,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.classSurveyAnswer.upsert).not.toHaveBeenCalled();
    });
  });

  describe('panelFor', () => {
    const SURVEY_ROW = {
      id: 's1',
      title: 'Update 06/11',
      closesAt: vn('2026-11-06T23:59'),
    };

    it('returns the survey, the class now and no answer before the member answers', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue(SURVEY_ROW);

      const panel = await service.panelFor('s1', 'meo');

      expect(panel).toEqual({
        survey: expect.objectContaining({ id: 's1', isOpen: true }) as unknown,
        fromClass: 'TO_VAN',
        answer: null,
      });
      expect(prisma.classSurvey.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(prisma.classSurveyAnswer.findUnique).toHaveBeenCalledWith({
        where: { surveyId_characterId: { surveyId: 's1', characterId: 'meo' } },
      });
      expect(characters.findById).toHaveBeenCalledWith('meo');
    });

    it('returns the saved answer in contract shape', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue(SURVEY_ROW);
      prisma.classSurveyAnswer.findUnique.mockResolvedValue({
        characterId: 'meo',
        fromClass: 'TO_VAN',
        targetClass: 'HUYET_HA',
        confidence: 'SURE',
      });

      const panel = await service.panelFor('s1', 'meo');

      expect(panel?.answer).toEqual({
        kind: 'CHANGE',
        fromClass: 'TO_VAN',
        targetClass: 'HUYET_HA',
        confidence: 'SURE',
      });
    });

    it('returns a closed survey marked closed, not null', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue({
        ...SURVEY_ROW,
        closesAt: vn('2026-10-30T23:59'),
      });

      const panel = await service.panelFor('s1', 'meo');

      expect(panel?.survey.isOpen).toBe(false);
    });

    it('is null for an unknown survey and reads nothing else', async () => {
      const panel = await service.panelFor('nope', 'meo');

      expect(panel).toBeNull();
      expect(prisma.classSurveyAnswer.findUnique).not.toHaveBeenCalled();
      expect(characters.findById).not.toHaveBeenCalled();
    });

    it('is null for an unknown Character', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue(SURVEY_ROW);
      characters.findById.mockResolvedValue(null);

      expect(await service.panelFor('s1', 'ghost')).toBeNull();
    });

    it('never reads every answer or every Character', async () => {
      prisma.classSurvey.findUnique.mockResolvedValue(SURVEY_ROW);

      await service.panelFor('s1', 'meo');

      expect(prisma.classSurveyAnswer.findMany).not.toHaveBeenCalled();
      expect(characters.listRows).not.toHaveBeenCalled();
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
