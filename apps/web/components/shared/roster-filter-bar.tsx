"use client";

import { Search } from "lucide-react";

import { GuildClassFilterSelect } from "@/components/shared/guild-class-filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RosterFilter } from "@/lib/roster-filter";

interface RosterFilterBarProps {
  /** Filter values currently applied. */
  value: RosterFilter;
  /** Called with the whole next filter whenever either half changes. */
  onChange: (next: RosterFilter) => void;
  /** Prefix for the input ids — several screens can share one page. */
  idPrefix: string;
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
 * @returns Two-column filter row
 */
export function RosterFilterBar({
  value,
  onChange,
  idPrefix,
}: RosterFilterBarProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-search`}>Tìm kiếm</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${idPrefix}-search`}
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            placeholder="Tên thành viên hoặc ID..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-guild-class`}>Lưu phái</Label>
        <GuildClassFilterSelect
          id={`${idPrefix}-guild-class`}
          value={value.guildClasses}
          onChange={(guildClasses) => onChange({ ...value, guildClasses })}
        />
      </div>
    </div>
  );
}
