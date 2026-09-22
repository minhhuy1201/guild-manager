"use client";

import { useCallback, useState } from "react";
import type Konva from "konva";
import type { TacticStage } from "@guild/shared/schemas";

import { toastError } from "@/components/shared/toast";
import { errorMessageOf } from "@/lib/error-message";
import {
  buildStagesZip,
  downloadBlob,
  downloadDataUrl,
  exportFileName,
  mapExportRegion,
  type ExportedStage,
} from "../lib/export-image";
import { useTacticEditorStore } from "../store/editor-store";

/** What the export dialog drives. */
export interface TacticExport {
  /** Whether an export is running */
  exporting: boolean;
  /** Save the stage currently on screen as one PNG */
  exportActiveStage: () => Promise<void>;
  /** Save every stage as PNGs inside one zip */
  exportAllStages: () => Promise<void>;
}

/**
 * Wait for the browser to paint what was just put on screen.
 * Two frames, not one: the first lets React commit the new stage, the second lets Konva draw it.
 * @returns A promise settled once the canvas holds the new stage
 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Render the whole map off the live stage, at the export size, whatever the zoom and pan.
 * @param konvaStage - The stage on screen
 * @returns The PNG as a data URL
 */
function captureMap(konvaStage: Konva.Stage): string {
  return konvaStage.toDataURL(
    mapExportRegion({
      scale: konvaStage.scaleX(),
      x: konvaStage.x(),
      y: konvaStage.y(),
    })
  );
}

/**
 * Export a tactic's stages as images.
 *
 * Both paths capture the stage that is on screen, one stage at a time: the map picture is already
 * loaded there, so nothing has to be fetched or re-decoded, and twenty offscreen canvases never
 * exist at once.
 * @param tacticName - Name of the tactic, used in the file names
 * @param stages - Every stage of the tactic, in order
 * @param stageRef - The live Konva stage
 * @returns The export actions and whether one is running
 */
export function useTacticExport(
  tacticName: string,
  stages: TacticStage[],
  stageRef: React.RefObject<Konva.Stage | null>
): TacticExport {
  const [exporting, setExporting] = useState(false);
  const setActiveStage = useTacticEditorStore((store) => store.setActiveStage);
  const selectElement = useTacticEditorStore((store) => store.selectElement);

  const exportActiveStage = useCallback(async () => {
    const activeStageId = useTacticEditorStore.getState().activeStageId;
    const index = stages.findIndex((stage) => stage.id === activeStageId);

    if (!stageRef.current || index === -1) {
      return;
    }

    // The selection ring is how the editor points at something, not part of the drawing. The flag
    // does the same for the stage animation, which would otherwise be caught mid-move.
    selectElement(null);
    setExporting(true);

    try {
      await nextPaint();

      const konvaStage = stageRef.current;

      if (!konvaStage) {
        return;
      }

      downloadDataUrl(
        captureMap(konvaStage),
        exportFileName(tacticName, index + 1, stages[index].name)
      );
    } catch (caught) {
      // Fired from a click without awaiting it, like the zip: the toast is the only place left.
      toastError(errorMessageOf(caught, "Không xuất được ảnh."));
    } finally {
      setExporting(false);
    }
  }, [selectElement, stageRef, stages, tacticName]);

  const exportAllStages = useCallback(async () => {
    const openStageId = useTacticEditorStore.getState().activeStageId;
    const files: ExportedStage[] = [];

    setExporting(true);

    try {
      for (const [index, stage] of stages.entries()) {
        // Switching stage also clears the selection, so no ring reaches the file.
        setActiveStage(stage.id);
        await nextPaint();

        const konvaStage = stageRef.current;

        if (konvaStage) {
          files.push({
            name: exportFileName(tacticName, index + 1, stage.name),
            dataUrl: captureMap(konvaStage),
          });
        }
      }

      downloadBlob(await buildStagesZip(files), `${tacticName}.zip`);
    } catch (caught) {
      // The screen fires this from a click without awaiting it, so this toast is the only place a
      // failure can still be seen.
      toastError(errorMessageOf(caught, "Không xuất được ảnh."));
    } finally {
      if (openStageId) setActiveStage(openStageId);
      setExporting(false);
    }
  }, [setActiveStage, stageRef, stages, tacticName]);

  return { exporting, exportActiveStage, exportAllStages };
}
