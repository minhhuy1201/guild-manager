"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Character } from "@guild/shared/schemas";
import { NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlotDropData } from "../lib/dnd-data";
import type { FormationLayout, Slot } from "../types/formation";
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
  /** Where the grid is drawn — decides how the note shows */
  layout?: FormationLayout;
}

/**
 * One droppable cell of the formation. Every slot accepts every guild class —
 * the placeholder only suggests who fits, it never constrains.
 *
 * The note shows two ways. The Discord image keeps a note column beside every
 * slot, empty or not, exactly as it always has. On screen that column would be
 * sixty open inputs eating two fifths of every name, so the note folds away: a
 * slot without one offers a small button, a slot with one shows the text under
 * the member (press it to edit), and a read-only slot shows only the notes that exist.
 * @param slot - Slot this cell renders
 * @param character - Character currently standing here, if any
 * @param readOnly - Render without drag handles
 * @param absentReason - Why the occupant needs attention, if any
 * @param note - Note written for this slot
 * @param onNoteChange - Called with the raw text when the note changes
 * @param layout - Where the grid is drawn, the screen by default
 * @returns Droppable cell holding either a draggable member or a placeholder
 */
export function SlotCell({
  slot,
  character,
  readOnly = false,
  absentReason,
  note,
  onNoteChange,
  layout = "screen",
}: SlotCellProps) {
  const data: SlotDropData = { type: "slot", slotId: slot.id };
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data,
    disabled: readOnly,
  });
  const [isEditingNote, setIsEditingNote] = useState(false);

  const dropArea = (
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
  );

  if (layout === "capture") {
    return (
      <div className="flex items-center gap-2">
        {dropArea}
        <div className="w-2/5 shrink-0">
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

  const hasNote = note.trim().length > 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {dropArea}
        {!readOnly && !hasNote && !isEditingNote ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Thêm ghi chú"
            title="Thêm ghi chú"
            onClick={() => setIsEditingNote(true)}
            className="shrink-0 text-muted-foreground"
          >
            <NotebookPen />
          </Button>
        ) : null}
      </div>

      {isEditingNote ? (
        <SlotNoteInput
          slotId={slot.id}
          value={note}
          onChange={onNoteChange}
          autoFocus
          onDone={() => setIsEditingNote(false)}
        />
      ) : hasNote && readOnly ? (
        <p className="px-1 text-sm leading-snug break-words text-muted-foreground">
          {note}
        </p>
      ) : hasNote ? (
        <button
          type="button"
          aria-label={`Sửa ghi chú: ${note}`}
          onClick={() => setIsEditingNote(true)}
          className="rounded-md px-1 text-left text-sm leading-snug break-words text-muted-foreground outline-none transition-colors duration-[var(--duration-fast)] hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {note}
        </button>
      ) : null}
    </div>
  );
}
