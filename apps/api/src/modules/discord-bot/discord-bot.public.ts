/**
 * Public API of the discord-bot module.
 *
 * This is the only file outside the directory may import code from; everything else here is
 * internal (the module boundary rule in `eslint.config.mjs`). Its consumers are
 * `src/scripts/register-discord-commands.ts` and the `team-builder` module, which announces a day's
 * line-up through `FormationAnnouncerService`.
 */
export { commandDefinitions } from './commands';
export { FormationAnnouncerService } from './formation-announcer.service';
export type { SlashCommandDefinition } from './commands/command.types';
