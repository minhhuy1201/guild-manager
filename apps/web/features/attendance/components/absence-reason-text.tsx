"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AbsenceReasonTextProps {
  /** The reason the member gave with a "Không" answer */
  reason: string;
  /** Width cap of the cut-off text, set by the column it sits in */
  className?: string;
}

/**
 * An absence reason in a narrow table cell: cut to two lines, and a tap opens the whole sentence.
 * A reason runs up to 255 characters while its column is capped, and the full text used to live in
 * a `title` - which a phone has no way to show. A button opening a popover works by touch, mouse and
 * keyboard alike.
 * @param reason - The reason to show
 * @param className - Width cap of the cut-off text
 * @returns The reason, openable in full
 */
export function AbsenceReasonText({ reason, className }: AbsenceReasonTextProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          // A 44px tall target on a phone, where it is tapped; the two lines of text sit centred in it.
          "flex items-center rounded-sm text-left text-xs text-muted-foreground outline-none max-sm:min-h-11",
          "transition-colors duration-[var(--duration-fast)] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        <span className="line-clamp-2 break-words">{reason}</span>
      </PopoverTrigger>
      <PopoverContent className="break-words">{reason}</PopoverContent>
    </Popover>
  );
}
