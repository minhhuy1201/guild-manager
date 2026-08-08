"use client";

import { useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormationScreen } from "../hooks/use-formation-screen";
import { ClassShortage } from "./class-shortage";
import { FormationGrid } from "./formation-grid";
import { FormationToolbar } from "./formation-toolbar";
import { MemberCard } from "./member-card";
import { MemberPool } from "./member-pool";
import { MatchTabs } from "./match-tabs";
import { PrefillBanner } from "./prefill-banner";
import { SessionTabs } from "./session-tabs";
import { WeekPicker } from "./week-picker";

/**
 * Guild war formation builder (admin only). One formation per battle of the
 * week; all the coordination lives in `useFormationScreen`, so this component
 * only builds the tree.
 * @returns The formation builder screen
 */
export function TeamBuilderScreen() {
  const screen = useFormationScreen();

  // A short distance threshold keeps a plain click on a card from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const hasUnsaved = screen.dirtySessionIds.size > 0;

  // Drafts live in memory, so leaving the page would silently drop them.
  useEffect(() => {
    if (!hasUnsaved) return;

    /**
     * Ask the browser to confirm before discarding unsaved drafts.
     * @param event - The beforeunload event
     */
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  if (screen.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState message={screen.errorMessage} onRetry={screen.refetch} />
        </CardContent>
      </Card>
    );
  }

  if (screen.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // A week with no battles is empty, not broken — say so instead of rendering
  // an empty tab bar over an empty grid.
  if (screen.sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Tuần này chưa có trận đánh nào.
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={screen.handleDragStart}
      onDragEnd={screen.handleDragEnd}
      onDragCancel={screen.cancelDrag}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Xếp đội hình bang chiến</h1>
          <WeekPicker
            weeks={screen.weeks}
            value={screen.weekStart}
            onChange={screen.setWeek}
          />
        </div>

        <SessionTabs
          sessions={screen.sessions}
          activeSessionId={screen.activeSessionId}
          dirtySessionIds={screen.dirtySessionIds}
          onSelect={screen.setActiveSession}
          slotCount={screen.slotCount}
        />

        <MatchTabs
          matchCount={screen.matchCount}
          activeMatchIndex={screen.activeMatchIndex}
          secondMatchHasMembers={Object.values(
            screen.matches[1]?.assignment ?? {}
          ).some(Boolean)}
          canAddMatch={screen.canAddMatch}
          onSelect={screen.setActiveMatch}
          onAdd={screen.addMatch}
          onRemove={screen.removeMatch}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <ClassShortage pool={screen.pool} />
          <FormationToolbar
            dirty={screen.dirty}
            saving={screen.saving}
            errorMessage={screen.saveErrorMessage}
            editable={screen.editable}
            onSave={screen.handleSave}
            onReset={screen.resetActive}
          />
        </div>

        <PrefillBanner
          result={screen.prefill}
          onClear={screen.clearActiveDraft}
        />

        <FormationGrid
          assignment={screen.assignment}
          notes={screen.notes}
          onNoteChange={screen.setNote}
          charactersById={screen.charactersById}
          readOnly={!screen.editable}
          absentIds={screen.absentIds}
        />
        <MemberPool
          pool={screen.pool}
          readOnly={!screen.editable}
          otherMatchIds={screen.otherMatchIds}
          activeMatchIndex={screen.activeMatchIndex}
        />
      </div>

      <DragOverlay>
        {screen.activeCharacter ? (
          <MemberCard
            character={screen.activeCharacter}
            className="cursor-grabbing"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
