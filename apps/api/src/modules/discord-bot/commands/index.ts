import type { SlashCommand, SlashCommandDefinition } from './command.types';
import { pingCommand } from './ping.command';

/**
 * Every command the bot answers.
 *
 * Adding a command is: one new file next to this one, one line here. Nothing else in the module
 * changes.
 */
export const commands: readonly SlashCommand[] = [pingCommand];

/** Exactly what `discord:register` sends to Discord. */
export const commandDefinitions: readonly SlashCommandDefinition[] =
  commands.map((command) => command.definition);
