import { markAttendanceSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the attendance request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class MarkAttendanceDto extends createZodDto(markAttendanceSchema) {}
