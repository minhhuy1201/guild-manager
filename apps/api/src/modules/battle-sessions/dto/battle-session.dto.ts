import {
  createBattleSessionSchema,
  updateBattleSessionSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the create-session request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class CreateBattleSessionDto extends createZodDto(
  createBattleSessionSchema,
) {}

/** Body of the edit-session request — every field optional. */
export class UpdateBattleSessionDto extends createZodDto(
  updateBattleSessionSchema,
) {}
