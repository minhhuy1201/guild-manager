import { markAttendanceSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request điểm danh.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class MarkAttendanceDto extends createZodDto(markAttendanceSchema) {}
