import { GUILD_CLASS_LABEL } from "@shared/enums";

import type { Slot } from "../types/formation";

interface SlotPlaceholderProps {
  /** The empty slot being described */
  slot: Slot;
}

/**
 * Content of an empty slot: the allowed guild classes, or a neutral hint when
 * the slot takes anyone.
 * @param slot - The empty slot being described
 * @returns Muted label describing what belongs in this slot
 */
export function SlotPlaceholder({ slot }: SlotPlaceholderProps) {
  const allowed = slot.allowedClasses ?? [];

  const label =
    allowed.length === 0
      ? "Ô trống"
      : allowed.map((guildClass) => GUILD_CLASS_LABEL[guildClass]).join(" / ");

  return (
    <span className="truncate px-2 text-xs text-muted-foreground">{label}</span>
  );
}
