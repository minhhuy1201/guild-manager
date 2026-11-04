import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
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
    renameInsignia: jest.fn().mockResolvedValue({ key: 'scout' }),
    resetInsignia: jest.fn().mockResolvedValue(undefined),
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
    app.useGlobalPipes(new ZodValidationPipe());
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

  describe('Insignia names', () => {
    /**
     * Send an Insignia write as the signed-in role.
     * @param role - Role the access token carries
     * @param method - PUT or DELETE
     * @param key - The path segment naming the Insignia
     * @param body - JSON body, when the call has one
     * @returns The response status
     */
    async function insigniaAs(
      role: GuildRole,
      method: 'PUT' | 'DELETE',
      key: string,
      body?: unknown,
    ): Promise<number> {
      const token = await jwt.signAsync({
        sub: 'manager-discord-id',
        role,
        type: TOKEN_TYPE.access,
      });
      const response = await fetch(`${baseUrl}/tactics/insignia/${key}`, {
        method,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      return response.status;
    }

    it('lets a Manager with the Capability rename and restore', async () => {
      lookup.mockResolvedValue(stored(GuildRole.MANAGER, [Capability.TACTICS]));

      expect(
        await insigniaAs(GuildRole.MANAGER, 'PUT', 'scout', {
          label: 'Do thám',
        }),
      ).toBe(200);
      expect(service.renameInsignia).toHaveBeenCalledWith('scout', 'Do thám');
      expect(await insigniaAs(GuildRole.MANAGER, 'DELETE', 'scout')).toBe(204);
      expect(service.resetInsignia).toHaveBeenCalledWith('scout');
    });

    it('answers a Member 403 on both', async () => {
      lookup.mockResolvedValue(stored(GuildRole.MEMBER));
      service.renameInsignia.mockClear();
      service.resetInsignia.mockClear();

      expect(
        await insigniaAs(GuildRole.MEMBER, 'PUT', 'scout', {
          label: 'Do thám',
        }),
      ).toBe(403);
      expect(await insigniaAs(GuildRole.MEMBER, 'DELETE', 'scout')).toBe(403);
      expect(service.renameInsignia).not.toHaveBeenCalled();
      expect(service.resetInsignia).not.toHaveBeenCalled();
    });

    it('answers 400 for a key that is not an Insignia', async () => {
      lookup.mockResolvedValue(stored(GuildRole.MANAGER, [Capability.TACTICS]));
      service.renameInsignia.mockClear();
      service.resetInsignia.mockClear();

      expect(
        await insigniaAs(GuildRole.MANAGER, 'PUT', 'nope', {
          label: 'Do thám',
        }),
      ).toBe(400);
      expect(await insigniaAs(GuildRole.MANAGER, 'DELETE', 'nope')).toBe(400);
      expect(service.renameInsignia).not.toHaveBeenCalled();
      expect(service.resetInsignia).not.toHaveBeenCalled();
    });

    it.each([
      ['blank', '   '],
      ['over 40 characters', 'x'.repeat(41)],
    ])('answers 400 for a name that is %s', async (_case, label) => {
      lookup.mockResolvedValue(stored(GuildRole.MANAGER, [Capability.TACTICS]));

      expect(
        await insigniaAs(GuildRole.MANAGER, 'PUT', 'scout', { label }),
      ).toBe(400);
    });
  });
});
