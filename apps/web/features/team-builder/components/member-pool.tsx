"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Character } from "@guild/shared/schemas";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { POOL_DROPPABLE_ID, type PoolDropData } from "../lib/dnd-data";
import { usePoolFilterStore } from "../store/pool-filter-store";
import { DraggableMember } from "./draggable-member";
import { PoolFilters } from "./pool-filters";

interface MemberPoolProps {
  /** Members available for the battle on screen, already filtered */
  pool: Character[];
  /** Hide the pool entirely — a past week or a battle already fought */
  readOnly?: boolean;
  /** Ids of members already placed in the day's other match */
  otherMatchIds: Set<string>;
  /** Which match is on screen, 0-based — decides what the note says */
  activeMatchIndex: number;
}

/**
 * Members available for the battle but not yet placed. The list is derived by
 * the screen hook on every render, so dropping someone into a slot removes them
 * here without any extra bookkeeping. Dropping a card back onto this area frees
 * their slot.
 * @param pool - Members available for the battle, already filtered
 * @param readOnly - Hide the pool entirely
 * @param otherMatchIds - Ids of members already placed in the day's other match
 * @param activeMatchIndex - Which match is on screen, 0-based
 * @returns Card holding the filters and the available members, or nothing when read-only
 */
export function MemberPool({
  pool,
  readOnly = false,
  otherMatchIds,
  activeMatchIndex,
}: MemberPoolProps) {
  const data: PoolDropData = { type: "pool" };
  const { setNodeRef, isOver } = useDroppable({
    id: POOL_DROPPABLE_ID,
    data,
    disabled: readOnly,
  });

  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);

  // Hooks run first: calling useDroppable conditionally would be a React error.
  if (readOnly) return null;

  const isFiltering = search.trim().length > 0 || guildClasses.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thành viên chưa xếp ({pool.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PoolFilters />

        <div
          ref={setNodeRef}
          className={cn(
            "rounded-md border border-dashed p-2 transition-colors",
            isOver && "border-primary bg-primary/5"
          )}
        >
          <ScrollArea className="h-64">
            {pool.length === 0 ? (
              <EmptyState
                message={
                  isFiltering
                    ? "Không có thành viên nào khớp bộ lọc."
                    : "Không còn ai để xếp cho trận này."
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 pr-3 md:grid-cols-3 lg:grid-cols-4">
                {pool.map((character) => (
                  <DraggableMember
                    key={character.id}
                    character={character}
                    from={POOL_DROPPABLE_ID}
                    note={
                      otherMatchIds.has(character.id)
                        ? `đang đánh trận ${activeMatchIndex === 0 ? 2 : 1}`
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
