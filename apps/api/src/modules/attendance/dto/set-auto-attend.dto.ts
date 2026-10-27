import { setAutoAttendSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of the Auto-attend switch, shared with the frontend through `packages/shared`. */
export class SetAutoAttendDto extends createZodDto(setAutoAttendSchema) {}
