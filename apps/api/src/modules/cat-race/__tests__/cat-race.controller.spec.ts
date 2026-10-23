import { Capability } from '@guild/shared/enums';

import { CapabilityGuard, JwtAuthGuard } from '../../../common';
import { accessOf } from '../../../__tests__/guards-of';
import { CatRaceController } from '../cat-race.controller';

describe('CatRaceController', () => {
  it('needs the cat race Capability as a whole', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      CatRaceController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, CapabilityGuard]);
    expect(accessOf(CatRaceController)).toEqual({
      kind: 'capability',
      capability: Capability.CAT_RACE,
    });
  });

  it('hands the signed-in admin to create and draw', async () => {
    const service = { create: jest.fn(), draw: jest.fn() };
    const controller = new CatRaceController(service as never);
    const user = { sub: 'admin-discord', role: 'ADMIN', type: 'access' };

    await controller.create({ name: 'x' } as never, user as never);
    await controller.draw('e1', { prizeId: 'p1' }, user as never);

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

  it.each([
    ['update', ['e1', { name: 'x' }], 'update'],
    ['setParticipants', ['e1', { participants: [] }], 'setParticipants'],
    ['addPrize', ['e1', { name: 'p' }], 'addPrize'],
    ['updatePrize', ['e1', 'p1', { name: 'p' }], 'updatePrize'],
    ['removePrize', ['e1', 'p1'], 'removePrize'],
    ['setEntrants', ['e1', 'p1', { characterIds: [] }], 'setEntrants'],
    ['voidRound', ['e1', 'r1', { reason: 'x' }], 'voidRound'],
  ] as const)(
    '%s forwards ids and body to the service',
    async (name, args, method) => {
      const service = { [method]: jest.fn().mockResolvedValue('done') };
      const controller = new CatRaceController(service as never);

      const result = await (controller[name] as (...a: unknown[]) => unknown)(
        ...args,
      );

      expect(service[method]).toHaveBeenCalledWith(...args);
      expect(result).toBe('done');
    },
  );
});
