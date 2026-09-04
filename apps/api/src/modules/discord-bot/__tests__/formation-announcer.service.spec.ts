import { NotFoundException } from '@nestjs/common';
import type { BattleSession } from '@guild/shared/schemas';

import { FixedClock } from '../../../common';

import { FormationAnnouncerService } from '../formation-announcer.service';

/** Một ảnh webp tí hon, đúng dạng data URL frontend gửi lên. */
const IMAGE = 'data:image/webp;base64,AQID';

const ENV: Record<string, string> = {
  DISCORD_BANG_CHIEN_CHANNEL_ID: 'channel-bang-chien',
  DISCORD_GUILD_ROLE_ID: '999888777',
  DISCORD_BAO_BAN_CHANNEL_ID: '111222333',
};

/**
 * Một trận scrim 20:30 ngày 19/08, đúng các trường announcer đọc.
 * @param overrides - Trường cần đổi
 * @returns Session như API trả về
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'session-1',
    label: 'Thứ 4 · 20:30',
    dateTime: '2026-08-19T13:30:00.000Z',
    deadline: '2026-08-19T03:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: 'Moonlight',
    weekStart: '2026-08-16T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 2,
    ...overrides,
  };
}

/**
 * Dựng service với các phụ thuộc đã bị thay bằng mock.
 * @param found - Session `findById` trả về, null nghĩa là không tìm thấy
 * @returns Service cùng các mock để assert
 */
function build(found: BattleSession | null = session()) {
  const battleSessions = { findById: jest.fn().mockResolvedValue(found) };
  const rest = { postMessageWithFiles: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (key: string) => ENV[key] };
  const clock = new FixedClock(new Date('2026-08-19T02:00:00.000Z'));

  const service = new FormationAnnouncerService(
    battleSessions as never,
    rest as never,
    config as never,
    clock,
  );

  return { service, battleSessions, rest };
}

describe('FormationAnnouncerService', () => {
  it('không tìm thấy trận thì từ chối bằng câu tiếng Việt', async () => {
    const { service, rest } = build(null);

    await expect(service.announce('không-có', [IMAGE])).rejects.toThrow(
      NotFoundException,
    );
    expect(rest.postMessageWithFiles).not.toHaveBeenCalled();
  });

  it('gửi đúng channel bang chiến, một message mang mọi ảnh', async () => {
    const { service, rest } = build();

    const sent = await service.announce('session-1', [IMAGE, IMAGE]);

    expect(sent).toBe(2);
    expect(rest.postMessageWithFiles).toHaveBeenCalledTimes(1);

    const [channelId, payload, files] = rest.postMessageWithFiles.mock
      .calls[0] as [string, { content: string }, { filename: string }[]];

    expect(channelId).toBe('channel-bang-chien');
    expect(payload.content).toContain('# SCRIM 20:30 19/08 TỐI NAY - 2 TRẬN');
    expect(files.map((file) => file.filename)).toEqual([
      'doi-hinh-1.webp',
      'doi-hinh-2.webp',
    ]);
  });

  it('giải mã base64 thành bytes thật, bỏ tiền tố data URL', async () => {
    const { service, rest } = build();

    await service.announce('session-1', [IMAGE]);

    const [, , files] = rest.postMessageWithFiles.mock.calls[0] as [
      string,
      unknown,
      { bytes: Uint8Array; contentType: string }[],
    ];

    expect(Array.from(files[0].bytes)).toEqual([1, 2, 3]);
    expect(files[0].contentType).toBe('image/webp');
  });
});
