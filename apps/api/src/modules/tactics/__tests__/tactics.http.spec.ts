import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GuildRole } from '@guild/shared/enums';

import { JwtAuthGuard } from '../../../common';
import { emptyScene } from '../tactics.codec';
import { TacticsController } from '../tactics.controller';
import { TacticsService } from '../tactics.service';

/** Every tactics route that writes, with a body the route would accept from an admin. */
const WRITE_ROUTES = [
  ['POST', '/tactics', { name: 'Thủ cổng tây' }],
  ['PATCH', '/tactics/t1', { name: 'Thủ cổng đông' }],
  ['PUT', '/tactics/t1/stages', { scene: emptyScene() }],
  ['DELETE', '/tactics/t1', undefined],
  ['POST', '/tactics/token-presets', { label: 'Đội cảm tử', icon: 'skull' }],
  ['DELETE', '/tactics/token-presets/p1', undefined],
] as const;

/**
 * Walks the tactics routes over real HTTP as a signed-in member. The real `AdminGuard` runs; only
 * the session check is replaced, by one that signs the request in as a member.
 */
describe('tactics routes over HTTP, as a member', () => {
  let app: INestApplication;
  let baseUrl: string;
  // Writes resolve too, so a guard gone missing fails an assertion fast instead of hanging.
  const service = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    saveStages: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue(undefined),
    listPresets: jest.fn().mockResolvedValue([]),
    createPreset: jest.fn().mockResolvedValue({}),
    removePreset: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TacticsController],
      providers: [{ provide: TacticsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user: unknown }>().user = {
            sub: 'member-discord-id',
            role: GuildRole.MEMBER,
            type: 'access',
          };

          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(WRITE_ROUTES)(
    'answers %s %s with 403 and never reaches the service',
    async (method, path, body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      expect(response.status).toBe(403);
      for (const write of [
        service.create,
        service.update,
        service.saveStages,
        service.remove,
        service.createPreset,
        service.removePreset,
      ]) {
        expect(write).not.toHaveBeenCalled();
      }
    },
  );

  it('lets the member read the list and the presets', async () => {
    const list = await fetch(`${baseUrl}/tactics`);
    const presets = await fetch(`${baseUrl}/tactics/token-presets`);

    expect(list.status).toBe(200);
    expect(presets.status).toBe(200);
  });
});
