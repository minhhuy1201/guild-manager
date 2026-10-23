import { Capability } from '@guild/shared/enums';

import { CapabilityGuard, JwtAuthGuard } from '../../../common';
import { accessOf } from '../../../__tests__/guards-of';
import { CatRaceAnnounceController } from '../cat-race-announce.controller';

describe('CatRaceAnnounceController', () => {
  it('needs the cat race Capability', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      CatRaceAnnounceController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, CapabilityGuard]);
    expect(accessOf(CatRaceAnnounceController)).toEqual({
      kind: 'capability',
      capability: Capability.CAT_RACE,
    });
  });

  it('posts first, then returns the event as it stands after the post', async () => {
    const announcer = { announce: jest.fn().mockResolvedValue(undefined) };
    const catRace = { detail: jest.fn().mockResolvedValue({ id: 'e1' }) };
    const controller = new CatRaceAnnounceController(
      announcer as never,
      catRace as never,
    );

    const result = await controller.announce('e1');

    expect(announcer.announce).toHaveBeenCalledWith('e1');
    expect(result).toEqual({ id: 'e1' });
    expect(announcer.announce.mock.invocationCallOrder[0]).toBeLessThan(
      catRace.detail.mock.invocationCallOrder[0],
    );
  });

  it('does not read the event when the post fails', async () => {
    const announcer = { announce: jest.fn().mockRejectedValue(new Error('x')) };
    const catRace = { detail: jest.fn() };
    const controller = new CatRaceAnnounceController(
      announcer as never,
      catRace as never,
    );

    await expect(controller.announce('e1')).rejects.toThrow('x');
    expect(catRace.detail).not.toHaveBeenCalled();
  });
});
