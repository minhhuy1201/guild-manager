"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormationAnnounce } from "../hooks/use-formation-announce";
import { useFormationScreen } from "../hooks/use-formation-screen";
import { buildBannerTitle } from "../lib/banner-title";
import { AnnounceFormationDialog } from "./announce-formation-dialog";
import { CopyFormationDialog } from "./copy-formation-dialog";
import { FormationCaptureSheet } from "./formation-capture-sheet";
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
  const [confirmingCopy, setConfirmingCopy] = useState(false);

  // A short distance threshold keeps a plain click on a card from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // The team names are global, so an unsaved name is unsaved work on every day
  // of the week, not only the one whose tab is open.
  const hasUnsaved =
    screen.draft.dirtySessionIds.size > 0 || screen.teamNames.dirty;
  const dirty = screen.draft.dirty || screen.teamNames.dirty;
  const saving = screen.draft.saving || screen.teamNames.saving;
  const errorMessages = [
    screen.draft.saveErrorMessage,
    screen.teamNames.saveErrorMessage,
  ].filter((message): message is string => Boolean(message));
  const announce = useFormationAnnounce(screen.selection.activeSessionId, dirty);

  /**
   * Commit both drafts at once. They are independent resources, so they go in
   * parallel and each one only runs when it has something to write — renaming a
   * team must not rewrite the formation of the day that happens to be open.
   */
  async function handleSave() {
    await Promise.all([screen.draft.handleSave(), screen.teamNames.save()]);
  }

  // An empty match has nothing to lose, so it is copied over without a dialog.
  const activeMatchHasMembers = Object.values(screen.draft.assignment).some(
    Boolean
  );

  /** Copy straight into an empty match; ask first when it still holds people. */
  function handleCopy() {
    if (activeMatchHasMembers) {
      setConfirmingCopy(true);
      return;
    }

    screen.copy.copy();
  }

  /** Discard both drafts — the toolbar's "Đặt lại" covers everything it can save. */
  function handleReset() {
    screen.draft.resetActive();
    screen.teamNames.reset();
  }

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
  const activeSession = screen.selection.activeSession;
  if (!activeSession) {
    return (
      <Card>
        <CardContent>
          <EmptyState message="Tuần này chưa có trận đánh nào." />
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

        <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
          <FormationToolbar
            dirty={dirty}
            saving={saving}
            errorMessages={errorMessages}
            editable={screen.selection.editable}
            copySourceLabel={screen.copy.sourceLabel}
            canCopy={screen.copy.canCopy}
            onCopy={handleCopy}
            onSave={handleSave}
            onReset={handleReset}
            announcing={announce.sending}
            onAnnounce={() => announce.setOpen(true)}
          />
        </div>

        <CopyFormationDialog
          open={confirmingCopy}
          sourceLabel={screen.copy.sourceLabel}
          onOpenChange={setConfirmingCopy}
          onConfirm={screen.copy.copy}
        />

        <AnnounceFormationDialog
          open={announce.open}
          filledCounts={screen.draft.matches.map(
            (match) => Object.values(match.assignment).filter(Boolean).length
          )}
          slotCount={screen.draft.slotCount}
          blocked={dirty}
          sending={announce.sending}
          onOpenChange={announce.setOpen}
          onConfirm={announce.confirm}
        />

        {/* Sibling of the dialog, not a child: the dialog renders through a portal, while the
            sheet has to stay in the normal tree to keep a real layout to screenshot. */}
        {announce.open ? (
          <FormationCaptureSheet
            session={activeSession}
            matches={screen.draft.matches}
            charactersById={screen.pool.charactersById}
            absentIds={screen.pool.absentIds}
            names={screen.teamNames.names}
          />
        ) : null}

        <PrefillBanner
          result={screen.pool.prefill}
          onClear={screen.draft.clearActiveDraft}
        />

        <FormationGrid
          bannerTitle={buildBannerTitle({
            isGuildWar: activeSession.isGuildWar,
            dateTime: activeSession.dateTime,
            opponent: activeSession.opponent,
            activeMatchIndex: screen.draft.activeMatchIndex,
            draftMatchCount: screen.draft.matchCount,
            scheduledMatchCount: activeSession.matchCount,
          })}
          isGuildWar={activeSession.isGuildWar}
          locked={activeSession.locked}
          assignment={screen.draft.assignment}
          notes={screen.draft.notes}
          onNoteChange={screen.draft.setNote}
          names={screen.teamNames.names}
          onNameChange={screen.teamNames.setName}
          saving={saving}
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
