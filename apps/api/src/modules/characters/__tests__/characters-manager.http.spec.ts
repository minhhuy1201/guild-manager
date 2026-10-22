import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Capability, GuildClass, GuildRole } from '@guild/shared/enums';

import { GrantLookup, JwtAuthGuard, TOKEN_TYPE } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CharactersController } from '../characters.controller';
import { CharactersService } from '../characters.service';

const SECRET = 'test-secret-with-enough-length-0123456789';

/** A Character row as Prisma returns it, in the given role. */
function rowWith(role: GuildRole) {
  return {
    id: 'meo-beo-k7ma3x',
    name: 'Mèo Béo',
    guildClass: GuildClass.CUU_LINH,
    discordId: null,
    discordUsername: null,
    discordAvatar: null,
    lastLoginAt: null,
    role,
    capabilities: [],
    grantedCommands: [],
  };
}

/**
 * Walks the member routes over real HTTP with the real guards and the real member service, signed
 * in as a Manager who holds the members Capability.
 */
describe('member routes as a Manager with the members Capability', () => {
  let app: INestApplication;
  let baseUrl: string;
  let jwt: JwtService;
  const prisma = {
    character: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const grants = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET })],
      controllers: [CharactersController],
      providers: [
        JwtAuthGuard,
        CharactersService,
        { provide: PrismaService, useValue: prisma },
        { provide: GrantLookup, useValue: { forDiscordId: grants } },
      ],
    }).compile();

    jwt = moduleRef.get(JwtService);
    app = moduleRef.createNestApplication();
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    grants.mockResolvedValue({
      capabilities: [Capability.MEMBERS],
      grantedCommands: [],
    });
    prisma.character.create.mockResolvedValue(rowWith(GuildRole.MEMBER));
    prisma.character.update.mockResolvedValue(rowWith(GuildRole.MEMBER));
    prisma.character.delete.mockResolvedValue(rowWith(GuildRole.MEMBER));
  });

  /**
   * Send a request signed in as the Manager.
   * @param method - HTTP method
   * @param path - Path under the controller
   * @param body - JSON body, if any
   * @returns The response status
   */
  async function asManager(
    method: string,
    path: string,
    body?: object,
  ): Promise<number> {
    const token = await jwt.signAsync({
      sub: 'manager-discord-id',
      role: GuildRole.MANAGER,
      type: TOKEN_TYPE.access,
    });
    const response = await fetch(`${baseUrl}/characters${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: body && JSON.stringify(body),
    });

    return response.status;
  }

  it('thêm thành viên mới, vai luôn là Member dù body gửi vai khác', async () => {
    const status = await asManager('POST', '', {
      name: 'Mèo Mới',
      guildClass: GuildClass.THIET_Y,
      role: GuildRole.ADMIN,
    });

    expect(status).toBe(201);
    const [[args]] = prisma.character.create.mock.calls as [
      [{ data: Record<string, unknown> }],
    ];
    expect(args.data).not.toHaveProperty('role');
  });

  it('sửa tên của một Member', async () => {
    prisma.character.findUnique.mockResolvedValue({ role: GuildRole.MEMBER });

    expect(await asManager('PATCH', '/m1', { name: 'Mèo Mập' })).toBe(200);
  });

  it.each([GuildRole.MANAGER, GuildRole.ADMIN])(
    'sửa hàng của %s bị 403',
    async (role) => {
      prisma.character.findUnique.mockResolvedValue({ role });

      expect(await asManager('PATCH', '/m1', { name: 'Mèo Mập' })).toBe(403);
      expect(prisma.character.update).not.toHaveBeenCalled();
    },
  );

  it('đổi vai hay Grant bị 403, kể cả cho chính mình', async () => {
    prisma.character.findUnique.mockResolvedValue({ role: GuildRole.MEMBER });

    expect(await asManager('PATCH', '/m1', { role: GuildRole.MANAGER })).toBe(
      403,
    );
    expect(
      await asManager('PATCH', '/m1', { capabilities: [Capability.MEMBERS] }),
    ).toBe(403);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it('xóa bất kỳ ai bị 403, kể cả một Member', async () => {
    prisma.character.findUnique.mockResolvedValue({ role: GuildRole.MEMBER });

    expect(await asManager('DELETE', '/m1')).toBe(403);
    expect(prisma.character.delete).not.toHaveBeenCalled();
  });

  it('mất Capability thành viên thì cả danh sách lẫn thao tác đều 403', async () => {
    grants.mockResolvedValue({ capabilities: [], grantedCommands: [] });

    expect(await asManager('GET', '')).toBe(403);
    expect(
      await asManager('POST', '', {
        name: 'X',
        guildClass: GuildClass.THIET_Y,
      }),
    ).toBe(403);
  });
});
