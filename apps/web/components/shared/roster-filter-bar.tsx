"use client";

import { Search } from "lucide-react";

import { GuildClassFilterSelect } from "@/components/shared/guild-class-filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RosterFilter } from "@/lib/roster-filter";
import { cn } from "@/lib/utils";

/**
 * How the two controls are laid out. Only the arrangement differs — both
 * layouts render the same controls with the same labels, so this is a display
 * choice and not a second component.
 * - `stacked`: two columns with visible labels, filling a card or a page row.
 * - `inline`: one compact row with screen-reader-only labels, for sitting
 *   beside another control such as a create button.
 */
type RosterFilterLayout = "stacked" | "inline";

interface RosterFilterBarProps {
  /** Filter values currently applied. */
  value: RosterFilter;
  /** Called with the whole next filter whenever either half changes. */
  onChange: (next: RosterFilter) => void;
  /** Prefix for the input ids — several screens can share one page. */
  idPrefix: string;
  /** Arrangement of the two controls. Defaults to `stacked`. */
  layout?: RosterFilterLayout;
  /**
   * Extra classes on the root, for a caller whose own grid the two controls take part in —
   * a column span, or a different column count.
   */
  className?: string;
}

/**
 * Search box and guild class picker for a roster list.
 *
 * Controlled and storage-agnostic on purpose: a scoped Zustand store, an
 * unscoped one and a plain useState are all just adapters at the call site,
 * because the three screens hold this filter for different lifetimes.
 * @param value - Filter values currently applied
 * @param onChange - Receives the whole next filter
 * @param idPrefix - Prefix making the input ids unique on the page
 * @param layout - Arrangement of the two controls, `stacked` by default
 * @param className - Extra classes on the root
 * @returns The filter row
 */
export function RosterFilterBar({
  value,
  onChange,
  idPrefix,
  layout = "stacked",
  className,
}: RosterFilterBarProps) {
  const isInline = layout === "inline";
  const labelClassName = isInline ? "sr-only" : undefined;

  return (
    <div
      className={cn(
        isInline
          ? "flex flex-wrap items-center gap-2"
          : "grid gap-4 sm:grid-cols-2",
        className
      )}
    >
      <div className={isInline ? "w-64" : "flex flex-col gap-1.5"}>
        <Label htmlFor={`${idPrefix}-search`} className={labelClassName}>
          Tìm kiếm
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${idPrefix}-search`}
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            placeholder="Tên thành viên..."
            className="pl-9"
          />
        </div>
      </div>

      <div className={isInline ? "w-48" : "flex flex-col gap-1.5"}>
        <Label htmlFor={`${idPrefix}-guild-class`} className={labelClassName}>
          Lưu phái
        </Label>
        <GuildClassFilterSelect
          id={`${idPrefix}-guild-class`}
          value={value.guildClasses}
          onChange={(guildClasses) => onChange({ ...value, guildClasses })}
        />
      </div>
    </div>
  );
}
