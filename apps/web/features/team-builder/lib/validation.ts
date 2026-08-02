import { GUILD_CLASS_LABEL, type GuildClass } from "@shared/enums";

import type { Slot } from "../types/formation";

/**
 * Check whether a guild class satisfies a slot's class constraint.
 * Used only for highlighting — dropping is never blocked.
 * @param slot - Slot being filled
 * @param guildClass - Guild class of the character placed there
 * @returns true when the slot has no constraint or the class is allowed
 */
export function isValidPlacement(slot: Slot, guildClass: GuildClass): boolean {
  const allowed = slot.allowedClasses;
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(guildClass);
}

/**
 * Build the Vietnamese tooltip text explaining a slot's class constraint.
 * @param slot - Slot being explained
 * @returns Sentence listing the allowed classes, or an empty string when unconstrained
 */
export function invalidPlacementReason(slot: Slot): string {
  const allowed = slot.allowedClasses ?? [];
  if (allowed.length === 0) return "";

  const names = allowed.map((guildClass) => GUILD_CLASS_LABEL[guildClass]).join(", ");
  return `Ô này dành cho ${names}`;
}
