"use client";

import { useDroppable } from "@dnd-kit/core";

import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import type { SlotDropData } from "../lib/dnd-data";
import type { Slot } from "../types/formation";
import { DraggableMember } from "./draggable-member";
import { MemberCard } from "./member-card";
import { SlotNoteInput } from "./slot-note-input";
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
  /** Note written for this slot, empty string when there is none */
  note: string;
  /** Called with the raw text when the note changes */
  onNoteChange: (slotId: string, text: string) => void;
}

/**
 * One droppable cell of the formation. Every slot accepts every guild class —
 * the placeholder only suggests who fits, it never constrains.
 * @param slot - Slot this cell renders
 * @param character - Character currently standing here, if any
 * @param readOnly - Render without drag handles
 * @param absentReason - Why the occupant needs attention, if any
 * @param note - Note written for this slot
 * @param onNoteChange - Called with the raw text when the note changes
 * @returns Droppable cell holding either a draggable member or a placeholder
 */
export function SlotCell({
  slot,
  character,
  readOnly = false,
  absentReason,
  note,
  onNoteChange,
}: SlotCellProps) {
  const data: SlotDropData = { type: "slot", slotId: slot.id };
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data,
    disabled: readOnly,
  });

  return (
    <div className="flex items-center gap-2">
      <div
        ref={setNodeRef}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center rounded-md transition-colors",
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
      <div className="w-1/2 shrink-0">
        <SlotNoteInput
          slotId={slot.id}
          value={note}
          readOnly={readOnly}
          onChange={onNoteChange}
        />
      </div>
    </div>
  );
}
