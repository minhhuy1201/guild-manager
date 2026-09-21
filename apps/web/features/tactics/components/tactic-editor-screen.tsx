"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { QueryBoundary } from "@/components/shared/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CANVAS_GRID_STYLE } from "../lib/canvas-grid";
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";
import { useIsDesktop } from "../hooks/use-is-desktop";
import { useStageSize } from "../hooks/use-stage-size";
import { useStageZoom } from "../hooks/use-stage-zoom";
import { useTacticEditor } from "../hooks/use-tactic-editor";
import { useTacticExport } from "../hooks/use-tactic-export";
import { useUnsavedGuard } from "../hooks/use-unsaved-guard";
import { useTacticEditorStore } from "../store/editor-store";
import { elementBounds, selectionPlacement } from "../lib/selection-anchor";
import { ExportDialog } from "./export-dialog";
import { MobileEditorNotice } from "./mobile-editor-notice";
import { EditorToolbar } from "./editor-toolbar";
import { StageBar } from "./stage-bar";
import { TacticBreadcrumb } from "./tactic-breadcrumb";
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
  isAdmin: boolean;
}

/**
 * One tactic's page: the drawing tools from `lg` up, the read-only canvas and a notice below it.
 *
 * The whole coordination lives in `useTacticEditor`, so this component only builds the tree and
 * decides which half of it a screen this wide should see.
 * @param tacticId - Id of the tactic being opened
 * @param isAdmin - Whether the viewer may write
 * @returns The editor screen
 */
export function TacticEditorScreen({
  tacticId,
  isAdmin,
}: TacticEditorScreenProps) {
  const editor = useTacticEditor(tacticId, isAdmin);
  const isDesktop = useIsDesktop();
  const { ref, width } = useStageSize();
  const stageZoom = useStageZoom(width);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const scene = useTacticEditorStore((store) => store.scene);
  const activeStageId = useTacticEditorStore((store) => store.activeStageId);
  const dirty = useTacticEditorStore((store) => store.dirty);
  const tool = useTacticEditorStore((store) => store.tool);
  const color = useTacticEditorStore((store) => store.color);
  const strokeWidth = useTacticEditorStore((store) => store.strokeWidth);
  const paletteCollapsed = useTacticEditorStore(
    (store) => store.paletteCollapsed
  );
  const selectedElementId = useTacticEditorStore(
    (store) => store.selectedElementId
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
  const loadedScene = useTacticEditorStore((store) => store.scene);

  const stages = scene?.stages ?? [];
  // The action bar is a DOM overlay on the canvas, so where it goes follows the zoom and the pan.
  const selection = editor.selectedElement;
  const placement = selection
    ? selectionPlacement(
        elementBounds(selection),
        stageZoom.viewport,
        stageZoom.zoom
      )
    : null;
  const exporter = useTacticExport(editor.name, stages, editor.stageRef);
  // Drawing needs a pointer, a keyboard and room for the toolbar; everything else reads.
  const canDraw = isAdmin && isDesktop === true;

  useEditorShortcuts(canDraw && loadedScene !== null, editor.onSave, editor.onDeleteSelected);
  useUnsavedGuard(dirty);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        banner="tactics"
        size="compact"
        breadcrumb={<TacticBreadcrumb />}
        title={editor.name || "Đang tải..."}
      />

      <QueryBoundary
        state={editor.state}
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        <div className="flex flex-col gap-3">
          {canDraw ? (
            <div className="flex flex-col gap-3">
              <EditorToolbar
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                saving={editor.saving}
                dirty={dirty}
                isAdmin={isAdmin}
                onToolChange={setTool}
                onColorChange={setColor}
                onStrokeWidthChange={setStrokeWidth}
                onUndo={undo}
                onRedo={redo}
                onSave={editor.onSave}
                onExport={() => setExportOpen(true)}
              />

              <StageBar
                stages={stages}
                activeStageId={activeStageId}
                isAdmin={isAdmin}
                onSelect={setActiveStage}
                onAdd={addStage}
                onDuplicate={duplicateStage}
                onRename={renameStage}
                onRemove={removeStage}
              />
            </div>
          ) : null}

          {isAdmin && isDesktop === false ? <MobileEditorNotice /> : null}

          {/* A member, and anyone on a phone, reads the tactic through the viewer instead. */}
          {canDraw ? (
            <div className="flex overflow-hidden rounded-xl border bg-card shadow-xs">
              <TokenPalette
                collapsed={paletteCollapsed}
                isAdmin={isAdmin}
                selected={editor.paletteToken}
                onToggle={togglePalette}
                onSelect={(token) => {
                  editor.selectPaletteToken(token);
                  setTool("token");
                }}
                onManagePresets={() => setPresetsOpen(true)}
              />

              <div
                ref={ref}
                style={CANVAS_GRID_STYLE}
                className={cn(
                  "relative min-w-0 flex-1 overflow-hidden bg-muted/30",
                  // Konva writes the hover cursor inline on its own container, so the drag cursor
                  // has to be marked important to be seen at all while panning.
                  stageZoom.panning &&
                    "cursor-grabbing [&_.konvajs-content]:cursor-grabbing!"
                )}
              >
                {editor.activeStage ? (
                  <>
                    <TacticCanvas
                      stage={editor.activeStage}
                      width={width}
                      zoom={stageZoom.zoom}
                      selectedElementId={selectedElementId}
                      onPointerDown={editor.onPointerDown}
                      onPointerMove={editor.onPointerMove}
                      onPointerUp={editor.onPointerUp}
                      onTokenMoved={editor.onTokenMoved}
                      onElementClick={editor.onElementClick}
                      onStageReady={editor.onStageReady}
                      onWheel={stageZoom.onWheel}
                      onStageMouseDown={stageZoom.onPanStart}
                    />
                    {placement ? (
                      <SelectionActions
                        placement={placement}
                        tokenSize={
                          selection?.kind === "token" ? selection.size : null
                        }
                        onTokenSizeChange={editor.onTokenSizeChange}
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
            </div>
          ) : null}

          {isDesktop !== null && !canDraw ? (
            <TacticViewer stages={stages} />
          ) : null}

        </div>
      </QueryBoundary>

      <TextNoteDialog
        open={editor.pendingTextPoint !== null}
        onConfirm={editor.confirmText}
        onCancel={editor.cancelText}
      />

      <TokenPresetDialog open={presetsOpen} onOpenChange={setPresetsOpen} />

      <ExportDialog
        open={exportOpen}
        exporting={exporter.exporting}
        stageCount={stages.length}
        onOpenChange={setExportOpen}
        onExportActive={() => {
          exporter.exportActiveStage();
          setExportOpen(false);
        }}
        onExportAll={() => void exporter.exportAllStages()}
      />
    </div>
  );
}
