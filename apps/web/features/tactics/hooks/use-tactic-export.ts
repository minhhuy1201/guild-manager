"use client";

import { useCallback, useState } from "react";
import type Konva from "konva";
import type { TacticStage } from "@guild/shared/schemas";

import {
  EXPORT_PIXEL_RATIO,
  buildStagesZip,
  downloadBlob,
  downloadDataUrl,
  exportFileName,
  type ExportedStage,
} from "../lib/export-image";
import { useTacticEditorStore } from "../store/editor-store";

/** What the export dialog drives. */
export interface TacticExport {
  /** Whether an export is running */
  exporting: boolean;
  /** Save the stage currently on screen as one PNG */
  exportActiveStage: () => void;
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

  const exportActiveStage = useCallback(() => {
    const konvaStage = stageRef.current;
    const activeStageId = useTacticEditorStore.getState().activeStageId;
    const index = stages.findIndex((stage) => stage.id === activeStageId);

    if (!konvaStage || index === -1) {
      return;
    }

    downloadDataUrl(
      konvaStage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO }),
      exportFileName(tacticName, index + 1, stages[index].name)
    );
  }, [stageRef, stages, tacticName]);

  const exportAllStages = useCallback(async () => {
    const openStageId = useTacticEditorStore.getState().activeStageId;
    const files: ExportedStage[] = [];

    setExporting(true);

    try {
      for (const [index, stage] of stages.entries()) {
        setActiveStage(stage.id);
        await nextPaint();

        const dataUrl = stageRef.current?.toDataURL({
          pixelRatio: EXPORT_PIXEL_RATIO,
        });

        if (dataUrl) {
          files.push({
            name: exportFileName(tacticName, index + 1, stage.name),
            dataUrl,
          });
        }
      }

      downloadBlob(await buildStagesZip(files), `${tacticName}.zip`);
    } finally {
      if (openStageId) setActiveStage(openStageId);
      setExporting(false);
    }
  }, [setActiveStage, stageRef, stages, tacticName]);

  return { exporting, exportActiveStage, exportAllStages };
}
