import { announceFormationSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of POST /team-builder/formations/:sessionId/announce. */
export class AnnounceFormationDto extends createZodDto(
  announceFormationSchema,
) {}
