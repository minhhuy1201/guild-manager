"use client";

import { useEffect, useRef } from "react";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import type { GuildClass } from "@guild/shared/enums";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { bobOffset, legClock, legFrame, speedAt } from "../lib/cat-motion";
import { catLabels } from "../lib/cat-label";
import { INITIAL_CUE_CURSOR, nextCues, type FinishCue, type RaceCue } from "../lib/race-cue";
import { paintCrown, paintDust, paintSpeedLines } from "../lib/paint-cat-effects";
import { paintChatBubble } from "../lib/paint-chat-bubbles";
import { paintStageBand, type BandScene } from "../lib/paint-stage-band";
import { nameFontPx, nameRoom, paintStageNames } from "../lib/paint-stage-names";
import { paintStageTrack } from "../lib/paint-stage-track";
import { frameAt, planRace, type RacePlan } from "../lib/race-frame";
import { standingsAt, type RaceStanding } from "../lib/race-board";
import { lengthsBehind } from "../lib/race-lengths";
import { visibleLanes, type LaneLayout, type LaneRange } from "../lib/race-layout";
import type { RaceScript } from "../lib/race-script";
import { leaderAt, rankAt } from "../lib/race-script";
import { INITIAL_CHATTER, stepChatter, type ChatterState } from "../lib/race-chatter";
import { spawnDust, stepDust, type DustParticle } from "../lib/race-dust";
import { catSprite } from "../lib/race-sprites";
import { FALLBACK_SPRITE_CLASS, SPRITE_COLUMNS, SPRITE_ROWS } from "../lib/sprite-rows";
import { RACE_END_U, momentAt } from "../lib/race-timeline";
import { buildCrowd } from "../lib/stage-crowd";
import { renderBackdrop } from "../lib/stage-backdrop";
import { excitementAt, isRacing, type StagePhase } from "../lib/stage-excitement";
import { stageFont } from "../lib/stage-font";
import { STAGE_PALETTE } from "../lib/stage-palette";
import { GATE_TEXT, TITLE_TEXT, bodyFont, displayFont, type StageFonts } from "../lib/stage-text";

/** Live board refresh interval; a faster board only flickers. */
const STANDINGS_INTERVAL_MS = 300;
/** Longest step the dust moves in one frame, so a stalled tab does not fling it. */
const MAX_DT_SECONDS = 0.05;
const LABEL_ELLIPSIS = "…";
const NAME_WEIGHT = 600;
const FONT_PROBE_PX = 16;
const FPS_FONT = "12px monospace";
const FPS_X = 8;
const FPS_BOTTOM_GAP = 8;
const MS_PER_SECOND = 1000;
/** A meow bubble's tail lands on the cat's head: this share of the sprite across, and down from its top. */
const CAT_BUBBLE_X_SHARE = 0.75;
const CAT_BUBBLE_Y_SHARE = 0.2;

/**
 * What the canvas shows: the round being replayed, the cats waiting on the start line, or the
 * finished race standing still behind the winner card.
 */
export type CanvasMode = "replay" | "start" | "finish";

