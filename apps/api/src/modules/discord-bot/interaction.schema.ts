import { z } from 'zod';

import { INTERACTION_TYPE } from './discord.constants';

/**
 * These shapes stay in this module instead of `packages/shared`.
 *
 * The shared package owns the api ↔ web contract; this payload is defined by Discord and the web
 * app never touches it. Putting it there would claim ownership of a shape we only read.
 */
const pingInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.ping),
});

const applicationCommandInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.applicationCommand),
  data: z.object({ name: z.string().min(1) }),
});

/**
 * Every interaction the bot accepts. An unlisted `type` fails here, at the edge.
 *
 * That failure is a raw `ZodError`, not an `HttpException`, so `AllExceptionsFilter` answers 500 and
 * logs it as if it were a bug. Nothing reaches it today — the bot has no buttons and no command
 * declares autocomplete — but a correctly signed `MESSAGE_COMPONENT` or autocomplete interaction
 * would, and whoever reads that log later needs to know the 500 is this rejection working, not a
 * crash.
 */
export const interactionSchema = z.discriminatedUnion('type', [
  pingInteractionSchema,
  applicationCommandInteractionSchema,
]);

/** A validated interaction, narrowed by `type`. */
export type Interaction = z.infer<typeof interactionSchema>;

/** A validated slash command invocation. */
export type ApplicationCommandInteraction = z.infer<
  typeof applicationCommandInteractionSchema
>;
