import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { Capability } from '@guild/shared/enums';

/** Metadata key `CapabilityGuard` reads the route's requirement from. */
export const ACCESS_REQUIREMENT_METADATA = 'accessRequirement';

/** What a route demands of its caller. */
export type AccessRequirement =
  { kind: 'capability'; capability: Capability } | { kind: 'admin' };

/**
 * Declares the Capability a route needs; `CapabilityGuard` enforces it.
 * A method-level declaration overrides a controller-level one.
 * @param capability - The area the route works in
 * @returns The decorator that sets the requirement metadata
 */
export const RequireCapability = (capability: Capability): CustomDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_METADATA, {
    kind: 'capability',
    capability,
  } satisfies AccessRequirement);

/**
 * Declares a route only an Admin may call: changing roles or Grants, deleting members. Never a
 * Capability, so no Grant can open it.
 * @returns The decorator that sets the requirement metadata
 */
export const RequireAdmin = (): CustomDecorator =>
  SetMetadata(ACCESS_REQUIREMENT_METADATA, {
    kind: 'admin',
  } satisfies AccessRequirement);
