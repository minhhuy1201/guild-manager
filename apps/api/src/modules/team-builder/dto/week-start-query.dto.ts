import { weekStartQuerySchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Query string of `GET /team-builder/formations`.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class WeekStartQueryDto extends createZodDto(weekStartQuerySchema) {}
