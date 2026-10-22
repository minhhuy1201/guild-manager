import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import { GrantLookup, JwtAuthGuard, TOKEN_TYPE } from '../../../common';
import { TacticsController } from '../tactics.controller';
import { TacticsService } from '../tactics.service';

const SECRET = 'test-secret-with-enough-length-0123456789';

/**
 * Walks a tactics write over real HTTP with the real `JwtAuthGuard` and `CapabilityGuard`, signed in
 * as a Manager whose Grants the test changes between requests.
 */
describe('tactics write as a Manager over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;
  let jwt: JwtService;
  const grants = jest.fn();
  const service = {
    create: jest.fn().mockResolvedValue({ id: 't1' }),
    list: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET })],
      controllers: [TacticsController],
      providers: [
        JwtAuthGuard,
        { provide: TacticsService, useValue: service },
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

  /**
   * POST a new tactic as the given role.
   * @param role - Role the access token carries
   * @returns The response status
   */
  async function createAs(role: GuildRole): Promise<number> {
    const token = await jwt.signAsync({
      sub: 'manager-discord-id',
      role,
      type: TOKEN_TYPE.access,
    });
    const response = await fetch(`${baseUrl}/tactics`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Thủ cổng tây' }),
    });

    return response.status;
  }

  it('Manager có Capability sửa chiến thuật thì ghi được', async () => {
    grants.mockResolvedValue({
      capabilities: [Capability.TACTICS],
      grantedCommands: [],
    });

    expect(await createAs(GuildRole.MANAGER)).toBe(201);
  });

  it('thu Capability thì request kế tiếp bị 403, không cần đăng nhập lại', async () => {
    grants.mockResolvedValueOnce({
      capabilities: [Capability.TACTICS],
      grantedCommands: [],
    });
    grants.mockResolvedValueOnce({ capabilities: [], grantedCommands: [] });

    expect(await createAs(GuildRole.MANAGER)).toBe(201);
    expect(await createAs(GuildRole.MANAGER)).toBe(403);
  });

  it('Manager chưa có Grant nào bị 403 như Member', async () => {
    grants.mockResolvedValue({ capabilities: [], grantedCommands: [] });

    expect(await createAs(GuildRole.MANAGER)).toBe(403);
    expect(await createAs(GuildRole.MEMBER)).toBe(403);
  });

  it('Capability của vùng khác không mở vùng này', async () => {
    grants.mockResolvedValue({
      capabilities: [Capability.SCHEDULE, Capability.CAT_RACE],
      grantedCommands: Object.values(GrantableCommand),
    });

    expect(await createAs(GuildRole.MANAGER)).toBe(403);
  });

  it('Admin ghi được mà không tốn lần đọc Grant nào', async () => {
    grants.mockClear();

    expect(await createAs(GuildRole.ADMIN)).toBe(201);
    expect(grants).not.toHaveBeenCalled();
  });
});
