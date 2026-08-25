import 'reflect-metadata';

/** Metadata key Nest uses to store a class's or method's guard list. */
const GUARDS_METADATA = '__guards__';

/**
 * Read the guards Nest attached to a controller.
 *
 * Lives in `src/__tests__` rather than inside a module: each module asserts its own guards (the
 * boundary rule forbids one module's tests importing another's controller), so the helper must sit
 * outside every module for all three to share it.
 * @param target - The controller class
 * @param method - Method name to read; omit for class-level guards
 * @returns The guard classes, empty when the route has none of its own
 */
export function guardsOf(target: object, method?: string): unknown[] {
  const source = method
    ? (target as { prototype: Record<string, object> }).prototype[method]
    : target;

  return (Reflect.getMetadata(GUARDS_METADATA, source) as unknown[]) ?? [];
}
