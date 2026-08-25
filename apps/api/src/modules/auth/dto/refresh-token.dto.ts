import { refreshTokenSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the new-token-pair request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
