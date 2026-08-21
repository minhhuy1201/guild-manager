"use client";

import { NOTE_MAX_LENGTH } from "@guild/shared/schemas";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SlotNoteInputProps {
  /** Slot this note belongs to */
  slotId: string;
  /** Current text, empty string when the slot has no note */
  value: string;
  /** Render uneditable — a past week or a battle already fought */
  readOnly?: boolean;
  /** Called with the raw text on every keystroke */
  onChange: (slotId: string, text: string) => void;
}

/**
 * Free-text note for one slot, sitting next to the slot's drop area.
 * A textarea rather than an input so a long note wraps instead of scrolling out
 * of sight; `field-sizing-content` grows it line by line as the text does. The
 * wrapping is the only way to reach a second line — Enter is swallowed and a
 * pasted line break is dropped, so a note stays one paragraph.
 * Capped with `maxLength` rather than a validation message: the schema rejects
 * anything longer, and a cap the user can feel beats an error after the fact.
 * Read-only uses the `readOnly` attribute, not `disabled`, so notes of a past
 * battle stay legible and selectable.
 * @param slotId - Slot this note belongs to
 * @param value - Current text
 * @param readOnly - Render uneditable
 * @param onChange - Called with the raw text on every keystroke
 * @returns Text input for the slot's note
 */
export function SlotNoteInput({
  slotId,
  value,
  readOnly = false,
  onChange,
}: SlotNoteInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(event) =>
        onChange(slotId, event.target.value.replace(/\n/g, " "))
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault();
      }}
      readOnly={readOnly}
      maxLength={NOTE_MAX_LENGTH}
      rows={1}
      placeholder="Ghi chú"
      aria-label="Ghi chú cho ô này"
      className={cn(
        "min-h-8 resize-none py-1.5 text-xs leading-snug field-sizing-content",
        readOnly && "cursor-default border-transparent bg-muted/30 shadow-none"
      )}
    />
  );
}
