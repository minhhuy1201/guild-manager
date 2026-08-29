import { saveTeamNamesSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the save-team-names request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class SaveTeamNamesDto extends createZodDto(saveTeamNamesSchema) {}
