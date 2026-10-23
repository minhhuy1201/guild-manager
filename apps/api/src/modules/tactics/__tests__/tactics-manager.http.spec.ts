import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import { ActorLookup, JwtAuthGuard, TOKEN_TYPE } from '../../../common';
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
  const lookup = jest.fn();

  /**
   * Make the lookup answer as the database now stands.
   * @param role - Role stored for the caller
   * @param capabilities - Capabilities stored for the caller
   */
  function stored(role: GuildRole, capabilities: Capability[] = []) {
    return { role, capabilities, grantedCommands: [] };
  }
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
        { provide: ActorLookup, useValue: { current: lookup } },
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
    lookup.mockResolvedValue(stored(GuildRole.MANAGER, [Capability.TACTICS]));

    expect(await createAs(GuildRole.MANAGER)).toBe(201);
  });

  it('thu Capability thì request kế tiếp bị 403, không cần đăng nhập lại', async () => {
    lookup.mockResolvedValueOnce(
      stored(GuildRole.MANAGER, [Capability.TACTICS]),
    );
    lookup.mockResolvedValueOnce(stored(GuildRole.MANAGER));

    expect(await createAs(GuildRole.MANAGER)).toBe(201);
    expect(await createAs(GuildRole.MANAGER)).toBe(403);
  });

  it('Manager chưa có Grant nào bị 403 như Member', async () => {
    lookup.mockResolvedValue(stored(GuildRole.MANAGER));

    expect(await createAs(GuildRole.MANAGER)).toBe(403);
    expect(await createAs(GuildRole.MEMBER)).toBe(403);
  });

  it('Capability của vùng khác không mở vùng này', async () => {
    lookup.mockResolvedValue({
      role: GuildRole.MANAGER,
      capabilities: [Capability.SCHEDULE, Capability.CAT_RACE],
      grantedCommands: Object.values(GrantableCommand),
    });

    expect(await createAs(GuildRole.MANAGER)).toBe(403);
  });

  it('Admin ghi được', async () => {
    lookup.mockResolvedValue(stored(GuildRole.ADMIN));

    expect(await createAs(GuildRole.ADMIN)).toBe(201);
  });

  it('token Manager cũ mà hàng giờ là Member thì bị 403 dù từng có Capability', async () => {
    lookup.mockResolvedValue(stored(GuildRole.MEMBER));

    expect(await createAs(GuildRole.MANAGER)).toBe(403);
  });

  it('token Admin cũ mà hàng giờ là Quản lý chưa có Grant thì bị 403', async () => {
    lookup.mockResolvedValue(stored(GuildRole.MANAGER));

    expect(await createAs(GuildRole.ADMIN)).toBe(403);
  });

  it('Member vẫn bị 403 khi hàng vẫn là Member', async () => {
    lookup.mockResolvedValue(stored(GuildRole.MEMBER));

    expect(await createAs(GuildRole.MEMBER)).toBe(403);
  });

  it('token Member cũ mà hàng giờ là Quản lý có Capability thì ghi được ngay request kế tiếp', async () => {
    lookup.mockResolvedValueOnce(stored(GuildRole.MEMBER));
    lookup.mockResolvedValueOnce(
      stored(GuildRole.MANAGER, [Capability.TACTICS]),
    );

    expect(await createAs(GuildRole.MEMBER)).toBe(403);
    // Same token, no new login: the promotion applies on the next request.
    expect(await createAs(GuildRole.MEMBER)).toBe(201);
  });
});
