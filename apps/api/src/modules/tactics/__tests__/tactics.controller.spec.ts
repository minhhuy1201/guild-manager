import { AdminGuard, JwtAuthGuard } from '../../../common';
import { emptyScene } from '../tactics.codec';
import { TacticsController } from '../tactics.controller';

/**
 * Guards Nest would apply to one handler of this controller.
 * @param handler - Name of the handler method
 * @returns The guards attached to it, empty when it has none
 */
function guardsOf(handler: keyof TacticsController): unknown[] {
  // Metadata is read off the method reference and the method is never called, so the usual
  // unbound-method hazard does not apply here.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const method = TacticsController.prototype[handler] as object;

  return (Reflect.getMetadata('__guards__', method) ?? []) as unknown[];
}

describe('TacticsController', () => {
  const service = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    saveStages: jest.fn(),
    remove: jest.fn(),
    listPresets: jest.fn(),
    createPreset: jest.fn(),
    removePreset: jest.fn(),
  };
  const controller = new TacticsController(service as never);

  it('requires a session for the whole controller', () => {
    expect(Reflect.getMetadata('__guards__', TacticsController)).toContain(
      JwtAuthGuard,
    );
  });

  it.each([
    'create',
    'update',
    'saveStages',
    'remove',
    'createPreset',
    'removePreset',
  ] as const)('guards the write handler %s with AdminGuard', (handler) => {
    expect(guardsOf(handler)).toContain(AdminGuard);
  });

  it.each(['list', 'get', 'listPresets'] as const)(
    'leaves the read handler %s open to any member',
    (handler) => {
      expect(guardsOf(handler)).not.toContain(AdminGuard);
    },
  );

  it('passes the id and the scene through to the service', async () => {
    await controller.saveStages('t1', { scene: emptyScene() });

    expect(service.saveStages).toHaveBeenCalledWith('t1', emptyScene());
  });
});