interface RaceCanvasProps {
  script: RaceScript;
  participants: readonly CatRaceParticipant[];
  /** Called once when the race ran to its end or `skipSignal` changed */
  onFinish: () => void;
  /** Bumped by the parent to cut the race short */
  skipSignal: number;
  /** Every cat with its gap to the leader, leader first, at most every `STANDINGS_INTERVAL_MS` and once more at the end */
  onStandings: (rows: readonly RaceStanding[]) => void;
  /** Called for each moment of the round, once and in order; a skip sends none */
  onCue: (cue: RaceCue) => void;
  /** Anything but `replay` paints a still race on a live stage: no countdown, no callbacks */
  mode?: CanvasMode;
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
 * @param props.mode - Replay, or animate the stage around a still race (static under reduced motion)
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
  mode = "replay",
  laneOrder: shuffledOrder = null,
}: RaceCanvasProps) {
  const isPreview = mode !== "replay";
  // Only a preview reads it: a replay must not restart when the setting flips mid-race.
  const isStill = useReducedMotion() && isPreview;
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  const standingsRef = useRef(onStandings);
  const cueRef = useRef(onCue);
  const skipRef = useRef(skipSignal);
  const doneRef = useRef(false);
  // The gaps are in cat bodies of the current canvas width, which only the canvas effect knows.
  const layoutRef = useRef<LaneLayout | null>(null);

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
    standingsRef.current(standingsAt(script, RACE_END_U, layoutRef.current));
    finishRef.current();
  }, [skipSignal, script]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const spacer = spacerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!scroller || !spacer || !canvas || !context) return;

    const labels = catLabels(script.cats, participants);
    const classOf = new Map<string, GuildClass>(
      script.cats.map((cat) => {
        const owner = participants.find((p) => p.characterId === cat.characterId);

        return [cat.key, owner?.guildClass ?? FALLBACK_SPRITE_CLASS];
      })
    );
    const colorOf = new Map(
      [...classOf].map(([key, guildClass]) => [key, GUILD_CLASS_COLOR[guildClass]])
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
    let lastTime = 0;
    let dust: readonly DustParticle[] = [];
    let chatter: ChatterState = INITIAL_CHATTER;
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
      layoutRef.current = layout;
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
     * Paint every cat that is in view, with its crown, speed lines and the dust it kicks up.
     * @param current - The plan being painted
     * @param motion - Race time, whether the cats run, the leader's key and seconds since the last frame
     * @param lanes - The lanes in view
     * @param top - How far the lanes are scrolled, in px
     * @returns The dust the cats kicked up this frame
     */
    const drawCats = (
      current: RacePlan,
      motion: { u: number; isRunning: boolean; leaderKey: string | null; dt: number },
      lanes: LaneRange,
      top: number
    ): DustParticle[] => {
      const { layout, script: raced } = current;
      const height = (layout.catWidth * SPRITE_ROWS) / SPRITE_COLUMNS;
      const clock = legClock(motion.u, raced.durationSeconds);
      const cats = frameAt(current, motion.u);
      const kicked: DustParticle[] = [];
      for (let lane = lanes.first; lane <= lanes.last; lane += 1) {
        const cat = cats[lane];
        const frame = legFrame(clock, lane, motion.isRunning);
        const bob = bobOffset(frame, layout.catHeight, motion.isRunning);
        const box = { x: cat.x, y: cat.y, width: layout.catWidth, height };
        if (motion.isRunning) {
          paintSpeedLines(context, { ...box, y: cat.y - top }, speedAt(raced.curves.get(cat.key)!, motion.u), clock);
          const puff = spawnDust(
            { ...box, catHeight: layout.catHeight },
            { alive: dust.length + kicked.length, dt: motion.dt, catCount: raced.cats.length },
            Math.random
          );
          if (puff) kicked.push(puff);
        }
        const spriteTop = cat.y - top - height / 2 + bob;
        context.drawImage(catSprite(classOf.get(cat.key)!, layout.catWidth, frame), cat.x, spriteTop, layout.catWidth, height);
        if (cat.key === motion.leaderKey) {
          paintCrown(context, { x: cat.x, top: spriteTop, width: layout.catWidth, catHeight: layout.catHeight });
        }
      }

      return kicked;
    };

    /**
     * Paint the meow bubbles of the cats in view, above and right of each head.
     * @param current - The plan being painted
     * @param view - Race time, the animation clock, how far the lanes are scrolled and the lanes in view
     */
    const paintCatBubbles = (
      current: RacePlan,
      view: { u: number; time: number; top: number; lanes: LaneRange }
    ) => {
      const meows = chatter.bubbles.filter((bubble) => bubble.anchor.kind === "cat");
      if (meows.length === 0) return;
      const { layout } = current;
      const spriteHeight = (layout.catWidth * SPRITE_ROWS) / SPRITE_COLUMNS;
      const cats = frameAt(current, view.u);
      for (const bubble of meows) {
        if (bubble.anchor.kind !== "cat") continue;
        const lane = current.laneOf.get(bubble.anchor.catKey)!;
        if (lane < view.lanes.first || lane > view.lanes.last) continue;
        const cat = cats[lane];
        const tail = {
          x: cat.x + layout.catWidth * CAT_BUBBLE_X_SHARE,
          y: cat.y - view.top - spriteHeight / 2 + spriteHeight * CAT_BUBBLE_Y_SHARE,
        };
        paintChatBubble(context, bubble, tail, { time: view.time, fonts, width: viewWidth });
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
      frame: { phase: StagePhase; isSprint: boolean; u: number; time: number; dt: number; cues: readonly RaceCue[] },
      ranks: readonly string[] | null
    ) => {
      if (!scene) return;
      const { layout } = current;
      const top = scroller.scrollTop;
      const lanes = visibleLanes(layout, current.laneOrder.length, top, viewHeight);
      const view = { layout, width: viewWidth, height: viewHeight, top, lanes };
      const leaderKey = ranks?.[0] ?? null;
      const excitement = excitementAt(frame.phase, frame.isSprint);
      // A preview stands still: no one talks until a round is replayed.
      if (!isPreview) {
        chatter = stepChatter(
          chatter,
          {
            time: frame.time,
            dt: frame.dt,
            cues: frame.cues,
            excitement,
            width: viewWidth,
            crowdLeft: layout.nameColumn,
            labels,
            cats: { visible: current.laneOrder.slice(lanes.first, lanes.last + 1), ranks },
          },
          Math.random
        );
      }
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
      dust = stepDust(dust, frame.dt);
      paintDust(context, dust, top);
      const kicked = drawCats(
        current,
        { u: frame.u, isRunning: frame.phase === "running", leaderKey, dt: frame.dt },
        lanes,
        top
      );
      dust = [...dust, ...kicked];
      paintCatBubbles(current, { u: frame.u, time: frame.time, top, lanes });
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
      paintStageBand(context, scene, frame.time, excitement, chatter.bubbles);
    };

    /**
     * One animation frame.
     * @param now - Timestamp from requestAnimationFrame
     */
    const tick = (now: number) => {
      if (!plan || doneRef.current) return;
      const time = now / MS_PER_SECOND;
      const dt = Math.min(MAX_DT_SECONDS, Math.max(0, time - lastTime));
      lastTime = time;
      if (isPreview) {
        const isFinishLine = mode === "finish";
        paintStage(
          plan,
          { phase: isFinishLine ? "done" : "idle", isSprint: false, u: isFinishLine ? RACE_END_U : 0, time, dt, cues: [] },
          isFinishLine ? rankAt(script, RACE_END_U) : null
        );
        if (!isStill) frameId = requestAnimationFrame(tick);

        return;
      }
      if (startedAt === 0) startedAt = now;
      const elapsed = (now - startedAt) / MS_PER_SECOND;
      const moment = momentAt(elapsed, script.durationSeconds);
      const ranks = isRacing(moment.phase) ? rankAt(script, moment.u) : null;
      const finish: FinishCue = {
        kind: "finish",
        lengthsBehind: lengthsBehind(script.runnerUpGap, plan.layout),
      };
      const announced = nextCues(cursor, moment, leaderAt(script, moment.u), finish);
      cursor = announced.cursor;
      paintStage(
        plan,
        { phase: moment.phase, isSprint: moment.isSprint, u: moment.u, time, dt, cues: announced.cues },
        ranks
      );
      if (ranks && now - lastStandings >= STANDINGS_INTERVAL_MS) {
        lastStandings = now;
        standingsRef.current(standingsAt(script, moment.u, plan.layout));
      }
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
        standingsRef.current(standingsAt(script, RACE_END_U, plan.layout));
        finishRef.current();

        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    /** A still preview repaints on demand; an animated preview and a replay repaint every frame. */
    const repaint = () => {
      if (!isPreview || isDisposed) return;
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(tick);
    };

    resize();
    // The first paint may land before the lettering has downloaded; paint again when it has.
    document.fonts
      ?.load(displayFont(FONT_PROBE_PX, fonts), `${GATE_TEXT} ${TITLE_TEXT}`)
      .then(repaint)
      .catch(() => {
        // The lettering failed to download: the fallback face already painted, nothing to redo.
      });
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
  }, [script, participants, mode, isPreview, shuffledOrder, isStill]);

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
