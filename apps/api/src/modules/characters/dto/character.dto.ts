import {
  createCharacterSchema,
  updateCharacterSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the create-member request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class CreateCharacterDto extends createZodDto(createCharacterSchema) {}

/** Body of the edit-member request — every field optional. */
export class UpdateCharacterDto extends createZodDto(updateCharacterSchema) {}
