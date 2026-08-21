import { GUILD_CLASS_LABEL } from "@guild/shared/enums";

import type { Slot } from "../types/formation";

interface SlotPlaceholderProps {
  /** The empty slot being described */
  slot: Slot;
}

/**
 * Content of an empty slot: the suggested guild class, or a neutral hint when
 * the position suggests nothing. Only a hint — the slot takes anyone either way.
 * @param slot - The empty slot being described
 * @returns Muted label describing what belongs in this slot
 */
export function SlotPlaceholder({ slot }: SlotPlaceholderProps) {
  const label = slot.suggestedClass
    ? GUILD_CLASS_LABEL[slot.suggestedClass]
    : "Ô trống";

  return (
    <span className="truncate px-2 text-xs text-muted-foreground">{label}</span>
  );
}
