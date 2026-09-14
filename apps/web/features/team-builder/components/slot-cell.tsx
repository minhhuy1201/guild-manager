"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Character } from "@guild/shared/schemas";
import { StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
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
 * One droppable cell of the formation. Every slot accepts every guild class -
 * the placeholder only suggests who fits, it never constrains.
 *
 * From `sm` the note sits beside the drop area. Below `sm` it takes 2/5 of a row that is already a
 * phone's width, which left a name seven letters, so there it folds behind a button: a jade dot says
 * a note is there, the note itself reads as a line under the row, and the button opens the field on
 * a row of its own. One field either way - two would drift apart and be read twice.
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
  const [isNoteOpen, setNoteOpen] = useState(false);
  const hasNote = note.length > 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-11 min-w-0 items-center rounded-md transition-colors",
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
      {/* A day already played has nothing to write: its note is read from the line below. */}
      {readOnly ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Ghi chú"
          aria-expanded={isNoteOpen}
          data-has-note={hasNote}
          onClick={() => setNoteOpen((open) => !open)}
          className="relative text-muted-foreground sm:hidden"
        >
          <StickyNote />
          {hasNote ? (
            <span
              aria-hidden
              className="absolute top-2 right-2 size-2 rounded-full bg-jade"
            />
          ) : null}
        </Button>
      )}
      <div
        className={cn(
          "col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1",
          !isNoteOpen && "max-sm:hidden"
        )}
      >
        <SlotNoteInput
          slotId={slot.id}
          value={note}
          readOnly={readOnly}
          onChange={onNoteChange}
        />
      </div>
      {hasNote && !isNoteOpen ? (
        <p className="col-span-2 truncate text-xs text-muted-foreground sm:hidden">
          {note}
        </p>
      ) : null}
    </div>
  );
}
