"use client";

import { useId, useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CANVAS_GRID_STYLE } from "../lib/canvas-grid";
import { useStageArrows } from "../hooks/use-stage-arrows";
import { useStagePlayback } from "../hooks/use-stage-playback";
import { useStageSize } from "../hooks/use-stage-size";
import { useStageTransition } from "../hooks/use-stage-transition";
import { useStageZoom } from "../hooks/use-stage-zoom";
import { StageArrowHint } from "./stage-arrow-hint";
import { StagePlaybackControls } from "./stage-playback-controls";
import { TacticCanvas } from "./tactic-canvas";
import { TacticNotesText } from "./tactic-notes-panel";
import { ZoomReadout } from "./zoom-readout";

interface TacticViewerProps {
  /** Every stage of the tactic, in order */
  stages: TacticStage[];
  /** The tactic's notes, null when it has none */
  notes: string | null;
}

/**
 * The read-only view of a tactic: one stage at a time, switched from the tabs above it or with the
 * left and right arrow keys.
 * This is what a member sees, and what the editor falls back to on a phone. The notes, when there
 * are some, sit beside the map on a wide screen and under it on a narrow one - read-only here, since
 * they are edited next to the drawing tools.
 * @param stages - Every stage of the tactic, in order
 * @param notes - The tactic's notes, null when it has none
 * @returns The viewer
 */
export function TacticViewer({ stages, notes }: TacticViewerProps) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [onionSkin, setOnionSkin] = useState(false);
  const notesHeadingId = useId();
  const { ref, width } = useStageSize();
  const stageZoom = useStageZoom(width);

  const stage =
    stages.find((candidate) => candidate.id === activeStageId) ?? stages[0];

  const { frame, animating } = useStageTransition(stages, stage?.id ?? null, {
    onionSkin,
  });
  const playback = useStagePlayback(
    stages,
    stage?.id ?? null,
    animating,
    setActiveStageId
  );

  /**
   * Open a stage because the person asked for it, which ends any playback that was running.
   * @param stageId - Id of the stage to open
   */
  function selectStage(stageId: string): void {
    playback.stop();
    setActiveStageId(stageId);
  }

  // The arrows walk from the stage on screen, which is the first one until a tab is picked.
  const tablistRef = useStageArrows(stages, stage?.id ?? null, selectStage);

  if (!stage || !frame) {
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
              onClick={() => selectStage(candidate.id)}
            >
              {candidate.name}
            </Button>
          ))}

          <StageArrowHint stageCount={stages.length} />

          <StagePlaybackControls
            playing={playback.playing}
            onionSkin={onionSkin}
            disabled={false}
            onTogglePlay={playback.toggle}
            onToggleOnionSkin={() => setOnionSkin((on) => !on)}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div
          ref={ref}
          style={CANVAS_GRID_STYLE}
          className={cn(
            "relative min-w-0 flex-1 overflow-hidden rounded-xl border bg-muted/30",
            // Konva writes the hover cursor inline on its own container, so the drag cursor has to
            // be marked important to be seen at all while panning.
            stageZoom.panning &&
              "cursor-grabbing [&_.konvajs-content]:cursor-grabbing!"
          )}
        >
          <TacticCanvas
            frame={frame}
            animating={animating}
            width={width}
            zoom={stageZoom.zoom}
            pickable={false}
            onWheel={stageZoom.onWheel}
            onStageMouseDown={stageZoom.onPanStart}
          />
          <ZoomReadout
            zoom={stageZoom.zoom.zoom}
            onStep={stageZoom.step}
            onReset={stageZoom.reset}
          />
        </div>

        {notes === null ? null : (
          <section
            aria-labelledby={notesHeadingId}
            className="flex flex-col gap-2 rounded-xl border bg-card p-3 lg:w-72 lg:shrink-0"
          >
            <h2
              id={notesHeadingId}
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Ghi chú chiến thuật
            </h2>
            <TacticNotesText notes={notes} />
          </section>
        )}
      </div>
    </div>
  );
}
