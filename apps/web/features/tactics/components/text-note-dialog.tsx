"use client";

import { useState, type FormEvent } from "react";
import { Type } from "lucide-react";
import { TACTIC_LIMITS } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface TextNoteDialogProps {
  /** Whether a note is being written */
  open: boolean;
  /** Write the note */
  onConfirm: (text: string) => void;
  /** Drop it */
  onCancel: () => void;
}

/**
 * What a note says, asked before it lands on the map.
 * A dialog rather than editing on the canvas: the text is at most 80 characters and typing it into
 * a real input keeps the keyboard shortcuts off while it happens.
 * @param open - Whether a note is being written
 * @param onConfirm - Write the note
 * @param onCancel - Drop it
 * @returns The dialog
 */
export function TextNoteDialog({
  open,
  onConfirm,
  onCancel,
}: TextNoteDialogProps) {
  const [text, setText] = useState("");

  /**
   * Hand the text over and empty the field for the next note.
   * @param event - Submit event of the form
   */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onConfirm(text);
    setText("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setText("");
          onCancel();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader className="mb-2">
            <DialogTitle>Ghi chú trên map</DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            value={text}
            maxLength={TACTIC_LIMITS.textLength}
            aria-label="Nội dung ghi chú"
            onChange={(event) => setText(event.target.value)}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setText("");
                onCancel();
              }}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={text.trim() === ""}>
              <Type />
              Thêm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
