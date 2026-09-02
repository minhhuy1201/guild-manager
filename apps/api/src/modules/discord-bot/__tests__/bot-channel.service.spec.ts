import { ATTENDANCE_REMINDER, BotChannelService } from '../bot-channel.service';

/**
 * A Prisma stub exposing only the botChannel model the service touches.
 * @param row - What findUnique resolves to
 * @returns The stub plus its jest mocks, for assertions
 */
function makePrisma(row: { channelId: string } | null) {
  const findUnique = jest.fn().mockResolvedValue(row);
  const upsert = jest.fn().mockResolvedValue(undefined);

  return { prisma: { botChannel: { findUnique, upsert } }, findUnique, upsert };
}

describe('BotChannelService', () => {
  it('trả về channel đã cấu hình', async () => {
    const { prisma, findUnique } = makePrisma({ channelId: '424242' });
    const service = new BotChannelService(prisma as never);

    await expect(service.get()).resolves.toBe('424242');
    expect(findUnique).toHaveBeenCalledWith({
      where: { purpose: ATTENDANCE_REMINDER },
    });
  });

  // Not a failure: an admin may simply not have run /cau-hinh-kenh yet.
  it('trả về null khi chưa ai cấu hình', async () => {
    const { prisma } = makePrisma(null);
    const service = new BotChannelService(prisma as never);

    await expect(service.get()).resolves.toBeNull();
  });

  it('ghi đè dòng cũ thay vì thêm dòng thứ hai', async () => {
    const { prisma, upsert } = makePrisma(null);
    const service = new BotChannelService(prisma as never);

    await service.set('999');

    expect(upsert).toHaveBeenCalledWith({
      where: { purpose: ATTENDANCE_REMINDER },
      create: { purpose: ATTENDANCE_REMINDER, channelId: '999' },
      update: { channelId: '999' },
    });
  });
});
