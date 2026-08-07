import {
  createCharacterSchema,
  updateCharacterSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request thêm thành viên.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class CreateCharacterDto extends createZodDto(createCharacterSchema) {}

/** Body của request sửa thành viên — mọi field đều không bắt buộc. */
export class UpdateCharacterDto extends createZodDto(updateCharacterSchema) {}
