"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterClearButtonProps {
  /** Screen-reader name — the button carries an icon and no visible text. */
  label: string;
  /** Clear this one control. */
  onClear: () => void;
  /**
   * Where the button sits over its control: the caller gives the horizontal offset (`right-0.5`,
   * `right-8`…), the wrapper owns the vertical centring.
   */
  className?: string;
}

/**
 * SHARED PATTERN: the small X that empties ONE filter control, laid over the right end of that
 * control. Use it for a filter whose "empty" value cannot be reached from the control itself — a
 * search box, a multi-select — and not for a select that already lists "Tất cả" as a row.
 *
 * It is rendered only while the control holds a value, so the caller must move focus after clearing
 * (back to the input, back to the trigger): the button removes itself, and focus would otherwise
 * fall to the body.
 *
 * The caller's wrapper must be `relative` — this is positioned against it.
 * @param label - Screen-reader name of the button
 * @param onClear - Empties the control
 * @param className - Horizontal offset over the control
 * @returns The clear button
 */
export function FilterClearButton({
  label,
  onClear,
  className,
}: FilterClearButtonProps) {
  return (
    // Centred by a flex wrapper rather than `-translate-y-1/2` on the button, the same way
    // `password-input` holds its eye: `Button` already owns `--tw-translate-y` for its press
    // effect, and a centring transform on the same element is thrown away the moment the pointer
    // goes down — the button drops by half its own height, the pointer lands outside it, and the
    // browser never fires `click`. That is the "have to press it twice" bug.
    <span className={cn("absolute inset-y-0 flex items-center", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        onClick={onClear}
        className="rounded-full text-muted-foreground"
      >
        <X />
      </Button>
    </span>
  );
}
