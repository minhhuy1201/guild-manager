"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { SCREEN_DIALOG_ATTRIBUTE } from "@/lib/keyboard-target";

/** Everything inside the shell a Tab key can land on. */
const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The bar's look when a screen gives none: dark glass like the site header. */
const DEFAULT_BAR_CLASS =
  "dark flex shrink-0 items-center gap-3 border-b border-white/10 bg-card/85 px-4 py-2 text-foreground shadow-[inset_0_-1px_0_0_rgb(255_255_255/0.04),0_8px_24px_-12px_rgb(0_0_0/0.5)] backdrop-blur-xl backdrop-saturate-150";

/** The frame while active: covers the window, fades in. */
const ACTIVE_CLASS =
  "fixed inset-0 z-40 flex flex-col overflow-hidden overscroll-contain bg-background outline-none duration-[var(--duration-base)] ease-out-soft animate-in fade-in-0";

interface FocusModeShellProps {
  /** Whether the frame covers the window; false leaves a plain wrapper around the same subtree */
  active: boolean;
  /** The dialog's accessible name while active */
  label: string;
  /** The bar's content; the shell appends the exit button */
  bar: ReactNode;
  /** Leave the mode */
  onExit: () => void;
  /** Replaces the default dark glass look of the bar */
  barClassName?: string;
  /** Hide the exit button visually (it stays focusable); a screen can fade it out when idle */
  hideExit?: boolean;
  /** Classes of the wrapper while inactive */
  className?: string;
  /** Merged over the active frame's classes, e.g. a background of its own */
  activeClassName?: string;
  /** `data-slot` of the root while active, for a stylesheet block that must resolve on the root */
  activeSlot?: string;
  /** The content, mounted once whether or not the mode is on */
  children: ReactNode;
}

/**
 * The frame of a screen's focus mode: while active a dialog that covers the window with a thin top
 * bar and an exit button, while inactive a plain wrapper.
 *
 * The root element and the position of every child are the same in both states, so flipping
 * `active` restyles the frame in place and never remounts `children` - which is what a screen
 * holding a canvas, a live feed or droppable ids needs. A screen that mounts its content only
 * while active (the team builder) passes `active` as always true.
 *
 * `z-40` puts it over the site header (which comes earlier in the DOM at the same level) and under
 * the `z-50` dialogs, popovers and toasts that portal out to `body`. Focus moves in when it turns
 * active and Tab wraps inside, which is the trap an `aria-modal` dialog promises. The only motion
 * is a fade of its opacity.
 * @param active - Whether the frame covers the window
 * @param label - The dialog's accessible name
 * @param bar - The bar's content
 * @param onExit - Leave the mode
 * @param barClassName - Replaces the bar's default look
 * @param hideExit - Hide the exit button visually
 * @param className - Classes of the inactive wrapper
 * @param activeClassName - Merged over the active frame's classes
 * @param activeSlot - `data-slot` of the root while active
 * @param children - The content
 * @returns The frame
 */
export function FocusModeShell({
  active,
  label,
  bar,
  onExit,
  barClassName,
  hideExit = false,
  className,
  activeClassName,
  activeSlot,
  children,
}: FocusModeShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) rootRef.current?.focus();
  }, [active]);

  /**
   * Keep Tab inside the dialog by wrapping at its first and last control.
   * @param event - The keydown bubbling up from inside the dialog
   */
  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (!active || event.key !== "Tab" || !rootRef.current) return;

    // A roving tablist keeps its unselected tabs at -1, and a column can be hidden below `md`:
    // neither is a Tab stop, and counting one as the edge lets focus slip out behind the dialog.
    const tabbables = [
      ...rootRef.current.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
    ].filter(
      (element) =>
        element.tabIndex >= 0 && element.checkVisibility?.() !== false
    );
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

  const dialogProps = active
    ? {
        [SCREEN_DIALOG_ATTRIBUTE]: "",
        role: "dialog",
        "aria-modal": true,
        "aria-label": label,
        tabIndex: -1,
        "data-slot": activeSlot,
      }
    : {};

  return (
    <div
      ref={rootRef}
      {...dialogProps}
      onKeyDown={trapTab}
      className={active ? cn(ACTIVE_CLASS, activeClassName) : className}
    >
      {active ? (
        <div className={barClassName ?? DEFAULT_BAR_CLASS}>
          {bar}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExit}
            aria-label="Thoát toàn màn hình"
            data-idle={hideExit ? "" : undefined}
            className={cn(
              "duration-[var(--duration-base)] ease-out-soft",
              hideExit && "pointer-events-none opacity-0"
            )}
          >
            <X />
            <Kbd aria-hidden>Esc</Kbd>
          </Button>
        </div>
      ) : null}
      <div className={active ? "flex min-h-0 flex-1 flex-col" : "contents"}>
        {children}
      </div>
    </div>
  );
}
