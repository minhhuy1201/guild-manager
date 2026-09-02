import { cauHinhKenhCommand } from './cau-hinh-kenh.command';
import type { SlashCommand, SlashCommandDefinition } from './command.types';
import { diemDanhHoCommand } from './diem-danh-ho.command';
import { diemDanhCommand } from './diem-danh.command';
import { nhacDiemDanhCommand } from './nhac-diem-danh.command';
import { pingCommand } from './ping.command';
import { thongBaoCommand } from './thong-bao.command';

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
  thongBaoCommand,
  cauHinhKenhCommand,
  nhacDiemDanhCommand,
];

/** Exactly what `discord:register` sends to Discord. */
export const commandDefinitions: readonly SlashCommandDefinition[] =
  commands.map((command) => command.definition);
