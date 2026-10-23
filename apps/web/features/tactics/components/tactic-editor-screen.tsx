"use client";

import { useMemo, useRef, useState } from "react";

import { FocusModeShell } from "@/components/shared/focus-mode-shell";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useFocusMode } from "@/hooks/use-focus-mode";
import { cn } from "@/lib/utils";
import { CANVAS_GRID_STYLE } from "../lib/canvas-grid";
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";
import { useIsDesktop } from "../hooks/use-is-desktop";
import { useStagePlayback } from "../hooks/use-stage-playback";
import { useStageSize } from "../hooks/use-stage-size";
import { useStageTransition } from "../hooks/use-stage-transition";
import { useStageZoom } from "../hooks/use-stage-zoom";
import { useTacticEditor } from "../hooks/use-tactic-editor";
import { useTacticExport } from "../hooks/use-tactic-export";
import { useTacticNotesDraft } from "../hooks/use-tactic-notes-draft";
import { useLeaveGuard } from "../hooks/use-leave-guard";
import { useTacticEditorStore } from "../store/editor-store";
import { elementBounds, unionBounds } from "../lib/element-geometry";
import { selectionPlacement } from "../lib/selection-anchor";
import { canvasToMapPoint } from "../lib/stage-scale";
import { PICKING_TOOLS } from "../types/tactic";
import { ExportDialog } from "./export-dialog";
import { LeaveDialog } from "./leave-dialog";
import { MobileEditorNotice } from "./mobile-editor-notice";
import { PaletteDragPreview } from "./palette-drag-preview";
import { EditorToolbar } from "./editor-toolbar";
import { StageBar } from "./stage-bar";
import { StagePlaybackControls } from "./stage-playback-controls";
import { TacticHeader } from "./tactic-header";
import { TacticNotesPanel } from "./tactic-notes-panel";
import { SelectionActions } from "./selection-actions";
import { TacticCanvas } from "./tactic-canvas";
import { TacticViewer } from "./tactic-viewer";
import { ZoomReadout } from "./zoom-readout";
import { TextNoteDialog } from "./text-note-dialog";
import { TokenPalette } from "./token-palette";
import { TokenPresetDialog } from "./token-preset-dialog";

interface TacticEditorScreenProps {
  /** Id of the tactic being opened */
  tacticId: string;
  /** Whether the viewer may write — the API is what actually enforces it */
  canEdit: boolean;
}

/**
 * One tactic's page: the drawing tools from `lg` up, the read-only canvas and a notice below it.
 *
 * The whole coordination lives in `useTacticEditor`, so this component only builds the tree and
 * decides which half of it a screen this wide should see.
 *
 * The drawing tools can fill the window (`FocusModeShell`): the frame is restyled in place, so the
 * canvas, the zoom and the draft survive entering and leaving. Falling back to the viewer ends it.
 * @param tacticId - Id of the tactic being opened
 * @param canEdit - Whether the viewer may write
 * @returns The editor screen
 */
