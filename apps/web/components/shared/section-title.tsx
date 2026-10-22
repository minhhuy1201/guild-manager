import type { ReactNode } from "react";

import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  /** The title; may carry inline extras such as a count badge */
  children: ReactNode;
  /** A count shown after the title as "(n)", always in the sans face */
  count?: number;
  /** The whole title is data (a battle's name and time): set it in sans, not the serif */
  isData?: boolean;
  /** Extra classes for the wrapper */
  className?: string;
}

/**
 * The title of a card-level section: a serif `<h2>` with a brush-stroke rule under it. The one
 * place card sections get their heading, so every page opens its blocks the same way.
 * Serif is for headings that are words: a battle's name, times, dates and counts are data and stay
 * in the sans face with lining, tabular figures (Playfair's old-style figures read as text).
 * @param children - The title content
 * @param count - Optional count after the title
 * @param isData - Whether the whole title is data
 * @param className - Extra classes merged after the defaults
 * @returns The heading with its divider
 */
export function SectionTitle({
  children,
  count,
  isData = false,
  className,
}: SectionTitleProps) {
  return (
    <div data-slot="section-title" className={cn("flex flex-col gap-2", className)}>
      <h2
        className={cn(
          "text-lg leading-tight font-semibold tracking-tight",
          isData ? "font-sans lining-nums tabular-nums" : "font-heading"
        )}
      >
        {children}
        {count !== undefined && (
          <>
            {" "}
            <span className="font-sans lining-nums tabular-nums">({count})</span>
          </>
        )}
      </h2>
      <OrnamentDivider stroke="brush" />
    </div>
  );
}
