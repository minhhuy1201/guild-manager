import { FixedClock } from '../../../common';
import { TeamBuilderController } from '../team-builder.controller';
import { TeamBuilderService } from '../team-builder.service';

const NOW = new Date('2026-07-22T05:00:00Z');

describe('TeamBuilderController.getWeeks', () => {
  let controller: TeamBuilderController;
  let teamBuilder: {
    purgeExpiredFormations: jest.Mock;
    getWeeks: jest.Mock;
  };

  beforeEach(() => {
    teamBuilder = {
      purgeExpiredFormations: jest.fn().mockResolvedValue(0),
      getWeeks: jest.fn().mockResolvedValue([]),
    };

    controller = new TeamBuilderController(
      teamBuilder as unknown as TeamBuilderService,
      new FixedClock(NOW),
    );
  });

  it('dọn đội hình quá hạn trước khi liệt kê tuần', async () => {
    const order: string[] = [];
    teamBuilder.purgeExpiredFormations.mockImplementation(() => {
      order.push('purge');
      return Promise.resolve(0);
    });
    teamBuilder.getWeeks.mockImplementation(() => {
      order.push('read');
      return Promise.resolve([]);
    });

    await controller.getWeeks();

    expect(order).toEqual(['purge', 'read']);
  });

  it('dọn theo thời điểm của đồng hồ ứng dụng', async () => {
    await controller.getWeeks();

    expect(teamBuilder.purgeExpiredFormations).toHaveBeenCalledWith(NOW);
  });

  it('trả về đúng danh sách tuần service đưa ra', async () => {
    const weeks = [
      {
        weekStart: '2026-07-19T17:00:00.000Z',
        weekEnd: '2026-07-25T16:59:00.000Z',
        isActive: true,
      },
    ];
    teamBuilder.getWeeks.mockResolvedValue(weeks);

    await expect(controller.getWeeks()).resolves.toEqual(weeks);
  });
});
