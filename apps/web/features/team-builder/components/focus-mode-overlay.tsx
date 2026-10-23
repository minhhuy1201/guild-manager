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
  /** The formation grid, in the wide column */
  grid: ReactNode;
  /** The member pool, in the narrow column */
  pool: ReactNode;
}

/**
 * The shell of the team builder's focus mode: a dialog that covers the window, a thin top bar with
 * the battle's name and the exit button, and a body for the grid and the pool.
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
 * @param grid - The formation grid
 * @param pool - The member pool
 * @returns The fullscreen dialog
 */
export function FocusModeOverlay({
  title,
  onExit,
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
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
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
        <div className="p-4 lg:min-h-0 lg:overflow-y-auto">{grid}</div>
        <div className="border-t border-border max-lg:h-[28rem] max-lg:shrink-0 lg:min-h-0 lg:border-t-0 lg:border-l lg:bg-muted/60">
          {pool}
        </div>
      </div>
    </div>
  );
}
