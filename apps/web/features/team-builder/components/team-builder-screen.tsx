"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { UnsavedChangesBar } from "@/components/shared/unsaved-changes-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormationAnnounce } from "../hooks/use-formation-announce";
import { useFormationScreen } from "../hooks/use-formation-screen";
import { useSaveShortcut } from "../hooks/use-save-shortcut";
import { useUndoShortcut } from "../hooks/use-undo-shortcut";
import { buildBannerTitle } from "../lib/banner-title";
import { AbsentBanner } from "./absent-banner";
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

  // A mouse drags after 8px, so a plain click on a card never starts one. A finger drags after a
  // 250ms press held within 5px: a swipe then scrolls the page and the pool, which on a phone - where
  // the cards cover most of the screen - it could not do while any touch on a card was a drag.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // The team names are global, so an unsaved name is unsaved work on every day
  // of the week, not only the one whose tab is open.
  const hasUnsaved =
    screen.draft.dirtySessionIds.size > 0 || screen.teamNames.dirty;
  const dirty = screen.draft.dirty || screen.teamNames.dirty;
  const saving = screen.draft.saving || screen.teamNames.saving;
  const editable = screen.selection.editable;
  const changeCount = screen.draft.changeCount + screen.teamNames.changeCount;
  // A day already played has no Save, exactly as before the bar existed: its formation cannot be
  // written, so a save from there would only meet the lock.
  const showSaveBar = editable && dirty;
  const errorMessages = [
    screen.draft.saveErrorMessage,
    screen.teamNames.saveErrorMessage,
  ].filter((message): message is string => Boolean(message));
  const announce = useFormationAnnounce(
    screen.selection.activeSessionId,
    screen.draft.matches.length,
    dirty
  );

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

  /** Discard both drafts - the save bar's "Đặt lại" covers everything it can save. */
  function handleReset() {
    screen.draft.resetActive();
    screen.teamNames.reset();
  }

  useSaveShortcut(handleSave, showSaveBar && !saving);
  // Not while saving: a save that succeeds drops the draft, taking an undo made meanwhile with it.
  useUndoShortcut(screen.draft.undo, screen.draft.canUndo && !saving);

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
        <PageHeader
          banner="teamBuilder"
          size="compact"
          title="Xếp đội hình bang chiến"
          actions={
            <WeekPicker
              weeks={screen.week.weeks}
              value={screen.week.weekStart}
              onChange={screen.week.setWeek}
            />
          }
        />

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

        <FormationToolbar
          dirty={dirty}
          saving={saving}
          editable={editable}
          copySourceLabel={screen.copy.sourceLabel}
          canCopy={screen.copy.canCopy}
          onCopy={handleCopy}
          announcing={announce.sending}
          onAnnounce={() => announce.setOpen(true)}
        />

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

        <AbsentBanner
          count={editable ? screen.pool.absentIds.size : 0}
          onRemove={() =>
            screen.draft.removeFromActiveMatch(screen.pool.absentIds)
          }
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
          readOnly={!editable}
          absentIds={screen.pool.absentIds}
        />
        <MemberPool
          pool={screen.pool.pool}
          classCounts={screen.pool.classCounts}
          readOnly={!editable}
          otherMatchIds={screen.pool.otherMatchIds}
          activeMatchIndex={screen.draft.activeMatchIndex}
        />

        {showSaveBar ? (
          <UnsavedChangesBar
            message={`${changeCount} thay đổi chưa lưu`}
            resetLabel="Đặt lại"
            saving={saving}
            errorMessages={errorMessages}
            onSave={handleSave}
            onReset={handleReset}
            // Ctrl+Z's twin for a phone. The bar itself locks it while saving, as the shortcut does.
            undo={{ onUndo: screen.draft.undo, canUndo: screen.draft.canUndo }}
          />
        ) : null}
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
