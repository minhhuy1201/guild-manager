"use client";

import { useCallback, useState } from "react";

import { errorMessageOf } from "@/lib/error-message";
import { useUpdateTactic } from "./use-tactic-mutations";

/** An admin rewriting a tactic's notes, from "Sửa" until the save lands or is cancelled. */
export interface TacticNotesDraft {
  /** Whether the notes are open for editing */
  editing: boolean;
  /** The text being written */
  draft: string;
  /** Whether the draft holds a change the server has not seen */
  dirty: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** Why the last save failed, until the next attempt; null when it did not */
  error: string | null;
  /** Open the saved notes for editing */
  start: () => void;
  /** Replace the text being written */
  change: (text: string) => void;
  /** Drop the draft and go back to reading */
  cancel: () => void;
  /** Persist the draft; resolves true once the server accepted it */
  save: () => Promise<boolean>;
}

/**
 * The notes draft of one tactic. It lives apart from the drawing on purpose: the notes save on
 * their own `PATCH`, so they never join the drawing's undo history or its "Lưu" button. The screen
 * holds it rather than the panel, so the leave guard can see an unsaved draft.
 * @param tacticId - Id of the tactic the notes belong to
 * @param savedNotes - The notes as the server last returned them
 * @returns The draft and what can be done to it
 */
export function useTacticNotesDraft(
  tacticId: string,
  savedNotes: string | null
): TacticNotesDraft {
  const updateTactic = useUpdateTactic();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(() => {
    setDraft(savedNotes ?? "");
    setError(null);
    setEditing(true);
  }, [savedNotes]);

  const cancel = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

  const { mutateAsync } = updateTactic;
  const save = useCallback(async () => {
    const trimmed = draft.trim();

    setError(null);
    try {
      await mutateAsync({
        id: tacticId,
        notes: trimmed === "" ? null : trimmed,
      });
    } catch (caught) {
      setError(errorMessageOf(caught, "Không lưu được ghi chú chiến thuật."));
      return false;
    }

    setEditing(false);
    return true;
  }, [draft, mutateAsync, tacticId]);

  return {
    editing,
    draft,
    dirty: editing && draft.trim() !== (savedNotes ?? ""),
    saving: updateTactic.isPending,
    error,
    start,
    change: setDraft,
    cancel,
    save,
  };
}
