import {
  createTacticSchema,
  createTokenPresetSchema,
  saveTacticStagesSchema,
  updateTacticSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of POST /tactics. */
export class CreateTacticDto extends createZodDto(createTacticSchema) {}

/** Body of PATCH /tactics/:id. */
export class UpdateTacticDto extends createZodDto(updateTacticSchema) {}

/** Body of PUT /tactics/:id/stages — the whole scene document. */
export class SaveTacticStagesDto extends createZodDto(saveTacticStagesSchema) {}

/** Body of POST /tactics/token-presets. */
export class CreateTokenPresetDto extends createZodDto(
  createTokenPresetSchema,
) {}
