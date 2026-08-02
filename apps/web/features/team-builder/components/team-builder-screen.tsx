"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCharacters, type Character } from "@/features/attendance";
import { isMemberDragData, toDragSource, toDropTarget } from "../lib/dnd-data";
import { useFormationStore } from "../store/formation-store";
import { FormationGrid } from "./formation-grid";
import { MemberCard } from "./member-card";
import { MemberPool } from "./member-pool";

/**
 * Guild war formation builder (admin only). Owns the DndContext and translates
 * dnd-kit events into store actions; every rule about what a drop means lives in
 * `lib/assignment.ts`, so this handler stays free of business branches.
 * @returns The formation builder screen
 */
export function TeamBuilderScreen() {
  const { data, isPending, isError, error, refetch } = useCharacters();
  const drop = useFormationStore((state) => state.drop);
  const reset = useFormationStore((state) => state.reset);

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

  const characters = useMemo(() => data ?? [], [data]);
  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );

  // A short distance threshold keeps a plain click on a card from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /**
   * Remember which character is moving so DragOverlay can preview it.
   * @param event - dnd-kit drag start event
   */
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (!isMemberDragData(data)) return;
    setActiveCharacter(charactersById.get(data.characterId) ?? null);
  }

  /**
   * Hand the finished gesture to the store. Malformed payloads and drops
   * outside every droppable both end up as no-ops.
   * @param event - dnd-kit drag end event
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveCharacter(null);

    const dragData = event.active.data.current;
    if (!isMemberDragData(dragData)) return;

    drop(
      toDragSource(dragData),
      dragData.characterId,
      toDropTarget(event.over?.data.current)
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            message={error?.message ?? "Không tải được danh sách thành viên."}
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCharacter(null)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Xếp đội hình bang chiến</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Đặt lại
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button type="button" size="sm" disabled>
                    Lưu đội hình
                  </Button>
                }
              />
              <TooltipContent>Chức năng đang được xây dựng</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <FormationGrid charactersById={charactersById} />
        <MemberPool characters={characters} />
      </div>

      <DragOverlay>
        {activeCharacter ? (
          <MemberCard character={activeCharacter} className="cursor-grabbing" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
