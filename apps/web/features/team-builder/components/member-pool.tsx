"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Character } from "@guild/shared/schemas";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionTitle } from "@/components/shared/section-title";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { POOL_DROPPABLE_ID, type PoolDropData } from "../lib/dnd-data";
import { toggleGuildClass, type GuildClassCount } from "../lib/pool";
import { usePoolFilterStore } from "../store/pool-filter-store";
import { DraggableMember } from "./draggable-member";
import { PoolClassChips } from "./pool-class-chips";
import { PoolFilters } from "./pool-filters";

/**
 * How the pool is drawn: a `card` of fixed height in the page, or a `column` that fills the height
 * of its container (focus mode).
 */
export type MemberPoolLayout = "card" | "column";

interface MemberPoolProps {
  /** Members available for the battle on screen, already filtered */
  pool: Character[];
  /** Members left to place per guild class, before the filters */
  classCounts: GuildClassCount[];
  /** Hide the pool entirely — a past week or a battle already fought */
  readOnly?: boolean;
  /** Ids of members already placed in the day's other match */
  otherMatchIds: Set<string>;
  /** Which match is on screen, 0-based — decides what the note says */
  activeMatchIndex: number;
  /** How the pool is drawn, a card by default */
  layout?: MemberPoolLayout;
}

/**
 * Members available for the battle but not yet placed. The list is derived by
 * the screen hook on every render, so dropping someone into a slot removes them
 * here without any extra bookkeeping. Dropping a card back onto this area frees
 * their slot.
 *
 * In the `column` layout the pool has no card around it: the title, the filters and the class chips
 * stay pinned at the top, and the list takes the rest of the column's height, scrolling inside the
 * drop area, so the whole list is where a card is dropped to free its slot.
 * @param pool - Members available for the battle, already filtered
 * @param classCounts - Members left per guild class, before the filters
 * @param readOnly - Hide the pool entirely
 * @param otherMatchIds - Ids of members already placed in the day's other match
 * @param activeMatchIndex - Which match is on screen, 0-based
 * @param layout - How the pool is drawn
 * @returns Card holding the filters and the available members, or nothing when read-only
 */
export function MemberPool({
  pool,
  classCounts,
  readOnly = false,
  otherMatchIds,
  activeMatchIndex,
  layout = "card",
}: MemberPoolProps) {
  const data: PoolDropData = { type: "pool" };
  const { setNodeRef, isOver } = useDroppable({
    id: POOL_DROPPABLE_ID,
    data,
    disabled: readOnly,
  });

  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);
  const setFilter = usePoolFilterStore((state) => state.setFilter);

  // Hooks run first: calling useDroppable conditionally would be a React error.
  if (readOnly) return null;

  const isFiltering = search.trim().length > 0 || guildClasses.length > 0;
  const isColumn = layout === "column";

  const filters = (
    <>
      <PoolFilters />

      <PoolClassChips
        counts={classCounts}
        selected={guildClasses}
        onToggle={(guildClass) =>
          setFilter({
            search,
            guildClasses: toggleGuildClass(guildClasses, guildClass),
          })
        }
      />
    </>
  );

  const list = (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-inner border border-dashed border-border bg-card/60 p-2 transition-[background-color,box-shadow,border-color] duration-[var(--duration-fast)]",
        isColumn && "flex min-h-0 flex-1 flex-col",
        isOver && "border-solid border-jade bg-jade/10 shadow-[var(--glow-jade)]"
      )}
    >
      <ScrollArea className={isColumn ? "min-h-0 flex-1" : "h-64"}>
        {pool.length === 0 ? (
          <EmptyState
            message={
              isFiltering
                ? "Không có thành viên nào khớp bộ lọc."
                : "Không còn ai để xếp cho trận này."
            }
          />
        ) : (
          <div
            className={cn(
              "grid grid-cols-2 gap-2 pr-3",
              !isColumn && "md:grid-cols-3 lg:grid-cols-4"
            )}
          >
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
  );

  if (isColumn) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 p-4">
        <SectionTitle count={pool.length}>Thành viên chưa xếp</SectionTitle>
        {filters}
        {list}
      </div>
    );
  }

  return (
    <Card variant="inset">
      <CardHeader>
        <SectionTitle count={pool.length}>Thành viên chưa xếp</SectionTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {filters}
        {list}
      </CardContent>
    </Card>
  );
}
