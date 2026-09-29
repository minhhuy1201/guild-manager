"use client";

import { useState } from "react";
import { TACTIC_LIMITS } from "@guild/shared/schemas";
import { ChevronRight, NotebookText, Pencil, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TacticNotesDraft } from "../hooks/use-tactic-notes-draft";

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
  /** Whether the viewer may edit — the API is what actually enforces it */
  canEdit: boolean;
  /** The draft the screen holds, so its leave guard sees unsaved notes */
  draft: TacticNotesDraft;
}

/**
 * The right-hand column of the editor frame, mirroring the token palette on the left. It opens on
 * the notes when there are some and starts folded when there are none, so an empty panel never
 * takes room from the map.
 *
 * Its content scrolls inside a box pinned to the column, so long notes never make the row taller
 * than the map.
 * @param props - The saved notes, whether they may be edited, and the draft
 * @returns The notes column
 */
export function TacticNotesPanel({
  notes,
  canEdit,
  draft,
}: TacticNotesPanelProps) {
  const [open, setOpen] = useState(notes !== null);
  const toggleLabel = open ? "Thu ghi chú chiến thuật" : "Mở ghi chú chiến thuật";

  return (
    <aside
      aria-label="Ghi chú chiến thuật"
      className={cn(
        "flex shrink-0 flex-col border-l transition-[width] duration-300 ease-out",
        open ? "w-72" : "w-12"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 py-2",
          open ? "justify-between pr-1 pl-3" : "justify-center px-1"
        )}
      >
        {open ? (
          <h2 className="text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
            Ghi chú chiến thuật
          </h2>
        ) : null}
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="shrink-0"
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          {open ? <ChevronRight /> : <NotebookText />}
        </Button>
      </div>

      {open ? (
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 flex flex-col gap-2 overflow-y-auto px-3 pb-3">
            {draft.editing ? (
              <NotesEditor draft={draft} />
            ) : (
              <>
                {notes === null ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có ghi chú.
                  </p>
                ) : (
                  <TacticNotesText notes={notes} />
                )}
                {canEdit ? (
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
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </aside>
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
