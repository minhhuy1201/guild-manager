"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import type { TacticStage } from "@guild/shared/schemas";

import { FocusModeShell } from "@/components/shared/focus-mode-shell";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useFocusMode } from "@/hooks/use-focus-mode";
import { cn } from "@/lib/utils";
import { CANVAS_GRID_STYLE, FOCUS_CANVAS_STYLE } from "../lib/canvas-grid";
import { fitStageWidth } from "../lib/stage-scale";
import { useStageArrows } from "../hooks/use-stage-arrows";
import { useStagePlayback } from "../hooks/use-stage-playback";
import { useStageSize } from "../hooks/use-stage-size";
import { useStageTransition } from "../hooks/use-stage-transition";
import { useStageZoom } from "../hooks/use-stage-zoom";
import { FocusNotesColumn } from "./focus-notes-column";
import { StageArrowHint } from "./stage-arrow-hint";
import { StagePlaybackControls } from "./stage-playback-controls";
import { TacticCanvas } from "./tactic-canvas";
import { TacticNotesText } from "./tactic-notes-panel";
import { ZoomReadout } from "./zoom-readout";

interface TacticViewerProps {
  /** The tactic's name, shown on the focus mode's top bar */
  name: string;
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
 *
 * From `lg` up a button (or `F`) turns the viewer into a focus mode: a dialog over the window whose
 * top bar carries the name and the stage controls. The canvas stays mounted through the switch, so
 * the zoom, the open stage and a running playback survive it.
 * @param name - The tactic's name
 * @param stages - Every stage of the tactic, in order
 * @param notes - The tactic's notes, null when it has none
 * @returns The viewer
 */
export function TacticViewer({ name, stages, notes }: TacticViewerProps) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [onionSkin, setOnionSkin] = useState(false);
  const notesHeadingId = useId();
  const { ref, width } = useStageSize();
  const { ref: areaRef, width: areaWidth, height: areaHeight } = useStageSize();
  const stageZoom = useStageZoom(width);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusReturn = useMemo(
    () => ({ button: focusButtonRef, fallback: bodyRef }),
    []
  );
  const focus = useFocusMode(true, false, focusReturn);

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

  const mapWidth = focus.active
    ? fitStageWidth(areaWidth, areaHeight)
    : undefined;

  const tablist =
    stages.length > 1 ? (
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Giai đoạn"
        className={cn(
          "flex flex-wrap items-center gap-2",
          focus.active && "min-w-0 flex-1"
        )}
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
    ) : null;

  return (
    <FocusModeShell
      active={focus.active}
      label="Xem chiến thuật toàn màn hình"
      onExit={focus.exit}
      className="flex flex-col gap-3"
      bar={
        <>
          <h2 className="min-w-0 shrink truncate text-sm font-semibold">
            {name}
          </h2>
          {tablist}
        </>
      }
    >
      {/* Stays a sibling before the body in both states, so the canvas never changes position. */}
      {focus.active ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {tablist}
          <Button
            ref={focusButtonRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={focus.enter}
            className="ml-auto max-lg:hidden"
          >
            <Maximize2 />
            Toàn màn hình
            <Kbd aria-hidden>F</Kbd>
          </Button>
        </div>
      )}

      <div
        ref={bodyRef}
        // Focusable so it can take the focus back when the entry button is gone.
        tabIndex={-1}
        className={cn(
          "flex flex-col gap-3 outline-none lg:flex-row",
          focus.active
            ? "min-h-0 flex-1 flex-row gap-0"
            : "lg:items-start"
        )}
      >
        {/* `contents` outside the mode: the map stays a direct child of the row. */}
        <div
          ref={areaRef}
          style={focus.active ? FOCUS_CANVAS_STYLE : undefined}
          className={
            focus.active
              ? "flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-4"
              : "contents"
          }
        >
          <div
            ref={ref}
            style={{ ...CANVAS_GRID_STYLE, width: mapWidth }}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-inner bg-muted/30",
              focus.active ? "shrink-0 ring-1 ring-border" : "flex-1 border",
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
        </div>
        {notes === null ? null : focus.active ? (
          <FocusNotesColumn notes={notes} />
        ) : (
          <section
            aria-labelledby={notesHeadingId}
            className="flex flex-col gap-2 rounded-inner border bg-card p-3 lg:w-72 lg:shrink-0"
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
    </FocusModeShell>
  );
}
