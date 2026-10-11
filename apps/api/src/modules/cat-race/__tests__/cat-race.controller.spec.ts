import { AdminGuard, JwtAuthGuard } from '../../../common';
import { CatRaceController } from '../cat-race.controller';

describe('CatRaceController', () => {
  it('is admin-only as a whole', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      CatRaceController,
    ) as unknown[];

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, AdminGuard]));
  });

  it('hands the signed-in admin to create and draw', async () => {
    const service = { create: jest.fn(), draw: jest.fn() };
    const controller = new CatRaceController(service as never);
    const user = { sub: 'admin-discord', role: 'ADMIN', type: 'access' };

    await controller.create({ name: 'x' } as never, user as never);
    await controller.draw('e1', { prizeId: 'p1' } as never, user as never);

    expect(service.create).toHaveBeenCalledWith({ name: 'x' }, 'admin-discord');
    expect(service.draw).toHaveBeenCalledWith(
      'e1',
      { prizeId: 'p1' },
      'admin-discord',
    );
  });

  it.each([
    ['list', []],
    ['prefill', []],
    ['get', ['e1']],
    ['remove', ['e1']],
    ['end', ['e1']],
  ] as const)('%s forwards to the service', async (name, args) => {
    const service = {
      list: jest.fn(),
      prefill: jest.fn(),
      detail: jest.fn(),
      remove: jest.fn(),
      end: jest.fn(),
    };
    const controller = new CatRaceController(service as never);
    const method = name === 'get' ? 'detail' : name;

    await (controller[name] as (...a: unknown[]) => unknown)(...args);

    expect(service[method]).toHaveBeenCalledWith(...args);
  });
});
