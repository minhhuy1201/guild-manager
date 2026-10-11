"use client";

import { useEffect, useRef } from "react";
import type { CatRaceParticipant } from "@guild/shared/schemas";

import { discordAvatarUrl } from "@/features/auth";
import { GUILD_CLASS_COLOR } from "@/lib/guild-class";
import {
  frameAt,
  leadersAt,
  planRace,
  trackLines,
  type FrameCat,
  type RacePlan,
} from "../lib/race-frame";
import { toPoint, type RaceOrientation } from "../lib/race-layout";
import type { RaceScript } from "../lib/race-script";
import { SPRITE_COLUMNS, SPRITE_ROWS, catSprite } from "../lib/race-sprites";

/** Countdown before the cats leave, in seconds. */
const COUNTDOWN_SECONDS = 1.5;
/** Live board refresh interval; a faster board only flickers. */
const LEADERS_INTERVAL_MS = 150;
/** Below this viewport width the track runs top to bottom. */
const VERTICAL_MAX_WIDTH = "(max-width: 640px)";
/** Running frames per second. */
const STEP_RATE = 8;
const AVATAR_SIZE_RATIO = 0.9;

interface RaceCanvasProps {
  script: RaceScript;
  participants: readonly CatRaceParticipant[];
  /** Called once when the race ran to its end or `skipSignal` changed */
  onFinish: () => void;
  /** Bumped by the parent to cut the race short */
  skipSignal: number;
  /** Top keys, leader first, at most every `LEADERS_INTERVAL_MS` */
  onLeaders: (keys: string[]) => void;
}

/** Theme colours the canvas paints with, read from the CSS tokens. */
interface Palette {
  card: string;
  border: string;
  foreground: string;
  primary: string;
}

/**
 * Read the colours from the tokens, so the canvas follows the theme.
 * @returns The palette for the current theme
 */
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();

  return {
    card: token("--card"),
    border: token("--border"),
    foreground: token("--foreground"),
    primary: token("--primary"),
  };
}

/**
 * Display text of a cat: the person's name, with `#n` when they run several cats.
 * @param key - Cat key `<characterId>#<ticketNo>`
 * @param script - The race
 * @param byId - Participants by character id
 * @returns The label
 */
function labelOf(
  key: string,
  script: RaceScript,
  byId: ReadonlyMap<string, CatRaceParticipant>
): string {
  const cat = script.cats.find((candidate) => candidate.key === key)!;
  const name = byId.get(cat.characterId)?.name ?? "?";
  const siblings = script.cats.filter((c) => c.characterId === cat.characterId);

  return siblings.length > 1 ? `${name} #${cat.ticketNo}` : name;
}

/**
 * The canvas that replays one race: the whole field, the cut, the sprint. It paints a plan from
 * `race-frame`; the winner was fixed by the server before this ever mounted.
 * @param props.script - The race to replay
 * @param props.participants - Who is racing, for names, colours and avatars
 * @param props.onFinish - Called once at the end or on skip
 * @param props.skipSignal - Change it to skip to the end
 * @param props.onLeaders - Receives the live top keys
 * @returns The canvas element
 */
