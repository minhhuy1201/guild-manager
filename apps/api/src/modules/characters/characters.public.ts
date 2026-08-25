/**
 * Public API of the characters module.
 *
 * This is the only file other modules may import code from; every other file in this directory is
 * internal (the module boundary rule in `eslint.config.mjs`). The neighbouring `.module.ts` is left
 * with only its Nest DI declaration role.
 *
 * Re-exports only, never importing back from another module — if two `.public.ts` files need each
 * other that is a real domain cycle, and the answer is a third module, not `forwardRef()`.
 */
export { CharactersService } from './characters.service';
export { toCharacter, toGuildMember } from './characters.codec';
export type { CharacterRow, GuildMemberRow } from './characters.codec';
