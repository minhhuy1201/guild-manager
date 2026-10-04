import { PreconditionFailedException } from '@nestjs/common';

import { FixedClock } from '../../../common';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TeamBuilderService } from '../team-builder.service';

const NOW = new Date('2026-07-22T12:00:00+07:00');

/** The transaction client `saveTeamNames` writes through. */
interface TeamNameTx {
  teamName: { deleteMany: jest.Mock; createMany: jest.Mock };
  teamNameVersion: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
}

describe('TeamBuilderService — tên đội', () => {
  let service: TeamBuilderService;
  let tx: TeamNameTx;
  let prisma: {
    teamName: { findMany: jest.Mock };
    teamNameVersion: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  let battleSessions: {
    getActiveWeek: jest.Mock;
    readWeekSessions: jest.Mock;
    findById: jest.Mock;
  };
  let characters: { listIds: jest.Mock };

  beforeEach(() => {
    tx = {
      teamName: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      teamNameVersion: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, version: 5 }),
      },
    };

    prisma = {
      teamName: { findMany: jest.fn().mockResolvedValue([]) },
      teamNameVersion: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, version: 5 }),
      },
      $transaction: jest.fn((run: (client: TeamNameTx) => Promise<unknown>) =>
        run(tx),
      ),
    };

    battleSessions = {
      getActiveWeek: jest.fn(),
      readWeekSessions: jest.fn(),
      findById: jest.fn(),
    };
    characters = { listIds: jest.fn() };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
      characters as unknown as CharactersService,
      new FixedClock(NOW),
    );
  });

  describe('getTeamNames', () => {
    it('trả về map số đội → tên', async () => {
      prisma.teamName.findMany.mockResolvedValue([
        { team: 1, name: 'Thủ nhà' },
        { team: 7, name: 'Dự bị' },
      ]);

      await expect(service.getTeamNames()).resolves.toEqual({
        names: { '1': 'Thủ nhà', '7': 'Dự bị' },
        version: 5,
      });
    });

    it('chưa đội nào có tên thì trả về map rỗng', async () => {
      await expect(service.getTeamNames()).resolves.toEqual({
        names: {},
        version: 5,
      });
    });

    it('thiếu dòng TeamNameVersion: ném, không tự dựng lại', async () => {
      prisma.teamNameVersion.findUniqueOrThrow.mockRejectedValue(
        new Error('No record found'),
      );

      await expect(service.getTeamNames()).rejects.toThrow('No record found');
    });
  });

  describe('saveTeamNames', () => {
    it('xoá sạch rồi tạo lại, cả hai trong một transaction', async () => {
      await service.saveTeamNames({ names: { '3': 'Thủ nhà' }, version: 5 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.teamName.deleteMany).toHaveBeenCalledWith({});
      expect(tx.teamName.createMany).toHaveBeenCalledWith({
        data: [{ team: 3, name: 'Thủ nhà' }],
      });
    });

    it('map rỗng vẫn xoá sạch nhưng không gọi createMany', async () => {
      await service.saveTeamNames({ names: {}, version: 5 });

      expect(tx.teamName.deleteMany).toHaveBeenCalledWith({});
      expect(tx.teamName.createMany).not.toHaveBeenCalled();
    });

    it('trả về đúng map vừa ghi', async () => {
      await expect(
        service.saveTeamNames({ names: { '2': 'Xung kích' }, version: 5 }),
      ).resolves.toEqual({ names: { '2': 'Xung kích' }, version: 6 });
    });

    it('đúng version: tăng 1 rồi mới xoá-dựng lại', async () => {
      await service.saveTeamNames({ names: { '3': 'Thủ nhà' }, version: 5 });

      expect(tx.teamNameVersion.updateMany).toHaveBeenCalledWith({
        where: { id: 1, version: 5 },
        data: { version: { increment: 1 } },
      });
      expect(
        tx.teamNameVersion.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(tx.teamName.deleteMany.mock.invocationCallOrder[0]);
    });

    it('thiếu dòng TeamNameVersion lúc ghi: lỗi hệ thống, không phải 412', async () => {
      tx.teamNameVersion.updateMany.mockResolvedValue({ count: 0 });
      tx.teamNameVersion.findUniqueOrThrow.mockRejectedValue(
        new Error('No record found'),
      );

      await expect(
        service.saveTeamNames({ names: {}, version: 5 }),
      ).rejects.toThrow('No record found');
      expect(tx.teamName.deleteMany).not.toHaveBeenCalled();
    });

    it('sai version: 412, không deleteMany', async () => {
      tx.teamNameVersion.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.saveTeamNames({ names: { '3': 'Thủ nhà' }, version: 4 }),
      ).rejects.toBeInstanceOf(PreconditionFailedException);
      expect(tx.teamName.deleteMany).not.toHaveBeenCalled();
    });

    it('không kiểm tra khoá trận: tên đội không thuộc ngày đánh nào', async () => {
      await service.saveTeamNames({ names: { '1': 'Thủ nhà' }, version: 5 });

      expect(battleSessions.findById).not.toHaveBeenCalled();
      expect(characters.listIds).not.toHaveBeenCalled();
    });
  });
});
