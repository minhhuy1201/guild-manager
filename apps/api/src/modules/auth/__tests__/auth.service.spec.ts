import { UnauthorizedException } from '@nestjs/common';
import { GuildClass, GuildRole } from '@guild/shared/enums';

import { AuthService } from '../auth.service';
import { AUTH_ERROR } from '../auth.constant';

/** Discord ID nằm trong danh sách cứu hộ của cấu hình giả bên dưới. */
const RESCUE_ID = '999888777666555444';

/** Cấu hình env giả cho service. */
const config = {
  get: (key: string) =>
    ({
      WEB_ORIGIN: 'http://localhost:3000',
      DISCORD_CLIENT_ID: 'app-id',
      DISCORD_CLIENT_SECRET: 'app-secret',
      DISCORD_REDIRECT_URI: 'http://localhost:3001/api/auth/discord/callback',
      DISCORD_ADMIN_IDS: RESCUE_ID,
    })[key],
} as never;

const now = new Date('2026-08-24T10:00:00.000Z');
const clock = { now: () => now } as never;

/** Một hàng Character đủ để dựng SessionUser. */
const ROW = {
  id: 'meo-beo-k7ma3x',
  name: 'Mèo Béo',
  guildClass: GuildClass.THIET_Y,
  discordUsername: 'meobeo',
};

/**
 * Giả hai lời gọi fetch của `exchangeCodeForProfile`: đổi code rồi đọc hồ sơ.
 * @param profile - Hồ sơ Discord mà lời gọi thứ hai trả về
 * @returns Mock của global.fetch
 */
function mockDiscord(profile: { id: string; username: string }) {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 't' }), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(profile), { status: 200 }),
    );
}

/**
 * Dựng AuthService với các phụ thuộc giả.
 * @param overrides - Prisma, CharactersService và JwtService giả cho từng ca test
 * @returns Service đã sẵn sàng gọi cùng các mock để đọc lại lời gọi
 */
function makeService(overrides: {
  characters?: Record<string, jest.Mock>;
  authExchange?: Record<string, jest.Mock>;
  jwt?: Record<string, jest.Mock>;
}) {
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
    ...overrides.jwt,
  };
  const prisma = {
    authExchange: {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      ...overrides.authExchange,
    },
  };
  const characters = {
    findByDiscordId: jest.fn().mockResolvedValue(null),
    touchLogin: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(ROW),
    ...overrides.characters,
  };

  return {
    service: new AuthService(
      config,
      jwt as never,
      prisma as never,
      characters as never,
      clock,
    ),
    jwt,
    prisma,
    characters,
  };
}

afterEach(() => jest.restoreAllMocks());

describe('AuthService.authorizeUrl', () => {
  it('ký state mang theo đường dẫn quay lại đã lọc', async () => {
    const { service, jwt } = makeService({});

    const url = await service.authorizeUrl('//evil.example');

    expect(new URL(url).searchParams.get('state')).toBe('signed-token');
    const [statePayload] = jwt.signAsync.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(statePayload).toMatchObject({
      type: 'oauth_state',
      redirect: '/',
    });
  });
});

describe('AuthService.handleCallback', () => {
  /** State hợp lệ mà `readState` sẽ đọc được. */
  const validState = { sub: 'nonce', type: 'oauth_state', redirect: '/' };

  it('đá về trang đăng nhập khi Discord ID không thuộc bang', async () => {
    const { service, jwt, prisma } = makeService({});
    jwt.verifyAsync.mockResolvedValue(validState);
    mockDiscord({ id: '111', username: 'nguoila' });

    const url = await service.handleCallback({ code: 'c', state: 's' });

    expect(url).toContain(`error=${AUTH_ERROR.notMember}`);
    expect(prisma.authExchange.create).not.toHaveBeenCalled();
  });

  it('đá về trang đăng nhập khi người dùng bấm Huỷ', async () => {
    const { service } = makeService({});

    const url = await service.handleCallback({ error: 'access_denied' });

    expect(url).toContain(`error=${AUTH_ERROR.denied}`);
  });

  it('đá về trang đăng nhập khi state hỏng', async () => {
    const { service, jwt } = makeService({});
    jwt.verifyAsync.mockRejectedValue(new Error('bad signature'));

    const url = await service.handleCallback({ code: 'c', state: 'hong' });

    expect(url).toContain(`error=${AUTH_ERROR.expired}`);
  });

  it('đá về trang đăng nhập khi không gọi được Discord', async () => {
    const { service, jwt } = makeService({});
    jwt.verifyAsync.mockResolvedValue(validState);
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNRESET'));

    const url = await service.handleCallback({ code: 'c', state: 's' });

    expect(url).toContain(`error=${AUTH_ERROR.upstream}`);
  });

  it('phát mã đổi và ghi lần đăng nhập khi Discord ID khớp thành viên', async () => {
    const { service, jwt, prisma, characters } = makeService({
      characters: {
        findByDiscordId: jest
          .fn()
          .mockResolvedValue({ id: ROW.id, role: GuildRole.MEMBER }),
      },
    });
    jwt.verifyAsync.mockResolvedValue({
      ...validState,
      redirect: '/lich-su-diem-danh',
    });
    mockDiscord({ id: '123456789012345678', username: 'meobeo' });

    const url = new URL(
      await service.handleCallback({ code: 'c', state: 's' }),
    );

    expect(url.pathname).toBe('/dang-nhap/discord');
    expect(url.searchParams.get('redirect')).toBe('/lich-su-diem-danh');
    expect(url.searchParams.get('exchange')).toBeTruthy();
    expect(characters.touchLogin).toHaveBeenCalledWith(ROW.id, 'meobeo', now);
    expect(prisma.authExchange.create).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.exchange', () => {
  it('từ chối mã đã dùng', async () => {
    const { service } = makeService({
      authExchange: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    });

    await expect(service.exchange({ code: 'da-dung' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ép vai ADMIN cho Discord ID trong danh sách cứu hộ', async () => {
    const { service, prisma, characters } = makeService({
      characters: {
        findByDiscordId: jest
          .fn()
          .mockResolvedValue({ id: ROW.id, role: GuildRole.MEMBER }),
      },
      authExchange: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ma',
          discordId: RESCUE_ID,
        }),
      },
    });

    const tokens = await service.exchange({ code: 'ma' });

    expect(tokens.user.role).toBe(GuildRole.ADMIN);
    expect(tokens.user.character).toEqual({
      id: ROW.id,
      name: ROW.name,
      guildClass: ROW.guildClass,
    });
    expect(characters.findByDiscordId).toHaveBeenCalledWith(RESCUE_ID);
    expect(prisma.authExchange.deleteMany).toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  it('chấm dứt phiên khi Discord ID không còn gắn nhân vật nào', async () => {
    const { service, jwt } = makeService({});
    jwt.verifyAsync.mockResolvedValue({
      sub: '111',
      role: GuildRole.MEMBER,
      type: 'refresh',
    });

    await expect(service.refresh({ refreshToken: 'r' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('phát cặp token mới với vai đọc lại từ database', async () => {
    const { service, jwt } = makeService({
      characters: {
        findByDiscordId: jest
          .fn()
          .mockResolvedValue({ id: ROW.id, role: GuildRole.LEADER }),
      },
    });
    jwt.verifyAsync.mockResolvedValue({
      sub: '123456789012345678',
      role: GuildRole.MEMBER,
      type: 'refresh',
    });

    const tokens = await service.refresh({ refreshToken: 'r' });

    expect(tokens.user.role).toBe(GuildRole.LEADER);
  });
});
