import { GUILD_CLASS_OPTIONS, type GuildClass } from "@guild/shared/enums";

import type { PoolCandidate } from "./pool";

/** How many unplaced members one guild class still has. */
export interface ClassCount {
  /** The guild class */
  guildClass: GuildClass;
  /** How many of them are still in the pool */
  count: number;
}

/**
 * Count the unplaced members of each guild class, so the arranger can see what
 * is left to spread across teams. Classes with nobody left are omitted, and the
 * rest keep the declaration order of the enum so the row never reshuffles.
 * @param pool - Members still available to place
 * @returns One entry per class that still has someone, in enum order
 */
export function countByGuildClass(pool: PoolCandidate[]): ClassCount[] {
  const counts = new Map<GuildClass, number>();

  for (const member of pool) {
    counts.set(member.guildClass, (counts.get(member.guildClass) ?? 0) + 1);
  }

  return GUILD_CLASS_OPTIONS.filter((guildClass) => counts.has(guildClass)).map(
    (guildClass) => ({ guildClass, count: counts.get(guildClass) ?? 0 })
  );
}
