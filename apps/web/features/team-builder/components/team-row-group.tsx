"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TeamRowGroupProps {
  /** Header text naming the teams inside, e.g. "Đội 1-5" */
  label: string;
  /** Slots of the group that hold someone, shown beside the label */
  filled: number;
  /** Slots the group holds in total, the denominator of the count */
  total: number;
  /** The row of team columns this group opens and closes */
  children: ReactNode;
}

/**
 * One row of five team columns, foldable by its header. Ten teams fill two screens of scrolling,
 * so folding the row an admin is done with brings the other one into view.
 *
 * The header is hidden below `md`: there the grid already shows one team at a time through
 * `TeamSwitcher`, and folding a row of teams that are not on screen means nothing. The panel stays
 * open there, since only the header can close it.
 *
 * The height animation comes from Base UI, which measures the panel and publishes
 * `--collapsible-panel-height`; the transition runs between that height and zero.
 * @param label - Header text naming the teams inside
 * @param filled - Slots of the group that hold someone
 * @param total - Slots the group holds in total
 * @param children - The row of team columns
 * @returns The foldable row
 */
export function TeamRowGroup({
  label,
  filled,
  total,
  children,
}: TeamRowGroupProps) {
  return (
    <Collapsible.Root defaultOpen className="flex flex-col gap-3">
      <Collapsible.Trigger
        className={cn(
          "group/row hidden min-h-11 items-center gap-2 rounded-md px-1 text-sm font-semibold outline-none md:flex",
          "transition-colors duration-[var(--duration-fast)] hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-[var(--duration-base)] ease-out-soft",
            "group-data-[panel-open]/row:rotate-0 -rotate-90"
          )}
        />
        {label}
        <span className="font-normal tabular-nums text-muted-foreground">
          {filled}/{total}
        </span>
      </Collapsible.Trigger>

      <Collapsible.Panel
        // `h-0` on the two edge states is what the height transition runs between; without them the
        // panel would jump from its measured height straight to nothing.
        className={cn(
          "h-[var(--collapsible-panel-height)] overflow-hidden",
          "transition-[height] duration-[var(--duration-base)] ease-out-soft",
          "data-[starting-style]:h-0 data-[ending-style]:h-0"
        )}
      >
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
