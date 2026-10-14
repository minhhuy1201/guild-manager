"use client";

import { useEffect, useRef } from "react";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import { catLabels } from "../lib/cat-label";
import { frameAt, planRace, type RacePlan } from "../lib/race-frame";
import type { RaceScript } from "../lib/race-script";
import { rankAt } from "../lib/race-script";
import { SPRITE_COLUMNS, SPRITE_ROWS, catSprite } from "../lib/race-sprites";

/** Countdown before the cats leave, in seconds. */
const COUNTDOWN_SECONDS = 1.5;
/** Digits shown during the countdown: 3, 2, 1. */
const COUNTDOWN_STEPS = 3;
/** Live board refresh interval; a faster board only flickers. */
const STANDINGS_INTERVAL_MS = 250;
/** Running frames per second. */
const STEP_RATE = 8;
/** Name text size in px, and the room kept left of it for the class colour mark. */
const NAME_FONT_PX = 14;
const NAME_PADDING = 8;
const CLASS_MARK_SIZE = 8;
/** How strong the alternate lanes tint, as a share of the text colour. */
const LANE_STRIPE_ALPHA = 0.06;
const START_LINE_WIDTH = 3;
const FINISH_SQUARE = 8;
const COUNTDOWN_FONT_PX = 64;
const COUNTDOWN_BOX = 120;
const LABEL_ELLIPSIS = "…";
const FALLBACK_CAT_COLOR = "#999999";

interface RaceCanvasProps {
  script: RaceScript;
  participants: readonly CatRaceParticipant[];
  /** Called once when the race ran to its end or `skipSignal` changed */
  onFinish: () => void;
  /** Bumped by the parent to cut the race short */
  skipSignal: number;
  /** Every cat key, leader first, at most every `STANDINGS_INTERVAL_MS` and once more at the end */
  onStandings: (keys: string[]) => void;
}

/** Theme colours the canvas paints with, read from the CSS tokens. */
interface Palette {
  background: string;
  card: string;
  foreground: string;
  mutedForeground: string;
}

/**
 * Read the colours from the tokens, so the canvas follows the theme.
 * @returns The palette for the current theme
 */
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();

  return {
    background: token("--background"),
    card: token("--card"),
    foreground: token("--foreground"),
    mutedForeground: token("--muted-foreground"),
  };
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
 * @returns The scrolling track
 */
