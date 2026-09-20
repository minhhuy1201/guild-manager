import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { BattleSession } from '@guild/shared/schemas';

import { FixedClock } from '../../../common';

import { DiscordApiError } from '../discord-rest';
import { FormationAnnouncerService } from '../formation-announcer.service';

/** A tiny webp image, in the exact data URL shape the frontend sends. */
const IMAGE = 'data:image/webp;base64,AQID';

const ENV: Record<string, string> = {
  DISCORD_BANG_CHIEN_CHANNEL_ID: 'channel-bang-chien',
  DISCORD_GUILD_ROLE_ID: '999888777',
  DISCORD_BAO_BAN_CHANNEL_ID: '111222333',
};

/**
 * A 20:30 scrim on 19/08, carrying exactly the fields the announcer reads.
 * @param overrides - The fields to change
 * @returns A session in the shape the API returns
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'session-1',
    label: 'Thứ 4 · 20:30',
    dateTime: '2026-08-19T13:30:00.000Z',
    deadline: '2026-08-19T03:00:00.000Z',
    isAttendanceClosed: false,
    canReopenAttendance: false,
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
 * Builds the service with every dependency replaced by a mock.
 * @param found - The session `findById` returns; null means not found
 * @returns The service together with the mocks to assert on
 */
function build(found: BattleSession | null = session()) {
  const battleSessions = {
    findById: jest.fn().mockResolvedValue(found),
    closeAttendance: jest.fn().mockResolvedValue(undefined),
  };
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

  it('một đội hình dùng chung cho ngày hai trận thì vẫn gửi', async () => {
    // A day that plays two matches with the same line-up is a valid case, not a missing image:
    // `matchCount` counts the matches PLAYED, while whether there are one or two line-ups is the
    // admin's choice. The banner on the image says "2 trận" in line with `matchPart` on the web, so
    // the guild does not read it as a missing match.
    const { service, rest } = build(session({ matchCount: 2 }));

    await expect(service.announce('session-1', [IMAGE])).resolves.toEqual({
      imageCount: 1,
    });
    expect(rest.postMessageWithFiles).toHaveBeenCalledTimes(1);
  });

  it('thừa ảnh thì từ chối, không gửi gì', async () => {
    const { service, rest } = build(session({ matchCount: 1 }));

    await expect(service.announce('session-1', [IMAGE, IMAGE])).rejects.toThrow(
      BadRequestException,
    );
    expect(rest.postMessageWithFiles).not.toHaveBeenCalled();
  });

  it('gửi đúng channel bang chiến, một message mang mọi ảnh', async () => {
    const { service, rest } = build();

    const sent = await service.announce('session-1', [IMAGE, IMAGE]);

    expect(sent).toEqual({ imageCount: 2 });
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

  it('gửi xong thì khoá điểm danh của ngày đó', async () => {
    // Once the line-up is on Discord the list counts as final: leaving the form open lets a member
    // change their answer afterwards and contradict the message the whole guild just read.
    const { service, battleSessions } = build();

    await service.announce('session-1', [IMAGE, IMAGE]);

    expect(battleSessions.closeAttendance).toHaveBeenCalledWith('session-1');
  });

  it('không gửi được thì không khoá điểm danh', async () => {
    const { service, battleSessions } = build(session({ matchCount: 1 }));

    await expect(service.announce('session-1', [IMAGE, IMAGE])).rejects.toThrow(
      BadRequestException,
    );
    expect(battleSessions.closeAttendance).not.toHaveBeenCalled();
  });

  it('giải mã base64 thành bytes thật, bỏ tiền tố data URL', async () => {
    // One match, one image - the simplest case, nowhere near the `matchCount` ceiling.
    const { service, rest } = build(session({ matchCount: 1 }));

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

// The person pressing the button is an admin, and "the bot has no permission in this channel" is
// something they can fix in Discord themselves - but only if someone says so. This used to reach
// the browser as a 500 "Lỗi hệ thống, vui lòng thử lại sau." with the cause left in the server
// log.
describe('FormationAnnouncerService — Discord từ chối', () => {
  /**
   * Builds the service with a REST client that always throws a Discord error.
   * @param status - The status code Discord returns
   * @returns The service, ready to call
   */
  function buildRefusing(status: number) {
    const { service, rest, battleSessions } = build(session({ matchCount: 1 }));
    rest.postMessageWithFiles.mockRejectedValue(
      new DiscordApiError(status, 'channel-bang-chien', '{"code":50013}'),
    );

    return { service, battleSessions };
  }

  it('403 thành câu tiếng Việt nói admin phải cấp quyền gì', async () => {
    const { service } = buildRefusing(403);

    await expect(service.announce('session-1', [IMAGE])).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.announce('session-1', [IMAGE])).rejects.toThrow(
      /Send Messages/,
    );
  });

  // Every other code is the system's problem, not the admin's: leave it for the filter to log with
  // its stack.
  it('mã lỗi khác vẫn nổi lên nguyên trạng', async () => {
    const { service } = buildRefusing(500);

    await expect(service.announce('session-1', [IMAGE])).rejects.toThrow(
      DiscordApiError,
    );
  });

  // A refusal from Discord means the guild has seen no line-up at all - closing attendance then
  // only creates a day nobody can answer for and nobody knows the line-up of.
  it('Discord từ chối thì không khoá điểm danh', async () => {
    const { service, battleSessions } = buildRefusing(403);

    await expect(service.announce('session-1', [IMAGE])).rejects.toThrow(
      ForbiddenException,
    );
    expect(battleSessions.closeAttendance).not.toHaveBeenCalled();
  });
});
