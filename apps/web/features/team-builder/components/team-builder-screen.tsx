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

  const hasUnsaved = screen.draft.dirtySessionIds.size > 0;

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

  if (screen.week.isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            message={screen.week.errorMessage}
            onRetry={screen.week.refetch}
          />
        </CardContent>
      </Card>
    );
  }

  if (screen.week.isPending) {
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
  if (screen.selection.sessions.length === 0) {
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
      onDragStart={screen.dnd.handleDragStart}
      onDragEnd={screen.dnd.handleDragEnd}
      onDragCancel={screen.dnd.cancelDrag}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Xếp đội hình bang chiến</h1>
          <WeekPicker
            weeks={screen.week.weeks}
            value={screen.week.weekStart}
            onChange={screen.week.setWeek}
          />
        </div>

        <SessionTabs
          sessions={screen.selection.sessions}
          activeSessionId={screen.selection.activeSessionId}
          dirtySessionIds={screen.draft.dirtySessionIds}
          onSelect={screen.selection.setActiveSession}
          slotCount={screen.draft.slotCount}
        />

        <MatchTabs
          matchCount={screen.draft.matchCount}
          activeMatchIndex={screen.draft.activeMatchIndex}
          secondMatchHasMembers={Object.values(
            screen.draft.matches[1]?.assignment ?? {}
          ).some(Boolean)}
          canAddMatch={screen.draft.canAddMatch}
          onSelect={screen.draft.setActiveMatch}
          onAdd={screen.draft.addMatch}
          onRemove={screen.draft.removeMatch}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <ClassShortage pool={screen.pool.pool} />
          <FormationToolbar
            dirty={screen.draft.dirty}
            saving={screen.draft.saving}
            errorMessage={screen.draft.saveErrorMessage}
            editable={screen.selection.editable}
            onSave={screen.draft.handleSave}
            onReset={screen.draft.resetActive}
          />
        </div>

        <PrefillBanner
          result={screen.pool.prefill}
          onClear={screen.draft.clearActiveDraft}
        />

        <FormationGrid
          assignment={screen.draft.assignment}
          notes={screen.draft.notes}
          onNoteChange={screen.draft.setNote}
          charactersById={screen.pool.charactersById}
          readOnly={!screen.selection.editable}
          absentIds={screen.pool.absentIds}
        />
        <MemberPool
          pool={screen.pool.pool}
          readOnly={!screen.selection.editable}
          otherMatchIds={screen.pool.otherMatchIds}
          activeMatchIndex={screen.draft.activeMatchIndex}
        />
      </div>

      <DragOverlay>
        {screen.dnd.activeCharacter ? (
          <MemberCard
            character={screen.dnd.activeCharacter}
            className="cursor-grabbing"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
