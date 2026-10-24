import { guardsOf, accessOf } from '../../../__tests__/guards-of';
import { FeaturedRaceController } from '../featured-race.controller';

describe('FeaturedRaceController', () => {
  it('is public: no guard and no access requirement', () => {
    expect(guardsOf(FeaturedRaceController)).toEqual([]);
    expect(guardsOf(FeaturedRaceController, 'list')).toEqual([]);
    expect(accessOf(FeaturedRaceController)).toBeUndefined();
    expect(accessOf(FeaturedRaceController, 'list')).toBeUndefined();
  });

  it('serves under the public prefix, apart from the guarded cat-races', () => {
    expect(Reflect.getMetadata('path', FeaturedRaceController)).toBe(
      'public/featured-races',
    );
  });

  it('forwards to the service', async () => {
    const service = { list: jest.fn().mockResolvedValue(['race']) };

    const result = await new FeaturedRaceController(service as never).list();

    expect(service.list).toHaveBeenCalled();
    expect(result).toEqual(['race']);
  });
});
