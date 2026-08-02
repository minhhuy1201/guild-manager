import { saveFormationSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request lưu đội hình.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class SaveFormationDto extends createZodDto(saveFormationSchema) {}
