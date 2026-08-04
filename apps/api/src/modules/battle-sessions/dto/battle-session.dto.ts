import {
  createBattleSessionSchema,
  updateBattleSessionSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request tạo trận.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class CreateBattleSessionDto extends createZodDto(
  createBattleSessionSchema,
) {}

/** Body của request sửa trận — mọi field đều không bắt buộc. */
export class UpdateBattleSessionDto extends createZodDto(
  updateBattleSessionSchema,
) {}
