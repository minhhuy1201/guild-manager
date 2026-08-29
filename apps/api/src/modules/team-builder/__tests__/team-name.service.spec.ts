import { FixedClock } from '../../../common';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TeamBuilderService } from '../team-builder.service';

const NOW = new Date('2026-07-22T12:00:00+07:00');

/** The transaction client `saveTeamNames` writes through. */
interface TeamNameTx {
  teamName: { deleteMany: jest.Mock; createMany: jest.Mock };
}

describe('TeamBuilderService — tên đội', () => {
  let service: TeamBuilderService;
  let tx: TeamNameTx;
  let prisma: {
    teamName: { findMany: jest.Mock };
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
    };

    prisma = {
      teamName: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(
        (run: (client: TeamNameTx) => Promise<unknown>) => run(tx),
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
        '1': 'Thủ nhà',
        '7': 'Dự bị',
      });
    });

    it('chưa đội nào có tên thì trả về map rỗng', async () => {
      await expect(service.getTeamNames()).resolves.toEqual({});
    });
  });

  describe('saveTeamNames', () => {
    it('xoá sạch rồi tạo lại, cả hai trong một transaction', async () => {
      await service.saveTeamNames({ '3': 'Thủ nhà' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.teamName.deleteMany).toHaveBeenCalledWith({});
      expect(tx.teamName.createMany).toHaveBeenCalledWith({
        data: [{ team: 3, name: 'Thủ nhà' }],
      });
    });

    it('map rỗng vẫn xoá sạch nhưng không gọi createMany', async () => {
      await service.saveTeamNames({});

      expect(tx.teamName.deleteMany).toHaveBeenCalledWith({});
      expect(tx.teamName.createMany).not.toHaveBeenCalled();
    });

    it('trả về đúng map vừa ghi', async () => {
      await expect(service.saveTeamNames({ '2': 'Xung kích' })).resolves.toEqual(
        { '2': 'Xung kích' },
      );
    });

    it('không kiểm tra khoá trận: tên đội không thuộc ngày đánh nào', async () => {
      await service.saveTeamNames({ '1': 'Thủ nhà' });

      expect(battleSessions.findById).not.toHaveBeenCalled();
      expect(characters.listIds).not.toHaveBeenCalled();
    });
  });
});
