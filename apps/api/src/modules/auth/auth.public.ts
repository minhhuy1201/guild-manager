/**
 * Public API of the auth module.
 *
 * This is the only file other modules may import code from; every other file in this directory is
 * internal (the module boundary rule in `eslint.config.mjs`).
 *
 * Only the two pure identity rules are exposed. `AuthService` stays internal: nobody outside owns
 * a login, and the Discord bot needs the *rules*, not the OAuth flow.
 */
export { isRescueAdmin, resolveGuildRole } from './actor-identity';