export function TacticEditorScreen({
  tacticId,
  canEdit,
}: TacticEditorScreenProps) {
  const editor = useTacticEditor(tacticId, canEdit);
  const isDesktop = useIsDesktop();
  const { ref, width } = useStageSize();
  const stageZoom = useStageZoom(width);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);

  const scene = useTacticEditorStore((store) => store.scene);
  const activeStageId = useTacticEditorStore((store) => store.activeStageId);
  const dirty = useTacticEditorStore((store) => store.dirty);
  const tool = useTacticEditorStore((store) => store.tool);
  const color = useTacticEditorStore((store) => store.color);
  const strokeWidth = useTacticEditorStore((store) => store.strokeWidth);
  const paletteCollapsed = useTacticEditorStore(
    (store) => store.paletteCollapsed
  );
  const tokenSize = useTacticEditorStore((store) => store.tokenSize);
  const selectedElementIds = useTacticEditorStore(
    (store) => store.selectedElementIds
  );
  const setTool = useTacticEditorStore((store) => store.setTool);
  const setColor = useTacticEditorStore((store) => store.setColor);
  const setStrokeWidth = useTacticEditorStore((store) => store.setStrokeWidth);
  const setActiveStage = useTacticEditorStore((store) => store.setActiveStage);
  const togglePalette = useTacticEditorStore((store) => store.togglePalette);
  const addStage = useTacticEditorStore((store) => store.addStage);
  const duplicateStage = useTacticEditorStore((store) => store.duplicateStage);
  const renameStage = useTacticEditorStore((store) => store.renameStage);
  const removeStage = useTacticEditorStore((store) => store.removeStage);
  const undo = useTacticEditorStore((store) => store.undo);
  const redo = useTacticEditorStore((store) => store.redo);

  const stages = scene?.stages ?? [];
  // The action bar is a DOM overlay on the canvas, so where it goes follows the zoom and the pan.
  // It steps aside while a drag or a marquee runs: it would cover what the pointer is working on.
  const selection =
    editor.isMoving || editor.marquee ? [] : editor.selectedElements;
  const placement =
    selection.length > 0
      ? selectionPlacement(
          unionBounds(selection.map(elementBounds)),
          stageZoom.viewport,
          stageZoom.zoom
        )
      : null;
  const exporter = useTacticExport(editor.name, stages, editor.stageRef);
  // An export switches stage and screenshots two frames later. With a move running, every picture
  // in the zip would catch the tokens mid-flight, so the canvas stands still until it is done.
  const { frame, animating } = useStageTransition(stages, activeStageId, {
    enabled: !exporter.exporting,
    onionSkin: onionSkin && !exporter.exporting,
  });
  const playback = useStagePlayback(
    stages,
    activeStageId,
    animating,
    setActiveStage
  );

  /**
   * Open a stage because the admin asked for it, which ends any playback that was running.
   * @param stageId - Id of the stage to open
   */
  function selectStage(stageId: string): void {
    playback.stop();
    setActiveStage(stageId);
  }
  // Drawing needs a pointer, a keyboard and room for the toolbar; everything else reads.
  const canDraw = canEdit && isDesktop === true;

  useEditorShortcuts(
    canDraw && scene !== null,
    () => void editor.onSave(),
    editor.onDeleteSelected
  );
  const notesDraft = useTacticNotesDraft(tacticId, editor.notes);
  // The drawing and the notes save on separate requests, so leaving saves whichever is unsaved and
  // stops at the first that fails.
  const unsaved = dirty || notesDraft.dirty;
  const leaveGuard = useLeaveGuard(unsaved, async () => {
    if (dirty && !(await editor.onSave())) return false;

    return notesDraft.dirty ? notesDraft.save() : true;
  });

  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const focusReturn = useMemo(
    () => ({ button: focusButtonRef, fallback: frameRef }),
    []
  );
  // A palette entry mid-drag owns Esc: the browser cancels the drag with it.
  const focus = useFocusMode(
    canDraw,
    editor.draggedPaletteToken !== null,
    focusReturn
  );

  return (
    <div className="flex flex-col gap-4">
      <TacticHeader title={editor.name || "Đang tải..."} />

      <QueryBoundary
        state={editor.state}
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        <div className="flex flex-col gap-3">
          {canEdit && isDesktop === false ? <MobileEditorNotice /> : null}

          {/* A member, and anyone on a phone, reads the tactic through the viewer instead. */}
          {canDraw ? (
            <FocusModeShell
              active={focus.active}
              label="Vẽ chiến thuật toàn màn hình"
              onExit={focus.exit}
              className="contents"
              bar={
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <h2 className="min-w-0 truncate text-sm font-semibold">
                    {editor.name}
                  </h2>
                  {unsaved ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Chưa lưu
                    </span>
                  ) : null}
                </div>
              }
            >
              <div
                ref={frameRef}
                data-testid="editor-frame"
                className={cn(
                  "flex flex-col",
                  focus.active
                    ? "min-h-0 flex-1 bg-card"
                    : "overflow-hidden rounded-container border bg-card shadow-sm"
                )}
              >
                <div className="border-b">
                  <EditorToolbar
                    tool={tool}
                    color={color}
                    strokeWidth={strokeWidth}
                    tokenSize={tokenSize}
                    canUndo={editor.canUndo}
                    canRedo={editor.canRedo}
                    saving={editor.saving}
                    dirty={dirty}
                    canEdit={canEdit}
                    onToolChange={setTool}
                    onColorChange={setColor}
                    onStrokeWidthChange={setStrokeWidth}
                    onTokenSizeChange={editor.onToolbarTokenSizeChange}
                    onUndo={undo}
                    onRedo={redo}
                    onSave={editor.onSave}
                    onExport={() => setExportOpen(true)}
                    onEnterFocus={focus.active ? undefined : focus.enter}
                    focusButtonRef={focusButtonRef}
                  />
                </div>

                <div className={cn("flex", focus.active && "min-h-0 flex-1")}>
                  <TokenPalette
                    collapsed={paletteCollapsed}
                    canEdit={canEdit}
                    selected={editor.paletteToken}
                    onToggle={togglePalette}
                    onSelect={(token) => {
                      editor.selectPaletteToken(token);
                      setTool("token");
                    }}
                    onManagePresets={() => setPresetsOpen(true)}
                    onDragStart={editor.onPaletteDragStart}
                    onDragEnd={editor.onPaletteDragEnd}
                  />

                  <div
                    ref={ref}
                    // A palette entry lands here through the browser's own drag and drop, which the
                    // Konva stage never hears about - so the drop is caught on the box around it.
                    onDragOver={(event) => {
                      if (!editor.isDraggingPaletteToken()) return;

                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();

                      const box = event.currentTarget.getBoundingClientRect();
                      editor.onPaletteDrop(
                        canvasToMapPoint(
                          { x: event.clientX - box.left, y: event.clientY - box.top },
                          stageZoom.zoom,
                          stageZoom.viewport.fitScale
                        )
                      );
                    }}
                    style={CANVAS_GRID_STYLE}
                    className={cn(
                      "relative min-w-0 flex-1 bg-muted/30",
                      focus.active ? "overflow-auto" : "overflow-hidden",
                      // Konva writes the hover cursor inline on its own container, so the drag cursor
                      // has to be marked important to be seen at all while panning.
                      stageZoom.panning &&
                        "cursor-grabbing [&_.konvajs-content]:cursor-grabbing!"
                    )}
                  >
                    {frame ? (
                      <>
                        <TacticCanvas
                          frame={frame}
                          animating={animating}
                          width={width}
                          zoom={stageZoom.zoom}
                          pickable={PICKING_TOOLS.has(tool)}
                          selectedElementIds={selectedElementIds}
                          marquee={editor.marquee}
                          onPointerDown={editor.onPointerDown}
                          onPointerMove={editor.onPointerMove}
                          onPointerUp={editor.onPointerUp}
                          onStageReady={editor.onStageReady}
                          onWheel={stageZoom.onWheel}
                          onStageMouseDown={stageZoom.onPanStart}
                        />
                        {placement ? (
                          <SelectionActions
                            placement={placement}
                            tokenSizes={selection.flatMap((element) =>
                              element.kind === "token" ? [element.size] : []
                            )}
                            onTokenSizeChange={editor.onSelectionTokenSizeChange}
                            onDeleteSelected={editor.onDeleteSelected}
                          />
                        ) : null}
                        <ZoomReadout
                          zoom={stageZoom.zoom.zoom}
                          onStep={stageZoom.step}
                          onReset={stageZoom.reset}
                        />
                      </>
                    ) : null}
                  </div>

                  <TacticNotesPanel notes={editor.notes} draft={notesDraft} />
                </div>

                <div className="border-t">
                  <StageBar
                    stages={stages}
                    activeStageId={activeStageId}
                    canEdit={canEdit}
                    playbackControls={
                      <StagePlaybackControls
                        playing={playback.playing}
                        onionSkin={onionSkin}
                        disabled={stages.length < 2}
                        onTogglePlay={playback.toggle}
                        onToggleOnionSkin={() => setOnionSkin((on) => !on)}
                      />
                    }
                    onSelect={selectStage}
                    onAdd={addStage}
                    onDuplicate={duplicateStage}
                    onRename={renameStage}
                    onRemove={removeStage}
                  />
                </div>
              </div>
            </FocusModeShell>
          ) : null}

          {isDesktop !== null && !canDraw ? (
            <TacticViewer
              name={editor.name}
              stages={stages}
              notes={editor.notes}
            />
          ) : null}
        </div>
      </QueryBoundary>

      {editor.draggedPaletteToken ? (
        <PaletteDragPreview
          token={editor.draggedPaletteToken}
          color={color}
          size={tokenSize}
          scale={stageZoom.viewport.fitScale * stageZoom.zoom.zoom}
        />
      ) : null}

      <TextNoteDialog
        open={editor.pendingTextPoint !== null}
        onConfirm={editor.confirmText}
        onCancel={editor.cancelText}
      />

      <TokenPresetDialog open={presetsOpen} onOpenChange={setPresetsOpen} />

      <LeaveDialog guard={leaveGuard} />

      <ExportDialog
        open={exportOpen}
        exporting={exporter.exporting}
        stageCount={stages.length}
        onOpenChange={setExportOpen}
        onExportActive={() => {
          void exporter.exportActiveStage();
          setExportOpen(false);
        }}
        onExportAll={() => void exporter.exportAllStages()}
      />
    </div>
  );
}
