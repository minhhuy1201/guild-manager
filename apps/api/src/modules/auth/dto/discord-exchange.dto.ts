import { discordExchangeSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body of the login-code exchange request.
 * Shares its schema with the frontend (packages/shared/schemas) so the two cannot drift.
 */
export class DiscordExchangeDto extends createZodDto(discordExchangeSchema) {}
