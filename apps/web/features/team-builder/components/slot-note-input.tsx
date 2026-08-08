"use client";

import { NOTE_MAX_LENGTH } from "@shared/schemas";

import { Input } from "@/components/ui/input";
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
    <Input
      value={value}
      onChange={(event) => onChange(slotId, event.target.value)}
      readOnly={readOnly}
      maxLength={NOTE_MAX_LENGTH}
      placeholder="Ghi chú"
      aria-label="Ghi chú cho ô này"
      className={cn(
        "h-8 text-xs",
        readOnly && "cursor-default border-transparent bg-muted/30 shadow-none"
      )}
    />
  );
}