export function RaceCanvas({
  script,
  participants,
  onFinish,
  skipSignal,
  onStandings,
}: RaceCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  const standingsRef = useRef(onStandings);
  const skipRef = useRef(skipSignal);
  const doneRef = useRef(false);

  useEffect(() => {
    finishRef.current = onFinish;
    standingsRef.current = onStandings;
  });

  useEffect(() => {
    if (skipRef.current === skipSignal) return;
    skipRef.current = skipSignal;
    if (doneRef.current) return;
    doneRef.current = true;
    standingsRef.current(rankAt(script, script.durationSeconds));
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
    const showFps = new URLSearchParams(window.location.search).has("fps");
    let palette = readPalette();
    let plan: RacePlan | null = null;
    let fitted = new Map<string, string>();
    let viewWidth = 0;
    let viewHeight = 0;
    let frameId = 0;
    let startedAt = 0;
    let lastStandings = 0;
    let frames = 0;
    doneRef.current = false;

    const nameFont = () => `600 ${NAME_FONT_PX}px ${getComputedStyle(document.body).fontFamily}`;

    /** Fit the bitmap to the viewport and rebuild the plan for its width. */
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
      plan = planRace(script, { width, height: viewHeight }, labels);
      spacer.style.height = `${Math.max(plan.layout.contentHeight, viewHeight)}px`;
      context.font = nameFont();
      const room = plan.layout.nameColumn - NAME_PADDING * 2 - CLASS_MARK_SIZE;
      fitted = new Map(
        plan.laneOrder.map((key) => [key, fitText(context, labels.get(key) ?? "", room)])
      );
    };

    /**
     * Paint the track: lanes, name column, start line and finish line.
     * @param current - The plan being painted
     * @param top - How far the lanes are scrolled, in px
     */
    const drawTrack = (current: RacePlan, top: number) => {
      const { layout, laneOrder } = current;
      const width = viewWidth;
      context.fillStyle = palette.background;
      context.fillRect(0, 0, width, viewHeight);
      const firstLane = Math.max(0, Math.floor(top / layout.laneHeight));
      const lastLane = Math.min(laneOrder.length - 1, Math.floor((top + viewHeight) / layout.laneHeight));
      context.fillStyle = palette.foreground;
      context.globalAlpha = LANE_STRIPE_ALPHA;
      for (let lane = firstLane; lane <= lastLane; lane += 1) {
        if (lane % 2 === 1) context.fillRect(0, lane * layout.laneHeight - top, width, layout.laneHeight);
      }
      context.globalAlpha = 1;
      context.fillStyle = palette.card;
      context.fillRect(0, 0, layout.nameColumn, viewHeight);
      context.font = nameFont();
      context.textAlign = "left";
      context.textBaseline = "middle";
      for (let lane = firstLane; lane <= lastLane; lane += 1) {
        const key = laneOrder[lane];
        const centre = (lane + 0.5) * layout.laneHeight - top;
        context.fillStyle = colorOf.get(key)!;
        context.fillRect(NAME_PADDING, centre - CLASS_MARK_SIZE / 2, CLASS_MARK_SIZE, CLASS_MARK_SIZE);
        context.fillStyle = palette.foreground;
        context.fillText(fitted.get(key) ?? "", NAME_PADDING * 2 + CLASS_MARK_SIZE, centre);
      }
      context.fillStyle = palette.foreground;
      context.fillRect(layout.startX - START_LINE_WIDTH / 2, 0, START_LINE_WIDTH, viewHeight);
      for (let y = 0; y < viewHeight; y += FINISH_SQUARE) {
        for (let column = 0; column < 2; column += 1) {
          const isDark = (Math.floor((y + top) / FINISH_SQUARE) + column) % 2 === 0;
          context.fillStyle = isDark ? palette.foreground : palette.card;
          context.fillRect(layout.finishX + column * FINISH_SQUARE, y, FINISH_SQUARE, FINISH_SQUARE);
        }
      }
    };

    /**
     * Paint every cat that is in view.
     * @param current - The plan being painted
     * @param seconds - Time since the start
     * @param top - How far the lanes are scrolled, in px
     */
    const drawCats = (current: RacePlan, seconds: number, top: number) => {
      const { layout } = current;
      const height = (layout.catWidth * SPRITE_ROWS) / SPRITE_COLUMNS;
      for (const cat of frameAt(current, seconds)) {
        const y = cat.y - top;
        if (y < -layout.laneHeight || y > viewHeight + layout.laneHeight) continue;
        const step = (Math.floor(seconds * STEP_RATE) + cat.key.length) % 2 === 0 ? 0 : 1;
        const sprite = catSprite(colorOf.get(cat.key)!, layout.catWidth, step);
        context.drawImage(sprite, cat.x, y - height / 2, layout.catWidth, height);
      }
    };

    /**
     * One animation frame.
     * @param now - Timestamp from requestAnimationFrame
     */
    const tick = (now: number) => {
      if (!plan || doneRef.current) return;
      if (startedAt === 0) startedAt = now;
      const elapsed = (now - startedAt) / 1000;
      const seconds = Math.max(0, elapsed - COUNTDOWN_SECONDS);
      const top = scroller.scrollTop;
      drawTrack(plan, top);
      drawCats(plan, seconds, top);
      if (elapsed < COUNTDOWN_SECONDS) {
        const width = viewWidth;
        context.fillStyle = palette.card;
        context.fillRect((width - COUNTDOWN_BOX) / 2, (viewHeight - COUNTDOWN_BOX) / 2, COUNTDOWN_BOX, COUNTDOWN_BOX);
        context.fillStyle = palette.foreground;
        context.font = `bold ${COUNTDOWN_FONT_PX}px ${getComputedStyle(document.body).fontFamily}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          String(Math.ceil(((COUNTDOWN_SECONDS - elapsed) * COUNTDOWN_STEPS) / COUNTDOWN_SECONDS)),
          width / 2,
          viewHeight / 2
        );
      } else if (now - lastStandings >= STANDINGS_INTERVAL_MS) {
        lastStandings = now;
        standingsRef.current(rankAt(script, seconds));
      }
      frames += 1;
      if (showFps) {
        context.fillStyle = palette.mutedForeground;
        context.font = "12px monospace";
        context.textAlign = "left";
        context.fillText(`${Math.round((frames * 1000) / Math.max(1, now - startedAt))} fps`, 8, 14);
      }
      if (seconds >= script.endSeconds) {
        doneRef.current = true;
        if (showFps) console.info(`[cat-race] ${script.cats.length} cats, ${(frames * 1000 / (now - startedAt)).toFixed(1)} fps avg`);
        standingsRef.current(rankAt(script, script.durationSeconds));
        finishRef.current();

        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scroller);
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      themeObserver.disconnect();
    };
  }, [script, participants]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto rounded-lg border border-border"
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
