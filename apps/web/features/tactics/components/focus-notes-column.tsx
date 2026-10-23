"use client";

import { ChevronRight, NotebookText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TacticNotesText } from "./tactic-notes-panel";

interface FocusNotesColumnProps {
  /** The tactic's notes */
  notes: string;
}

/**
 * The notes beside the map while the viewer is in focus mode: read-only, open on entry, folded to
 * a thin rail by its button so the map can have the room.
 *
 * It mirrors the editor's notes panel, so both halves of the page read alike. The fold is forgotten
 * on exit.
 * @param notes - The tactic's notes
 * @returns The notes column
 */
export function FocusNotesColumn({ notes }: FocusNotesColumnProps) {
  const [open, setOpen] = useState(true);
  const toggleLabel = open ? "Thu ghi chú chiến thuật" : "Mở ghi chú chiến thuật";

  return (
    <aside
      aria-label="Ghi chú chiến thuật"
      className={cn(
        "flex shrink-0 flex-col border-l bg-card/60",
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
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <TacticNotesText notes={notes} />
        </div>
      ) : null}
    </aside>
  );
}
