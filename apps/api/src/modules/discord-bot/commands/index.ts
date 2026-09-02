import type { SlashCommand, SlashCommandDefinition } from './command.types';
import { diemDanhHoCommand } from './diem-danh-ho.command';
import { diemDanhCommand } from './diem-danh.command';
import { pingCommand } from './ping.command';

/**
 * Every command the bot answers.
 *
 * Adding a command is: one new file next to this one, one line here. Nothing else in the module
 * changes.
 */
export const commands: readonly SlashCommand[] = [
  pingCommand,
  diemDanhCommand,
  diemDanhHoCommand,
];

/** Exactly what `discord:register` sends to Discord. */
export const commandDefinitions: readonly SlashCommandDefinition[] =
  commands.map((command) => command.definition);
