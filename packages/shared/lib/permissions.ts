import { GuildRole } from "../enums/role.enum";
import type { Capability } from "../enums/capability.enum";
import type { GrantableCommand } from "../enums/grantable-command.enum";

/**
 * Who is asking: a role plus the Grants held by that one person. A Grant array that is absent counts
 * as empty, so a caller that only knows the role (a JWT payload, the proxy) can ask too.
 */
export interface Actor {
  role: GuildRole;
  capabilities?: readonly Capability[];
  grantedCommands?: readonly GrantableCommand[];
}

/**
 * Whether the actor may work in one area of guild management. The single decision behind every
 * management check in the app: an Admin always may, a Member never may, a Manager only with the
 * Capability granted to them.
 * @param actor - The signed-in user's role and Grants
 * @param capability - The area being entered
 * @returns true when allowed
 */
export function can(actor: Actor, capability: Capability): boolean {
  if (actor.role === GuildRole.ADMIN) return true;
  if (actor.role === GuildRole.MEMBER) return false;

  return actor.capabilities?.includes(capability) ?? false;
}

/**
 * Whether the actor may run an admin-only Discord command. Independent of `can`: a command Grant
 * never needs a Capability and a Capability never opens a command.
 * @param actor - The caller's role and Grants
 * @param command - The command being run
 * @returns true when allowed
 */
export function canRunCommand(
  actor: Actor,
  command: GrantableCommand,
): boolean {
  if (actor.role === GuildRole.ADMIN) return true;
  if (actor.role === GuildRole.MEMBER) return false;

  return actor.grantedCommands?.includes(command) ?? false;
}
