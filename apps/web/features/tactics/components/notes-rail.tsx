"use client";

import { ChevronRight, NotebookText } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotesRailProps {
  /** Whether the column shows its content or folds to a thin rail */
  open: boolean;
  /** Fold or unfold the column */
  onToggle: () => void;
  /** Merged over the column's own classes, e.g. a transition or a background */
  className?: string;
  /** What the open column holds */
  children: ReactNode;
}

/**
 * The right-hand notes column both halves of the tactic page share: a titled header with a fold
 * button, and a scrolling body that exists only while open.
 *
 * The content scrolls inside a box pinned to the column, so long notes never make the row taller
 * than the map. The editor's panel and the viewer's focus mode differ only in what sits inside.
 * @param props - Whether it is open, the fold callback, and the content
 * @returns The notes column
 */
export function NotesRail({
  open,
  onToggle,
  className,
  children,
}: NotesRailProps) {
  const toggleLabel = open ? "Thu ghi chú chiến thuật" : "Mở ghi chú chiến thuật";

  return (
    <aside
      aria-label="Ghi chú chiến thuật"
      className={cn(
        "flex shrink-0 flex-col border-l",
        open ? "w-72" : "w-12",
        className
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
          onClick={onToggle}
        >
          {open ? <ChevronRight /> : <NotebookText />}
        </Button>
      </div>

      {open ? (
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 flex flex-col gap-2 overflow-y-auto px-3 pb-3">
            {children}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
