import { saveTeamSettingsSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the save-team-settings request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class SaveTeamSettingsDto extends createZodDto(saveTeamSettingsSchema) {}
