"use client";

import type { ReactNode } from "react";

import { FocusModeShell } from "@/components/shared/focus-mode-shell";

interface FocusModeOverlayProps {
  /** Headline of the battle being arranged, shown in the top bar */
  title: string;
  /** Close the overlay */
  onExit: () => void;
  /** Switches between the day's matches, in the top bar */
  matchTabs: ReactNode;
  /** The compact absent-members line, in the top bar */
  notice: ReactNode;
  /** The unsaved changes bar, pinned to the bottom of the grid column; null when nothing is unsaved */
  footer: ReactNode;
  /** The formation grid, in the wide column */
  grid: ReactNode;
  /** The member pool, in the narrow column */
  pool: ReactNode;
}

/**
 * The team builder's focus mode layout over the shared shell: the battle's name, the match tabs and
 * the absent-members line in the bar, and a body for the grid and the pool.
 *
 * From `lg` the body is two columns - the grid on `1fr`, the pool on a clamped width, because a
 * member card needs a minimum width a percentage would not give - and each column scrolls on its
 * own, so the pool never moves while the grid is scrolled. Below `lg` the columns stack and the
 * whole body scrolls. The screen mounts it only while the mode is on, so the shell is always active.
 * @param title - Headline of the battle being arranged
 * @param onExit - Close the overlay
 * @param matchTabs - Switches between the day's matches
 * @param notice - The compact absent-members line
 * @param footer - The unsaved changes bar, if any
 * @param grid - The formation grid
 * @param pool - The member pool
 * @returns The fullscreen dialog
 */
export function FocusModeOverlay({
  title,
  onExit,
  matchTabs,
  notice,
  footer,
  grid,
  pool,
}: FocusModeOverlayProps) {
  return (
    <FocusModeShell
      active
      label="Xếp đội hình toàn màn hình"
      onExit={onExit}
      bar={
        <>
          <h2 className="min-w-0 shrink truncate text-sm font-semibold">{title}</h2>
          {matchTabs}
          <div className="flex min-w-0 flex-1 justify-end">{notice}</div>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[1fr_clamp(280px,22vw,360px)] lg:overflow-hidden">
        <div className="flex flex-col gap-4 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.1)_100%)] p-4 lg:min-h-0 lg:overflow-y-auto">
          {grid}
          {footer}
        </div>
        <div className="border-t border-border max-lg:h-[28rem] max-lg:shrink-0 lg:min-h-0 lg:border-t-0 lg:border-l lg:bg-muted/60">
          {pool}
        </div>
      </div>
    </FocusModeShell>
  );
}
