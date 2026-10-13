import { ConflictException, ForbiddenException } from '@nestjs/common';

import { CatRaceAnnouncerService } from '../cat-race-announcer.service';
import { DiscordApiError } from '../discord-rest';

const ANNOUNCEMENT = {
  eventName: 'Quà',
  prizes: [{ name: 'Tiền mặt', winners: [{ discordId: '1', name: 'An' }] }],
};

function build(channelId: string | null = 'chan') {
  const catRace = {
    announcement: jest.fn().mockResolvedValue(ANNOUNCEMENT),
    markAnnounced: jest.fn().mockResolvedValue(undefined),
  };
  const channels = { get: jest.fn().mockResolvedValue(channelId) };
  const rest = { postMessage: jest.fn().mockResolvedValue(undefined) };
  const service = new CatRaceAnnouncerService(
    catRace as never,
    channels as never,
    rest as never,
  );

  return { service, catRace, channels, rest };
}

describe('CatRaceAnnouncerService', () => {
  it('posts to the GENERAL_NOTI channel, then marks the event announced', async () => {
    const { service, catRace, channels, rest } = build();

    await service.announce('e1');

    expect(channels.get).toHaveBeenCalledWith('GENERAL_NOTI');
    expect(rest.postMessage).toHaveBeenCalledWith('chan', expect.anything());
    expect(catRace.markAnnounced).toHaveBeenCalledWith('e1');
    expect(rest.postMessage.mock.invocationCallOrder[0]).toBeLessThan(
      catRace.markAnnounced.mock.invocationCallOrder[0],
    );
  });

  it('answers 409 and posts nothing when no channel is configured', async () => {
    const { service, catRace, rest } = build(null);

    await expect(service.announce('e1')).rejects.toThrow(ConflictException);
    await expect(service.announce('e1')).rejects.toThrow(
      'Chưa đặt kênh thông báo chung. Chạy /cau-hinh-kenh muc-dich:Thông báo chung trong kênh muốn nhận rồi thử lại.',
    );
    expect(rest.postMessage).not.toHaveBeenCalled();
    expect(catRace.markAnnounced).not.toHaveBeenCalled();
  });

  it('turns a Discord 403 into a Vietnamese refusal and does not mark', async () => {
    const { service, catRace, rest } = build();
    rest.postMessage.mockRejectedValue(new DiscordApiError(403, 'chan', '{}'));

    await expect(service.announce('e1')).rejects.toThrow(ForbiddenException);
    expect(catRace.markAnnounced).not.toHaveBeenCalled();
  });

  it('rethrows any other failure without marking', async () => {
    const { service, catRace, rest } = build();
    const failure = new DiscordApiError(500, 'chan', '{}');
    rest.postMessage.mockRejectedValue(failure);

    await expect(service.announce('e1')).rejects.toBe(failure);
    expect(catRace.markAnnounced).not.toHaveBeenCalled();
  });
});
