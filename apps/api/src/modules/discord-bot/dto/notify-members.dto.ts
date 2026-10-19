import { notifyMembersSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of POST /team-builder/formations/:sessionId/notify-members. */
export class NotifyMembersDto extends createZodDto(notifyMembersSchema) {}
