import { z } from 'zod';

import { INTERACTION_TYPE } from './discord.constants';

/**
 * These shapes stay in this module instead of `packages/shared`.
 *
 * The shared package owns the api ↔ web contract; this payload is defined by Discord and the web
 * app never touches it. Putting it there would claim ownership of a shape we only read.
 */
const discordUserSchema = z.object({ id: z.string().min(1) });

/**
 * Who triggered the interaction. Discord puts them under `member` in a server and under `user` in a
 * DM, and never sends both — so both are optional here and `callerDiscordId` reads out the one
 * that came.
 */
const invokerFields = {
  member: z.object({ user: discordUserSchema }).optional(),
  user: discordUserSchema.optional(),
};

/**
 * One filled-in option of a slash command. `value` is typed as a string because the only option the
 * bot declares is a USER, whose value is a Discord ID.
 */
const commandOptionSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

const pingInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.ping),
});

const applicationCommandInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.applicationCommand),
  /**
   * Channel the command was typed in, snake_case because this is Discord's payload. Required:
   * `/cau-hinh-kenh` reads it instead of making an admin copy a channel id by hand, and Discord
   * always sends it for a command used in a server — the bot registers guild commands only.
   */
  channel_id: z.string().min(1),
  data: z.object({
    name: z.string().min(1),
    options: z.array(commandOptionSchema).optional(),
  }),
  ...invokerFields,
});

const messageComponentInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.messageComponent),
  // snake_case because this is Discord's payload, read verbatim.
  data: z.object({ custom_id: z.string().min(1) }),
  ...invokerFields,
});

/**
 * Every interaction the bot accepts. An unlisted `type` fails here, at the edge.
 *
 * That failure is a raw `ZodError`, not an `HttpException`, so `AllExceptionsFilter` answers 500 and
 * logs it as if it were a bug. An autocomplete or modal-submit interaction would land there — the
 * bot declares neither — and whoever reads that log later needs to know the 500 is this rejection
 * working, not a crash.
 */
export const interactionSchema = z.discriminatedUnion('type', [
  pingInteractionSchema,
  applicationCommandInteractionSchema,
  messageComponentInteractionSchema,
]);

/** A validated interaction, narrowed by `type`. */
export type Interaction = z.infer<typeof interactionSchema>;

/** A validated slash command invocation. */
export type ApplicationCommandInteraction = z.infer<
  typeof applicationCommandInteractionSchema
>;

/** A validated button press. */
export type MessageComponentInteraction = z.infer<
  typeof messageComponentInteractionSchema
>;

/**
 * Discord ID of whoever triggered the interaction.
 *
 * This is the bot's only trustworthy identity: it arrived inside a payload the Ed25519 signature
 * covers. Anything carried in a `custom_id` is client data and is never used in its place.
 *
 * @param interaction - A command invocation or a button press
 * @returns The caller's Discord ID
 * @throws Error when neither `member.user` nor `user` is present — Discord always sends one, so
 *   this is a payload we misread, not something a user can cause
 */
export function callerDiscordId(
  interaction: ApplicationCommandInteraction | MessageComponentInteraction,
): string {
  const id = interaction.member?.user.id ?? interaction.user?.id;

  if (!id) {
    throw new Error('Interaction không mang định danh người gọi.');
  }

  return id;
}

/**
 * Value of one slash command option.
 * @param interaction - The command invocation
 * @param name - Option name as declared in the command definition
 * @returns The value, or null when the option was not filled in
 */
export function commandOptionValue(
  interaction: ApplicationCommandInteraction,
  name: string,
): string | null {
  const option = interaction.data.options?.find(
    (candidate) => candidate.name === name,
  );

  return option?.value ?? null;
}
