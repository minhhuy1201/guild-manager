import { refreshTokenSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request xin cặp token mới.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
