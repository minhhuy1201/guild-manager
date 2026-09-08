import { weekStartQuerySchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Query string of every week-scoped `GET`: `/battle-sessions`, `/attendance/records`,
 * `/attendance/summary` and `/team-builder/formations`.
 *
 * One class rather than one per module: the four endpoints do not merely happen to share a shape,
 * they take the same `weekStart` and answer it the same way, so a copy that drifted would be a bug
 * in one endpoint rather than a variation. Its schema comes from packages/shared, which is what
 * keeps the frontend's query builder in step.
 */
export class WeekStartQueryDto extends createZodDto(weekStartQuerySchema) {}
