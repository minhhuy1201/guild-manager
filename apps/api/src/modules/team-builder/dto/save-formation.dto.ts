import { saveFormationSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the save-formation request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class SaveFormationDto extends createZodDto(saveFormationSchema) {}
