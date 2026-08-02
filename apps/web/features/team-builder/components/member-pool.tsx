"use client";

import { useDroppable } from "@dnd-kit/core";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import { usePool } from "../hooks/use-pool";
import { POOL_DROPPABLE_ID, type PoolDropData } from "../lib/dnd-data";
import { DraggableMember } from "./draggable-member";
import { PoolFilters } from "./pool-filters";

interface MemberPoolProps {
  /** Full guild roster from the server */
  characters: Character[];
}

/**
 * Members not yet placed in the formation. The list is derived from the
 * assignment on every render, so dropping someone into a slot removes them here
 * without any extra bookkeeping. Dropping a card back onto this area frees their slot.
 * @param characters - Full guild roster from the server
 * @returns Card holding the filters and the available members
 */
export function MemberPool({ characters }: MemberPoolProps) {
  const data: PoolDropData = { type: "pool" };
  const { setNodeRef, isOver } = useDroppable({ id: POOL_DROPPABLE_ID, data });

  const pool = usePool(characters);
  const hasFilteredEverythingOut = pool.length === 0 && characters.length > 0;

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
              <p className="py-8 text-center text-sm text-muted-foreground">
                {hasFilteredEverythingOut
                  ? "Không có thành viên nào khớp bộ lọc."
                  : "Đã xếp hết thành viên vào đội hình."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 pr-3 md:grid-cols-3 lg:grid-cols-4">
                {pool.map((character) => (
                  <DraggableMember
                    key={character.id}
                    character={character}
                    from={POOL_DROPPABLE_ID}
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
