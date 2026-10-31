"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useFocusMode } from "@/hooks/use-focus-mode";
import { useFormationAnnounce } from "../hooks/use-formation-announce";
import { useFormationScreen } from "../hooks/use-formation-screen";
import { useSaveShortcut } from "../hooks/use-save-shortcut";
import { useUndoShortcut } from "../hooks/use-undo-shortcut";
import type { FormationLayout } from "../types/formation";
import { buildBannerTitle } from "../lib/banner-title";
import { AbsentBanner } from "./absent-banner";
import { AnnounceFormationDialog } from "./announce-formation-dialog";
import { CopyFormationDialog } from "./copy-formation-dialog";
import { FocusModeOverlay } from "./focus-mode-overlay";
import { FormationCaptureSheet } from "./formation-capture-sheet";
import { FormationGrid } from "./formation-grid";
import { FormationToolbar } from "./formation-toolbar";
import { MemberCard } from "./member-card";
import { MemberPool, type MemberPoolLayout } from "./member-pool";
import { MatchTabs } from "./match-tabs";
import { PrefillBanner } from "./prefill-banner";
import { SaveConflictDialog } from "./save-conflict-dialog";
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

  // The team settings are global, so an unsaved name or colour is unsaved work on every day
  // of the week, not only the one whose tab is open.
  const hasUnsaved =
    screen.draft.dirtySessionIds.size > 0 || screen.teamSettings.dirty;
  const dirty = screen.draft.dirty || screen.teamSettings.dirty;
  const saving = screen.draft.saving || screen.teamSettings.saving;
  const editable = screen.selection.editable;
  const changeCount = screen.draft.changeCount + screen.teamSettings.changeCount;
  // A day already played has no Save, exactly as before the bar existed: its formation cannot be
  // written, so a save from there would only meet the lock.
  const showSaveBar = editable && dirty;
  const errorMessages = [
    screen.draft.saveErrorMessage,
    screen.teamSettings.saveErrorMessage,
  ].filter((message): message is string => Boolean(message));
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<HTMLElement>(null);
  const focusReturn = useMemo(
    () => ({ button: focusButtonRef, fallback: controlsRef }),
    []
  );
  const focusMode = useFocusMode(
    editable,
    Boolean(screen.dnd.activeCharacter),
    focusReturn
  );
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
    await Promise.all([screen.draft.handleSave(), screen.teamSettings.save()]);
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
    screen.teamSettings.reset();
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

  // The grid and the pool are mounted in one place only - the page or the focus mode overlay - since
  // each slot and the pool are dnd-kit droppables with unique ids.
  const bannerTitle = buildBannerTitle({
    isGuildWar: activeSession.isGuildWar,
    dateTime: activeSession.dateTime,
    opponent: activeSession.opponent,
    activeMatchIndex: screen.draft.activeMatchIndex,
    draftMatchCount: screen.draft.matchCount,
    scheduledMatchCount: activeSession.matchCount,
  });
  const saveBar = showSaveBar ? (
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
  ) : null;
  const matchTabs = (
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
  );
  const absentCount = editable ? screen.pool.absentIds.size : 0;
  const removeAbsent = () =>
    screen.draft.removeFromActiveMatch(screen.pool.absentIds);
  const grid = (layout: FormationLayout) => (
    <FormationGrid
      bannerTitle={bannerTitle}
      isGuildWar={activeSession.isGuildWar}
      locked={activeSession.locked}
      assignment={screen.draft.assignment}
      notes={screen.draft.notes}
      onNoteChange={screen.draft.setNote}
      names={screen.teamSettings.names}
      onNameChange={screen.teamSettings.setName}
      colors={screen.teamSettings.colors}
      onColorChange={screen.teamSettings.setColor}
      saving={saving}
      charactersById={screen.pool.charactersById}
      readOnly={!editable}
      absentIds={screen.pool.absentIds}
      layout={layout}
    />
  );
  const pool = (layout: MemberPoolLayout) => (
    <MemberPool
      pool={screen.pool.pool}
      classCounts={screen.pool.classCounts}
      readOnly={!editable}
      otherMatchIds={screen.pool.otherMatchIds}
      activeMatchIndex={screen.draft.activeMatchIndex}
      layout={layout}
    />
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={screen.dnd.handleDragStart}
      onDragEnd={screen.dnd.handleDragEnd}
      onDragCancel={screen.dnd.cancelDrag}
    >
      <div className="flex flex-col gap-4" inert={focusMode.active}>
        <PageHeader
          banner="teamBuilder"
          title="Xếp đội hình bang chiến"
          actions={
            <WeekPicker
              weeks={screen.week.weeks}
              value={screen.week.weekStart}
              onChange={screen.week.setWeek}
            />
          }
        />

        {/* One control area in two rows: the battle sessions at full width, then the match controls on
            the left and what to do with the line-up on the right. The DOM order is the visual order,
            so focus follows the eye. */}
        <section
          ref={controlsRef}
          aria-label="Điều khiển đội hình"
          tabIndex={-1}
          className="flex flex-col gap-3 rounded-container border border-border/60 bg-muted/60 p-3 outline-none"
        >
          <SessionTabs
            sessions={screen.selection.sessions}
            activeSessionId={screen.selection.activeSessionId}
            dirtySessionIds={screen.draft.dirtySessionIds}
            onSelect={screen.selection.setActiveSession}
            slotCount={screen.draft.slotCount}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {matchTabs}

            <FormationToolbar
              dirty={dirty}
              saving={saving}
              editable={editable}
              copySourceLabel={screen.copy.sourceLabel}
              canCopy={screen.copy.canCopy}
              onCopy={handleCopy}
              announcing={announce.sending}
              onAnnounce={() => announce.setOpen(true)}
              onEnterFocus={focusMode.enter}
              focusButtonRef={focusButtonRef}
            />
          </div>
        </section>

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
          notifyMembers={announce.notifyMembers}
          session={activeSession}
          note={announce.note}
          onNoteChange={announce.setNote}
          outcome={announce.outcome}
          onNotifyMembersChange={announce.setNotifyMembers}
          onRetry={announce.retry}
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
            names={screen.teamSettings.names}
            colors={screen.teamSettings.colors}
          />
        ) : null}

        <SaveConflictDialog
          formationLabel={activeSession.label}
          isFormationStale={screen.draft.isStale}
          isTeamSettingsStale={screen.teamSettings.isStale}
          onReload={() => {
            if (screen.draft.isStale) screen.draft.discardStale();
            if (screen.teamSettings.isStale) screen.teamSettings.discardStale();
          }}
          onOverwrite={async () => {
            await Promise.all([
              screen.draft.isStale ? screen.draft.overwriteStale() : undefined,
              screen.teamSettings.isStale
                ? screen.teamSettings.overwriteStale()
                : undefined,
            ]);
          }}
          onClose={() => {
            screen.draft.dismissStale();
            screen.teamSettings.dismissStale();
          }}
        />

        <PrefillBanner
          result={screen.pool.prefill}
          onClear={screen.draft.clearActiveDraft}
        />

        <AbsentBanner count={absentCount} onRemove={removeAbsent} />

        {focusMode.active ? null : (
          <>
            {grid("screen")}
            {pool("card")}
          </>
        )}

        {focusMode.active ? null : saveBar}
      </div>

      {focusMode.active ? (
        <FocusModeOverlay
          title={bannerTitle}
          onExit={focusMode.exit}
          matchTabs={matchTabs}
          notice={
            <AbsentBanner count={absentCount} onRemove={removeAbsent} compact />
          }
          footer={saveBar}
          grid={grid("focus")}
          pool={pool("column")}
        />
      ) : null}

      <DragOverlay>
        {screen.dnd.activeCharacter ? (
          <MemberCard
            character={screen.dnd.activeCharacter}
            className="cursor-grabbing shadow-lg ring-2 ring-jade/70"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
