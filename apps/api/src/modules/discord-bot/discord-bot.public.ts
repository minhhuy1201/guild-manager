/**
 * Public API of the discord-bot module.
 *
 * This is the only file outside the directory may import code from; everything else here is
 * internal (the module boundary rule in `eslint.config.mjs`). Today its one consumer is
 * `src/scripts/register-discord-commands.ts`.
 */
export { commandDefinitions } from './commands';
export type { SlashCommandDefinition } from './commands/command.types';
