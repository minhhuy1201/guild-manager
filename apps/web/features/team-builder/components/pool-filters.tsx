"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@shared/enums";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
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
        <Select
          multiple
          value={guildClasses}
          onValueChange={(value) => setGuildClasses(value)}
        >
          <SelectTrigger id="pool-guild-class" className="w-full">
            <SelectValue>
              {(value: GuildClass[]) => {
                if (value.length === 0) return "Tất cả lưu phái";
                if (value.length === 1)
                  return (
                    <span className="flex items-center gap-2">
                      <Image
                        src={GUILD_CLASS_IMAGE[value[0]]}
                        alt=""
                        width={20}
                        height={20}
                        className="size-5 rounded-sm object-cover"
                      />
                      {GUILD_CLASS_LABEL[value[0]]}
                    </span>
                  );
                return `${value.length} lưu phái`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {GUILD_CLASS_OPTIONS.map((guildClass) => (
              <SelectItem key={guildClass} value={guildClass}>
                <span className="flex items-center gap-2">
                  <Image
                    src={GUILD_CLASS_IMAGE[guildClass]}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-sm object-cover"
                  />
                  {GUILD_CLASS_LABEL[guildClass]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
