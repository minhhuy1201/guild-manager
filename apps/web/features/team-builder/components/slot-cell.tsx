"use client";

import { useDroppable } from "@dnd-kit/core";

import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import type { SlotDropData } from "../lib/dnd-data";
import type { Slot } from "../types/formation";
import { DraggableMember } from "./draggable-member";
import { MemberCard } from "./member-card";
import { SlotPlaceholder } from "./slot-placeholder";

interface SlotCellProps {
  /** Slot this cell renders */
  slot: Slot;
  /** Character currently standing here, if any */
  character?: Character;
  /** Render without drag handles — a past week or a battle already fought */
  readOnly?: boolean;
  /** Why the occupant needs attention, e.g. they dropped out of this battle */
  absentReason?: string;
}

/**
 * One droppable cell of the formation. Every slot accepts every guild class —
 * the placeholder only suggests who fits, it never constrains.
 * @param slot - Slot this cell renders
 * @param character - Character currently standing here, if any
 * @param readOnly - Render without drag handles
 * @param absentReason - Why the occupant needs attention, if any
 * @returns Droppable cell holding either a draggable member or a placeholder
 */
export function SlotCell({
  slot,
  character,
  readOnly = false,
  absentReason,
}: SlotCellProps) {
  const data: SlotDropData = { type: "slot", slotId: slot.id };
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-11 items-center rounded-md transition-colors",
        !character && "border border-dashed border-border bg-muted/30",
        !readOnly && isOver && "ring-2 ring-primary"
      )}
    >
      {character ? (
        readOnly ? (
          <MemberCard character={character} warning={absentReason} />
        ) : (
          <DraggableMember
            character={character}
            from={slot.id}
            warning={absentReason}
          />
        )
      ) : (
        <SlotPlaceholder slot={slot} />
      )}
    </div>
  );
}
