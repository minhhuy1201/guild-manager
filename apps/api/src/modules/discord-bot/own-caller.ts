import type { RequestActor } from '../../common';
import { NO_OWN_CHARACTER, NOT_LINKED } from './attendance-board';
import type { CommandDeps, CommandReply } from './commands/command.types';
import { ephemeralText } from './reply';

/** The caller's identity and character, or the refusal to show instead. */
export type OwnCaller =
  | { ok: true; actor: RequestActor; characterId: string }
  | { ok: false; reply: CommandReply };

/**
 * Who is acting on their own character: the buttons that change a member's own standing (a leave,
 * Auto-attend) answer nobody else.
 * @param discordId - Discord ID from the signed interaction
 * @param deps - Services the bot reaches
 * @returns The actor with their own character, or a ready-made refusal
 */
export async function resolveOwnCaller(
  discordId: string,
  deps: CommandDeps,
): Promise<OwnCaller> {
  const resolved = await deps.actors.resolve(discordId);
  if (!resolved) return { ok: false, reply: ephemeralText(NOT_LINKED) };
  if (!resolved.character) {
    return { ok: false, reply: ephemeralText(NO_OWN_CHARACTER) };
  }

  return {
    ok: true,
    actor: resolved.actor,
    characterId: resolved.character.id,
  };
}
