"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { FOCUS_MODE_ATTRIBUTE } from "../hooks/use-focus-mode";

/** Everything inside the overlay a Tab key can land on. */
const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 * The shell of the team builder's focus mode: a dialog that covers the window, a thin top bar with
 * the battle's name, the match tabs, the absent-members line and the exit button, and a body for
 * the grid and the pool. The bar is dark glass like the site header.
 *
 * From `lg` the body is two columns - the grid on `1fr`, the pool on a clamped width, because a
 * member card needs a minimum width a percentage would not give - and each column scrolls on its
 * own, so the pool never moves while the grid is scrolled. Below `lg` the columns stack and the
 * whole body scrolls.
 *
 * `z-40` puts it over the site header (which comes earlier in the DOM at the same level) and under
 * the `z-50` dialogs, popovers and toasts that portal out to `body`, so a save-conflict dialog
 * still opens in front of it. Focus moves in on mount and Tab wraps inside, which is the trap an
 * `aria-modal` dialog promises. The only motion is a fade of its opacity.
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  /**
   * Keep Tab inside the overlay by wrapping at its first and last control.
   * @param event - The keydown bubbling up from inside the overlay
   */
  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !rootRef.current) return;

    const tabbables = [
      ...rootRef.current.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
    ];
    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    if (!first || !last) return;

    const atEdge = event.shiftKey
      ? document.activeElement === first || document.activeElement === rootRef.current
      : document.activeElement === last;
    if (!atEdge) return;

    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }

  return (
    <div
      ref={rootRef}
      {...{ [FOCUS_MODE_ATTRIBUTE]: "" }}
      role="dialog"
      aria-modal="true"
      aria-label="Xếp đội hình toàn màn hình"
      tabIndex={-1}
      onKeyDown={trapTab}
      className="fixed inset-0 z-40 flex flex-col overflow-hidden overscroll-contain bg-background outline-none duration-[var(--duration-base)] ease-out-soft animate-in fade-in-0"
    >
      <div className="dark flex shrink-0 items-center gap-3 border-b border-white/10 bg-card/85 px-4 py-2 text-foreground shadow-[inset_0_-1px_0_0_rgb(255_255_255/0.04),0_8px_24px_-12px_rgb(0_0_0/0.5)] backdrop-blur-xl backdrop-saturate-150">
        <h2 className="min-w-0 shrink truncate text-sm font-semibold">{title}</h2>
        {matchTabs}
        <div className="flex min-w-0 flex-1 justify-end">{notice}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExit}
          aria-label="Thoát toàn màn hình"
        >
          <X />
          <Kbd aria-hidden>Esc</Kbd>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[1fr_clamp(280px,22vw,360px)] lg:overflow-hidden">
        <div className="flex flex-col gap-4 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.1)_100%)] p-4 lg:min-h-0 lg:overflow-y-auto">
          {grid}
          {footer}
        </div>
        <div className="border-t border-border max-lg:h-[28rem] max-lg:shrink-0 lg:min-h-0 lg:border-t-0 lg:border-l lg:bg-muted/60">
          {pool}
        </div>
      </div>
    </div>
  );
}
