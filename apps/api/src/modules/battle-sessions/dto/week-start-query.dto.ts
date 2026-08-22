import { weekStartQuerySchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Query string của `GET /battle-sessions`.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class WeekStartQueryDto extends createZodDto(weekStartQuerySchema) {}
