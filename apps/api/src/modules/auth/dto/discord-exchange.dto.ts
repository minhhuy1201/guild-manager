import { discordExchangeSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request đổi mã đăng nhập lấy token.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class DiscordExchangeDto extends createZodDto(discordExchangeSchema) {}
