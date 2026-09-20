import { TacticsController } from '../tactics.controller';
import { TacticsModule } from '../tactics.module';
import { TacticsService } from '../tactics.service';

/**
 * Read one piece of a module's Nest metadata.
 * Metadata rather than a booted testing module: `PrismaService` comes from the global
 * `PrismaModule`, so booting this module alone could only prove that global is missing.
 * @param key - The metadata key to read
 * @returns Whatever the decorator recorded, empty when the key is absent
 */
function metadataOf(key: string): unknown[] {
  return (Reflect.getMetadata(key, TacticsModule) as unknown[]) ?? [];
}

describe('TacticsModule', () => {
  it('registers the controller and the service', () => {
    expect(metadataOf('controllers')).toEqual([TacticsController]);
    expect(metadataOf('providers')).toEqual([TacticsService]);
  });

  it('imports nothing and exports nothing — no module depends on tactics today', () => {
    expect(metadataOf('imports')).toEqual([]);
    expect(metadataOf('exports')).toEqual([]);
  });
});
