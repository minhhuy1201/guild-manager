import { canManageGuild } from '@guild/shared/lib';

import { NOT_LINKED } from './attendance-board';
import type { CommandDeps, CommandReply } from './commands/command.types';
import { callerDiscordId } from './interaction.schema';
import type { ApplicationCommandInteraction } from './interaction.schema';
import { ephemeralText } from './reply';
import type { ResolvedActor } from './actor-resolver';

/**
 * Lives here rather than in `commands/` for the same reason `reply.ts` does: the router imports the
 * command registry, so a helper the commands need must sit outside the router's own file.
 */

/** Outcome of the admin check: either the resolved caller, or the reply to answer them with. */
export type AdminCheck =
  { ok: true; caller: ResolvedActor } | { ok: false; reply: CommandReply };

/**
 * Resolve the caller of an admin-only slash command and refuse anyone who may not run it.
 *
 * Both refusals are ephemeral and both are the command's own business, so the caller gets the reply
 * back rather than an exception: by the time a service could refuse, a public command like
 * `/thong-bao` would already have posted its message.
 *
 * The two guards keep their order — "you are not linked to a character" comes before "you are not an
 * admin", because an unlinked caller has no role to judge in the first place.
 *
 * @param interaction - The validated command invocation
 * @param deps - The services the command may use
 * @param adminOnly - Sentence shown to a linked member who is not an admin, in that command's words
 * @returns The resolved caller when they may proceed, otherwise the refusal to reply with
 */
export async function requireAdmin(
  interaction: ApplicationCommandInteraction,
  deps: CommandDeps,
  adminOnly: string,
): Promise<AdminCheck> {
  const resolved = await deps.actors.resolve(callerDiscordId(interaction));

  if (!resolved) return { ok: false, reply: ephemeralText(NOT_LINKED) };

  if (!canManageGuild(resolved.actor.role)) {
    return { ok: false, reply: ephemeralText(adminOnly) };
  }

  return { ok: true, caller: resolved };
}
