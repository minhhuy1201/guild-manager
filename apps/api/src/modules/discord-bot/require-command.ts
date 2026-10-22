import type { GrantableCommand } from '@guild/shared/enums';
import { canRunCommand } from '@guild/shared/lib';

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

/** Outcome of the command check: either the resolved caller, or the reply to answer them with. */
export type AdminCheck =
  { ok: true; caller: ResolvedActor } | { ok: false; reply: CommandReply };

/**
 * Resolve the caller of an admin-only slash command and refuse anyone who may not run it: an Admin,
 * or a Manager granted this very command.
 *
 * Both refusals are ephemeral and both are the command's own business, so the caller gets the reply
 * back rather than an exception: by the time a service could refuse, a public command like
 * `/thong-bao` would already have posted its message.
 *
 * The two guards keep their order — "you are not linked to a character" comes before "you may not
 * run this", because an unlinked caller has no role to judge in the first place.
 *
 * @param interaction - The validated command invocation
 * @param deps - The services the command may use
 * @param command - The `GrantableCommand` value of the command being run
 * @param refusal - Sentence shown to a linked caller who may not run it, in that command's words
 * @returns The resolved caller when they may proceed, otherwise the refusal to reply with
 */
export async function requireCommand(
  interaction: ApplicationCommandInteraction,
  deps: CommandDeps,
  command: GrantableCommand,
  refusal: string,
): Promise<AdminCheck> {
  const resolved = await deps.actors.resolve(callerDiscordId(interaction));

  if (!resolved) return { ok: false, reply: ephemeralText(NOT_LINKED) };

  if (!canRunCommand(resolved.actor, command)) {
    return { ok: false, reply: ephemeralText(refusal) };
  }

  return { ok: true, caller: resolved };
}
