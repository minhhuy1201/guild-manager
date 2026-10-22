/**
 * Public API of the auth module.
 *
 * This is the only file other modules may import code from; every other file in this directory is
 * internal (the module boundary rule in `eslint.config.mjs`).
 *
 * Only the identity lookup is exposed. `AuthService` stays internal: nobody outside owns a login,
 * and the Discord bot needs to know *who someone is*, not the OAuth flow.
 */
export { ActorLookupService } from './actor-lookup.service';
export type { ResolvedIdentity } from './actor-lookup.service';
