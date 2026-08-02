"use client";

import { Search } from "lucide-react";

import { GuildClassFilterSelect } from "@/components/shared/guild-class-filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoolFilterStore } from "../store/pool-filter-store";

/**
 * Search box and guild class picker narrowing the member pool.
 * Reads and writes the pool filter store directly.
 * @returns Filter row for the member pool
 */
export function PoolFilters() {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);
  const setSearch = usePoolFilterStore((state) => state.setSearch);
  const setGuildClasses = usePoolFilterStore((state) => state.setGuildClasses);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pool-search">Tìm kiếm</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pool-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên thành viên hoặc ID..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pool-guild-class">Lưu phái</Label>
        <GuildClassFilterSelect
          id="pool-guild-class"
          value={guildClasses}
          onChange={setGuildClasses}
        />
      </div>
    </div>
  );
}
