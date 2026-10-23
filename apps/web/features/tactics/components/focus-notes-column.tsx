"use client";

import { useState } from "react";

import { NotesRail } from "./notes-rail";
import { TacticNotesText } from "./tactic-notes-panel";

interface FocusNotesColumnProps {
  /** The tactic's notes */
  notes: string;
}

/**
 * The notes beside the map while the viewer is in focus mode: read-only, open on entry, folded to
 * a thin rail by its button so the map can have the room. The fold is forgotten on exit.
 * @param notes - The tactic's notes
 * @returns The notes column
 */
export function FocusNotesColumn({ notes }: FocusNotesColumnProps) {
  const [open, setOpen] = useState(true);

  return (
    <NotesRail
      open={open}
      onToggle={() => setOpen((wasOpen) => !wasOpen)}
      className="bg-card/60"
    >
      <TacticNotesText notes={notes} />
    </NotesRail>
  );
}
