"use client";

import { useEffect, useRef } from "react";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { catLabels } from "../lib/cat-label";
import { INITIAL_CUE_CURSOR, nextCues, type FinishCue, type RaceCue } from "../lib/race-cue";
import { paintStageBand, type BandScene } from "../lib/paint-stage-band";
import { nameFontPx, nameRoom, paintStageNames } from "../lib/paint-stage-names";
import { paintStageTrack } from "../lib/paint-stage-track";
import { frameAt, planRace, type RacePlan } from "../lib/race-frame";
import { lengthsBehind } from "../lib/race-lengths";
import { visibleLanes, type LaneRange } from "../lib/race-layout";
import type { RaceScript } from "../lib/race-script";
import { leaderAt, rankAt } from "../lib/race-script";
import { SPRITE_COLUMNS, SPRITE_ROWS, catSprite } from "../lib/race-sprites";
import { RACE_END_U, isPhotoFinish, momentAt } from "../lib/race-timeline";
import { buildCrowd } from "../lib/stage-crowd";
import { renderBackdrop } from "../lib/stage-backdrop";
import { excitementAt, isRacing, type StagePhase } from "../lib/stage-excitement";
import { stageFont } from "../lib/stage-font";
import { STAGE_PALETTE } from "../lib/stage-palette";
import { GATE_TEXT, TITLE_TEXT, bodyFont, displayFont, type StageFonts } from "../lib/stage-text";

/** Live board refresh interval; a faster board only flickers. */
const STANDINGS_INTERVAL_MS = 250;
/** Running frames per second. */
const STEP_RATE = 8;
const LABEL_ELLIPSIS = "…";
const FALLBACK_CAT_COLOR = "#999999";
const NAME_WEIGHT = 600;
const FONT_PROBE_PX = 16;
const FPS_FONT = "12px monospace";
const FPS_X = 8;
const FPS_BOTTOM_GAP = 8;
const MS_PER_SECOND = 1000;

interface RaceCanvasProps {
  script: RaceScript;
  participants: readonly CatRaceParticipant[];
  /** Called once when the race ran to its end or `skipSignal` changed */
  onFinish: () => void;
  /** Bumped by the parent to cut the race short */
  skipSignal: number;
  /** Every cat key, leader first, at most every `STANDINGS_INTERVAL_MS` and once more at the end */
  onStandings: (keys: string[]) => void;
  /** Called for each moment of the round, once and in order; a skip sends none */
  onCue: (cue: RaceCue) => void;
  /** Paint the cats on the start line and stop: no countdown, no replay, no callbacks */
  isPreview?: boolean;
  /** Cat keys from the top lane down, when the lanes were shuffled; null keeps them A to Z */
  laneOrder?: readonly string[] | null;
}

/**
 * Cut a label with an ellipsis so it fits.
 * @param context - Canvas context, with the label font set
 * @param text - The label
 * @param maxWidth - Room in px
 * @returns The label, shortened when needed
 */
function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && context.measureText(text.slice(0, end) + LABEL_ELLIPSIS).width > maxWidth) {
    end -= 1;
  }

  return text.slice(0, end) + LABEL_ELLIPSIS;
}

/**
 * The canvas that replays one race: one lane per cat, all on the same start line, every name in
 * its lane. It paints a plan from `race-frame`; the winner was fixed by the server before this
 * ever mounted. The canvas is only as tall as the viewport and repaints the lanes in view, so
 * 240 lanes scroll without a huge bitmap.
 * @param props.script - The race to replay
 * @param props.participants - Who is racing, for names and colours
 * @param props.onFinish - Called once at the end or on skip
 * @param props.skipSignal - Change it to skip to the end
 * @param props.onStandings - Receives the live order of every cat
 * @param props.onCue - Receives the countdown, lead changes, sprint, slow motion and the finish
 * @param props.isPreview - Paint the start line once instead of replaying
 * @param props.laneOrder - Shuffled lane order, or null for A to Z
 * @returns The scrolling track
 */