export function RaceCanvas({
  script,
  participants,
  onFinish,
  skipSignal,
  onLeaders,
}: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  const leadersRef = useRef(onLeaders);
  const skipRef = useRef(skipSignal);
  const doneRef = useRef(false);

  useEffect(() => {
    finishRef.current = onFinish;
    leadersRef.current = onLeaders;
  });

  useEffect(() => {
    if (skipRef.current === skipSignal) return;
    skipRef.current = skipSignal;
    if (doneRef.current) return;
    doneRef.current = true;
    finishRef.current();
  }, [skipSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const byId = new Map(participants.map((p) => [p.characterId, p]));
    const ownerOf = new Map(script.cats.map((c) => [c.key, c.characterId]));
    const avatars = new Map<string, HTMLImageElement>();
    const showFps = new URLSearchParams(window.location.search).has("fps");
    const vertical = window.matchMedia(VERTICAL_MAX_WIDTH);
    let palette = readPalette();
    let plan: RacePlan | null = null;
    let orientation: RaceOrientation = "horizontal";
    let frameId = 0;
    let startedAt = 0;
    let lastLeaders = 0;
    let frames = 0;
    doneRef.current = false;

    /** Fit the backing store to the element and rebuild the plan for its size. */
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      orientation = vertical.matches ? "vertical" : "horizontal";
      plan = planRace(script, { width, height }, orientation);
    };

    /**
     * Avatar image of a participant, requested on first use.
     * @param participant - The racer
     * @returns The image once loaded, null before
     */
    const avatarOf = (participant: CatRaceParticipant) => {
      const url = discordAvatarUrl(participant.discordId ?? "", participant.discordAvatar);
      if (!participant.discordId || !url) return null;
      let image = avatars.get(url);
      if (!image) {
        image = new Image();
        image.src = url;
        avatars.set(url, image);
      }

      return image.complete && image.naturalWidth > 0 ? image : null;
    };

    /**
     * Paint one cat, with its name bubble when it carries one.
     * @param cat - The cat's frame data
     * @param seconds - Time since the start, for the running frames
     */
    const drawCat = (cat: FrameCat, seconds: number) => {
      const owner = byId.get(ownerOf.get(cat.key)!);
      const color = owner ? GUILD_CLASS_COLOR[owner.guildClass] : "#999999";
      const step = (Math.floor(seconds * STEP_RATE) + cat.key.length) % 2 === 0 ? 0 : 1;
      const sprite = catSprite(color, cat.size, step);
      const height = (cat.size * SPRITE_ROWS) / SPRITE_COLUMNS;
      context.globalAlpha = cat.alpha;
      context.drawImage(sprite, cat.point.x - cat.size / 2, cat.point.y - height / 2, cat.size, height);
      if (cat.labelled && owner) {
        const radius = (cat.size * AVATAR_SIZE_RATIO) / 2;
        const bubbleX = cat.point.x;
        const bubbleY = cat.point.y - height / 2 - radius - 2;
        const avatar = avatarOf(owner);
        context.save();
        context.beginPath();
        context.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2);
        context.clip();
        if (avatar) {
          context.drawImage(avatar, bubbleX - radius, bubbleY - radius, radius * 2, radius * 2);
        } else {
          context.fillStyle = color;
          context.fillRect(bubbleX - radius, bubbleY - radius, radius * 2, radius * 2);
          context.fillStyle = "#2a2433";
          context.font = `bold ${Math.max(9, radius)}px sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(owner.name.slice(0, 1).toUpperCase(), bubbleX, bubbleY);
        }
        context.restore();
        context.fillStyle = palette.foreground;
        context.font = "12px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillText(labelOf(cat.key, script, byId), cat.point.x, cat.point.y + height / 2 + 2);
      }
      context.globalAlpha = 1;
    };

    /**
     * Paint the track: background, start and finish lines.
     * @param current - The plan being painted
     */
    const drawTrack = (current: RacePlan) => {
      const { width, height } = current.area;
      context.fillStyle = palette.card;
      context.fillRect(0, 0, width, height);
      const { start, finish } = trackLines(current);
      context.strokeStyle = palette.border;
      context.lineWidth = 2;
      context.setLineDash([6, 6]);
      context.beginPath();
      const from = toPoint(start, 0, orientation);
      const to = toPoint(start, orientation === "horizontal" ? height : width, orientation);
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      context.setLineDash([]);
      context.strokeStyle = palette.primary;
      context.lineWidth = 4;
      context.beginPath();
      const end = toPoint(finish, 0, orientation);
      const endTo = toPoint(finish, orientation === "horizontal" ? height : width, orientation);
      context.moveTo(end.x, end.y);
      context.lineTo(endTo.x, endTo.y);
      context.stroke();
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
      drawTrack(plan);
      for (const cat of frameAt(plan, seconds)) drawCat(cat, seconds);
      if (elapsed < COUNTDOWN_SECONDS) {
        context.fillStyle = palette.foreground;
        context.font = "bold 64px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(Math.ceil(COUNTDOWN_SECONDS - elapsed) + 1), plan.area.width / 2, plan.area.height / 2);
      } else if (now - lastLeaders >= LEADERS_INTERVAL_MS) {
        lastLeaders = now;
        leadersRef.current(leadersAt(script, seconds));
      }
      frames += 1;
      if (showFps) {
        context.fillStyle = palette.foreground;
        context.font = "12px monospace";
        context.textAlign = "left";
        context.fillText(`${Math.round((frames * 1000) / Math.max(1, now - startedAt))} fps`, 8, 14);
      }
      if (seconds >= plan.endSeconds) {
        doneRef.current = true;
        if (showFps) console.info(`[cat-race] ${script.cats.length} cats, ${(frames * 1000 / (now - startedAt)).toFixed(1)} fps avg`);
        finishRef.current();

        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
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
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-lg"
      role="img"
      aria-label="Đường đua mèo"
    />
  );
}
