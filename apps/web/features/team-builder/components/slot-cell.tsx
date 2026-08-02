"use client";

import { useDroppable } from "@dnd-kit/core";

import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import type { SlotDropData } from "../lib/dnd-data";
import { invalidPlacementReason, isValidPlacement } from "../lib/validation";
import type { Slot } from "../types/formation";
import { DraggableMember } from "./draggable-member";
import { SlotPlaceholder } from "./slot-placeholder";

interface SlotCellProps {
  /** Slot this cell renders */
  slot: Slot;
  /** Character currently standing here, if any */
  character?: Character;
}

/**
 * One droppable cell of the formation. Never rejects a drop — a character of the
 * wrong guild class is accepted and flagged instead, since the admin arranging
 * the formation may be breaking the rule on purpose.
 * @param slot - Slot this cell renders
 * @param character - Character currently standing here, if any
 * @returns Droppable cell holding either a draggable member or a placeholder
 */
export function SlotCell({ slot, character }: SlotCellProps) {
  const data: SlotDropData = { type: "slot", slotId: slot.id };
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, data });

  const invalidReason =
    character && !isValidPlacement(slot, character.guildClass)
      ? invalidPlacementReason(slot)
      : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-11 items-center rounded-md transition-colors",
        !character && "border border-dashed border-border bg-muted/30",
        isOver && "ring-2 ring-primary"
      )}
    >
      {character ? (
        <DraggableMember
          character={character}
          from={slot.id}
          invalidReason={invalidReason}
        />
      ) : (
        <SlotPlaceholder slot={slot} />
      )}
    </div>
  );
}