export function RaceCanvas({
  script,
  participants,
  onFinish,
  skipSignal,
  onStandings,
  onCue,
  isPreview = false,
  laneOrder: shuffledOrder = null,
}: RaceCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  const standingsRef = useRef(onStandings);
  const cueRef = useRef(onCue);
  const skipRef = useRef(skipSignal);
  const doneRef = useRef(false);

  useEffect(() => {
    finishRef.current = onFinish;
    standingsRef.current = onStandings;
    cueRef.current = onCue;
  });

  useEffect(() => {
    if (skipRef.current === skipSignal) return;
    skipRef.current = skipSignal;
    if (doneRef.current) return;
    doneRef.current = true;
    standingsRef.current(rankAt(script, RACE_END_U));
    finishRef.current();
  }, [skipSignal, script]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const spacer = spacerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!scroller || !spacer || !canvas || !context) return;

    const labels = catLabels(script.cats, participants);
    const colorOf = new Map(
      script.cats.map((cat) => {
        const owner = participants.find((p) => p.characterId === cat.characterId);

        return [cat.key, owner ? GUILD_CLASS_COLOR[owner.guildClass] : FALLBACK_CAT_COLOR];
      })
    );
    const peopleCount = new Set(script.cats.map((cat) => cat.characterId)).size;
    const showFps = new URLSearchParams(window.location.search).has("fps");
    let plan: RacePlan | null = null;
    let scene: BandScene | null = null;
    let fonts: StageFonts = { body: "", display: "" };
    let fitted = new Map<string, string>();
    let viewWidth = 0;
    let viewHeight = 0;
    let frameId = 0;
    let startedAt = 0;
    let lastStandings = 0;
    let cursor = INITIAL_CUE_CURSOR;
    let frames = 0;
    let isDisposed = false;
    doneRef.current = false;

    /** Fit the bitmap to the viewport; rebuild the plan, the sky and the crowd for its width. */
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = scroller.clientWidth;
      viewWidth = width;
      viewHeight = scroller.clientHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${viewHeight}px`;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(viewHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const nextPlan = planRace(script, { width, height: viewHeight }, labels, shuffledOrder);
      const { layout } = nextPlan;
      plan = nextPlan;
      spacer.style.height = `${Math.max(layout.contentHeight, viewHeight)}px`;
      fonts = { body: getComputedStyle(document.body).fontFamily, display: stageFont.style.fontFamily };
      context.font = bodyFont(nameFontPx(layout.laneHeight), NAME_WEIGHT, fonts);
      const room = nameRoom(layout.nameColumn);
      fitted = new Map(
        nextPlan.laneOrder.map((key) => [key, fitText(context, labels.get(key)!, room)])
      );
      scene = {
        layout,
        width,
        backdrop: renderBackdrop(width, layout, ratio),
        crowd: buildCrowd(width, layout, Math.random),
        fonts,
        cats: script.cats.length,
        people: peopleCount,
      };
    };

    /**
     * Paint every cat that is in view.
     * @param current - The plan being painted
     * @param u - Race time, 0..1
     * @param lanes - The lanes in view
     * @param top - How far the lanes are scrolled, in px
     */
    const drawCats = (current: RacePlan, u: number, lanes: LaneRange, top: number) => {
      const { layout } = current;
      const height = (layout.catWidth * SPRITE_ROWS) / SPRITE_COLUMNS;
      const legTick = Math.floor(u * current.script.durationSeconds * STEP_RATE);
      const cats = frameAt(current, u);
      for (let lane = lanes.first; lane <= lanes.last; lane += 1) {
        const cat = cats[lane];
        // The legs follow race time, so they stop with the cats when the winner crosses.
        const step = (legTick + cat.key.length) % 2 === 0 ? 0 : 1;
        const sprite = catSprite(colorOf.get(cat.key)!, layout.catWidth, step);
        context.drawImage(sprite, cat.x, cat.y - top - height / 2, layout.catWidth, height);
      }
    };

    /**
     * Paint one frame of the stage: dirt and cats clipped under the sky, the name column, then the
     * sky band over the top.
     * @param current - The plan being painted
     * @param frame - Where the stage is and when
     * @param ranks - Cat keys front to back while racing, else null
     */
    const paintStage = (
      current: RacePlan,
      frame: { phase: StagePhase; isSprint: boolean; u: number; time: number },
      ranks: readonly string[] | null
    ) => {
      if (!scene) return;
      const { layout } = current;
      const top = scroller.scrollTop;
      const lanes = visibleLanes(layout, current.laneOrder.length, top, viewHeight);
      const view = { layout, width: viewWidth, height: viewHeight, top, lanes };
      const leaderKey = ranks?.[0] ?? null;
      context.fillStyle = STAGE_PALETTE.wood;
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.save();
      context.beginPath();
      context.rect(0, layout.band, viewWidth, viewHeight - layout.band);
      context.clip();
      paintStageTrack(context, {
        ...view,
        leaderLane: leaderKey === null ? null : current.laneOf.get(leaderKey)!,
      });
      drawCats(current, frame.u, lanes, top);
      paintStageNames(context, {
        ...view,
        laneOrder: current.laneOrder,
        fitted,
        colors: colorOf,
        places: ranks && new Map(ranks.map((key, index) => [key, index + 1])),
        leaderKey,
        fonts,
      });
      context.restore();
      paintStageBand(context, scene, frame.time, excitementAt(frame.phase, frame.isSprint));
    };

    /**
     * One animation frame.
     * @param now - Timestamp from requestAnimationFrame
     */
    const tick = (now: number) => {
      if (!plan || doneRef.current) return;
      const time = now / MS_PER_SECOND;
      if (isPreview) {
        paintStage(plan, { phase: "idle", isSprint: false, u: 0, time }, null);

        return;
      }
      if (startedAt === 0) startedAt = now;
      const elapsed = (now - startedAt) / MS_PER_SECOND;
      const moment = momentAt(elapsed, script.durationSeconds, script.runnerUpGap);
      const ranks = isRacing(moment.phase) ? rankAt(script, moment.u) : null;
      paintStage(plan, { phase: moment.phase, isSprint: moment.isSprint, u: moment.u, time }, ranks);
      if (ranks && now - lastStandings >= STANDINGS_INTERVAL_MS) {
        lastStandings = now;
        standingsRef.current(ranks);
      }
      const finish: FinishCue = {
        kind: "finish",
        isPhotoFinish: isPhotoFinish(script.runnerUpGap),
        lengthsBehind: lengthsBehind(script.runnerUpGap, plan.layout),
      };
      const announced = nextCues(cursor, moment, leaderAt(script, moment.u), finish);
      cursor = announced.cursor;
      for (const cue of announced.cues) cueRef.current(cue);
      frames += 1;
      if (showFps) {
        context.fillStyle = STAGE_PALETTE.paperDim;
        context.font = FPS_FONT;
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
        const fps = Math.round((frames * MS_PER_SECOND) / Math.max(1, now - startedAt));
        context.fillText(`${fps} fps`, FPS_X, viewHeight - FPS_BOTTOM_GAP);
      }
      if (moment.phase === "done") {
        doneRef.current = true;
        if (showFps) console.info(`[cat-race] ${script.cats.length} cats, ${(frames * MS_PER_SECOND / (now - startedAt)).toFixed(1)} fps avg`);
        standingsRef.current(rankAt(script, RACE_END_U));
        finishRef.current();

        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    /** A preview repaints on demand; a replay already repaints every frame. */
    const repaint = () => {
      if (!isPreview || isDisposed) return;
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(tick);
    };

    resize();
    // The first paint may land before the lettering has downloaded; paint again when it has.
    void document.fonts?.load(displayFont(FONT_PROBE_PX, fonts), `${GATE_TEXT} ${TITLE_TEXT}`).then(repaint);
    const observer = new ResizeObserver(() => {
      resize();
      repaint();
    });
    observer.observe(scroller);
    scroller.addEventListener("scroll", repaint, { passive: true });
    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      scroller.removeEventListener("scroll", repaint);
      observer.disconnect();
    };
  }, [script, participants, isPreview, shuffledOrder]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto rounded-lg border border-(--stage-line)"
    >
      <div ref={spacerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="sticky top-0 block"
          role="img"
          aria-label="Đường đua mèo"
        />
      </div>
    </div>
  );
}
