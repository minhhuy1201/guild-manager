import { loginSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request đăng nhập.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class LoginDto extends createZodDto(loginSchema) {}
