"use client";

import { useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CANVAS_GRID_STYLE } from "../lib/canvas-grid";
import { useStageArrows } from "../hooks/use-stage-arrows";
import { useStageSize } from "../hooks/use-stage-size";
import { useStageZoom } from "../hooks/use-stage-zoom";
import { StageArrowHint } from "./stage-arrow-hint";
import { TacticCanvas } from "./tactic-canvas";
import { ZoomReadout } from "./zoom-readout";

interface TacticViewerProps {
  /** Every stage of the tactic, in order */
  stages: TacticStage[];
}

/**
 * The read-only view of a tactic: one stage at a time, switched from the tabs above it or with the
 * left and right arrow keys.
 * This is what a member sees, and what the editor falls back to on a phone.
 * @param stages - Every stage of the tactic, in order
 * @returns The viewer
 */
export function TacticViewer({ stages }: TacticViewerProps) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const { ref, width } = useStageSize();
  const stageZoom = useStageZoom(width);

  const stage =
    stages.find((candidate) => candidate.id === activeStageId) ?? stages[0];

  // The arrows walk from the stage on screen, which is the first one until a tab is picked.
  const tablistRef = useStageArrows(stages, stage?.id ?? null, setActiveStageId);

  if (!stage) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {stages.length > 1 ? (
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Giai đoạn"
          className="flex flex-wrap items-center gap-2"
        >
          {/* Names, not the editor's clock faces: this is the view a phone gets, where a
              tooltip never opens and the name would have nowhere left to be read. */}
          {stages.map((candidate) => (
            <Button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={candidate.id === stage.id}
              // Roving tabIndex: Tab reaches the strip once, the arrows move inside it.
              tabIndex={candidate.id === stage.id ? 0 : -1}
              size="sm"
              variant={candidate.id === stage.id ? "default" : "ghost"}
              onClick={() => setActiveStageId(candidate.id)}
            >
              {candidate.name}
            </Button>
          ))}

          <StageArrowHint stageCount={stages.length} />
        </div>
      ) : null}

      <div
        ref={ref}
        style={CANVAS_GRID_STYLE}
        className={cn(
          "relative overflow-hidden rounded-xl border bg-muted/30",
          stageZoom.panning && "cursor-grabbing"
        )}
      >
        <TacticCanvas
          stage={stage}
          width={width}
          zoom={stageZoom.zoom}
          readOnly
          onWheel={stageZoom.onWheel}
          onStageMouseDown={stageZoom.onPanStart}
        />
        <ZoomReadout
          zoom={stageZoom.zoom.zoom}
          onStep={stageZoom.step}
          onReset={stageZoom.reset}
        />
      </div>
    </div>
  );
}
