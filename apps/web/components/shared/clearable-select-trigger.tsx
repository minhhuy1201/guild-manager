"use client";

import { useRef, type ReactNode } from "react";

import { FilterClearButton } from "@/components/shared/filter-clear-button";
import { SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Room made for the X, on the VALUE and never on the trigger.
 *
 * The trigger's own `pr-2.5` is where its chevron stands, not where its text stops — widening it
 * pushes the chevron inwards and leaves an empty strip along the right edge. The value is the thing
 * that has to stop early, so the margin goes on it, through the same `*:data-[slot=select-value]:…`
 * selector the trigger already uses for `line-clamp-1`.
 *
 * 36px = the 28px button plus the 8px of air on each side of it: the chevron ends 28px from the
 * right edge, the button sits at 36–64px, and the value now stops at 72px.
 */
const CLEARABLE_VALUE_MARGIN = "*:data-[slot=select-value]:mr-9";

interface ClearableSelectTriggerProps {
  /** Id put on the trigger so a `<Label htmlFor>` can point at it. */
  id: string;
  /** The select holds a value worth clearing — the X is only offered then. */
  isActive: boolean;
  /** Screen-reader name of the X, e.g. "Xoá lọc lưu phái". */
  clearLabel: string;
  /** Puts the select back to its "Tất cả" value. */
  onClear: () => void;
  /** The `SelectValue` this trigger displays. */
  children: ReactNode;
}

/**
 * SHARED PATTERN: a filter select's trigger with the X that empties it laid over its right end.
 *
 * The X is a sibling of the trigger, not a child: the trigger is itself a button, and a button
 * inside a button is markup the browser reshuffles. That is what the `relative` wrapper is for, and
 * why the value — not the trigger — gives up the room the X stands in.
 *
 * Focus goes back to the trigger after clearing — the X removes itself, and focus would otherwise
 * fall to the body.
 * @param id - Id put on the trigger for the accompanying label
 * @param isActive - Whether there is a value to clear
 * @param clearLabel - Screen-reader name of the X
 * @param onClear - Puts the select back to "Tất cả"
 * @param children - The `SelectValue` to display
 * @returns The trigger with its clear button
 */
export function ClearableSelectTrigger({
  id,
  isActive,
  clearLabel,
  onClear,
  children,
}: ClearableSelectTriggerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** Clear, then hand focus back to the trigger the X just vanished from. */
  const handleClear = () => {
    onClear();
    triggerRef.current?.focus();
  };

  return (
    <div className="relative">
      <SelectTrigger
        id={id}
        ref={triggerRef}
        className={cn("w-full", isActive && CLEARABLE_VALUE_MARGIN)}
      >
        {children}
      </SelectTrigger>
      {isActive && (
        <FilterClearButton
          label={clearLabel}
          onClear={handleClear}
          className="right-9"
        />
      )}
    </div>
  );
}
