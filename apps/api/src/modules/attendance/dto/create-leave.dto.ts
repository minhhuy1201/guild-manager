import { createLeaveSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of the leave request, shared with the frontend through `packages/shared`. */
export class CreateLeaveDto extends createZodDto(createLeaveSchema) {}
