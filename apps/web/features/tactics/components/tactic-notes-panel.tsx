"use client";

import { useState } from "react";
import { TACTIC_LIMITS } from "@guild/shared/schemas";
import { Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TacticNotesDraft } from "../hooks/use-tactic-notes-draft";
import { NotesRail } from "./notes-rail";

interface TacticNotesTextProps {
  /** The saved notes */
  notes: string;
}

/**
 * Notes as written: plain text, with the admin's own line breaks and hand-typed dashes kept.
 * @param notes - The saved notes
 * @returns The notes paragraph
 */
export function TacticNotesText({ notes }: TacticNotesTextProps) {
  return <p className="text-sm break-words whitespace-pre-wrap">{notes}</p>;
}

interface TacticNotesPanelProps {
  /** The notes as saved, null when there are none */
  notes: string | null;
  /** The draft the screen holds, so its leave guard sees unsaved notes */
  draft: TacticNotesDraft;
}

/**
 * The right-hand column of the editor frame, mirroring the token palette on the left. It opens on
 * the notes when there are some and starts folded when there are none, so an empty panel never
 * takes room from the map.
 *
 * Its content scrolls inside a box pinned to the column, so long notes never make the row taller
 * than the map. It only ever renders for an admin at the drawing tools; everyone else reads the
 * notes in `TacticViewer`.
 * @param props - The saved notes and the draft
 * @returns The notes column
 */
export function TacticNotesPanel({ notes, draft }: TacticNotesPanelProps) {
  const [open, setOpen] = useState(notes !== null);

  return (
    <NotesRail
      open={open}
      onToggle={() => setOpen((wasOpen) => !wasOpen)}
      className="transition-[width] duration-300 ease-out"
    >
      {draft.editing ? (
        <NotesEditor draft={draft} />
      ) : (
        <>
          {notes === null ? (
            <p className="text-sm text-muted-foreground">Chưa có ghi chú.</p>
          ) : (
            <TacticNotesText notes={notes} />
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={draft.start}
          >
            <Pencil />
            Sửa
          </Button>
        </>
      )}
    </NotesRail>
  );
}

interface NotesEditorProps {
  /** The draft being written */
  draft: TacticNotesDraft;
}

/**
 * The textarea and its two answers. A failed save keeps the draft and says why right here: the
 * panel has room for a sentence, unlike the toolbar, which is why the drawing reports in a toast.
 * @param draft - The draft being written
 * @returns The editing form
 */
function NotesEditor({ draft }: NotesEditorProps) {
  return (
    <>
      <Textarea
        aria-label="Ghi chú chiến thuật"
        autoFocus
        value={draft.draft}
        maxLength={TACTIC_LIMITS.tacticNotesLength}
        className="min-h-40 flex-1 resize-none"
        onChange={(event) => draft.change(event.target.value)}
      />
      <p className="text-right text-xs text-muted-foreground tabular-nums">
        {draft.draft.length}/{TACTIC_LIMITS.tacticNotesLength}
      </p>
      {draft.error ? (
        <p role="alert" className="text-sm text-destructive">
          {draft.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={draft.saving}
          onClick={draft.cancel}
        >
          Huỷ
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={draft.saving}
          onClick={() => void draft.save()}
        >
          <Save />
          Lưu ghi chú
        </Button>
      </div>
    </>
  );
}
