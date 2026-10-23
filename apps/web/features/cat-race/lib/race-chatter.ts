import { assertNever } from "@guild/shared/lib";

import { COUNTDOWN_STEPS } from "./race-timeline";
import type { RaceCue } from "./race-cue";
import { NARROW_WIDTH } from "./race-layout";

/** How loud a bubble is painted: plain talk, a shout, or news about the leader. */
export type ChatTone = "plain" | "hype" | "lead";

/** Who a bubble hangs over: a spot in the stands, or a cat that moves along the track. */
export type ChatAnchor =
  | { readonly kind: "crowd"; readonly x: number }
  | { readonly kind: "cat"; readonly catKey: string };

/** One speech bubble. Times are seconds on the animation clock. */
export interface ChatBubble {
  readonly id: number;
  readonly anchor: ChatAnchor;
  readonly text: string;
  readonly tone: ChatTone;
  readonly bornAt: number;
  readonly life: number;
  /** Said because of a race cue; a cue bubble outranks a random one when the stands are full. */
  readonly isCue: boolean;
}

/** Every bubble alive. */
export interface ChatterState {
  readonly bubbles: readonly ChatBubble[];
  readonly nextId: number;
}

export const INITIAL_CHATTER: ChatterState = { bubbles: [], nextId: 1 };

/** What `stepChatter` needs to know about one frame. */
export interface ChatFrame {
  /** Seconds on the real animation clock; slow motion does not stretch a bubble's life */
  readonly time: number;
  /** Seconds since the last frame */
  readonly dt: number;
  /** The cues the track announced this frame */
  readonly cues: readonly RaceCue[];
  /** How excited the crowd is, see `excitementAt` */
  readonly excitement: number;
  /** Canvas width in px */
  readonly width: number;
  /** Left edge of the stands in px */
  readonly crowdLeft: number;
  /** Display text by cat key */
  readonly labels: ReadonlyMap<string, string>;
}

const CROWD_LIMIT = 3;
const CROWD_LIMIT_NARROW = 2;
const CROWD_LIFE_SECONDS = 1.8;
const CUE_LIFE_SECONDS = 2.2;
/** Random cheers per second at excitement 1; the crowd gets louder in step with the excitement. */
const CHEERS_PER_SECOND = 0.25;
const GO_SHOUTS = 2;
/** Keeps a bubble's tail over a spectator rather than the canvas edge. */
const CROWD_EDGE_INSET = 24;
const NAME_MAX_CHARS = 12;
const ELLIPSIS = "…";

const GO_TEXT = "Chạy điii!";
const SPRINT_TEXT = "NƯỚC RÚT!!";
const FINISH_TEXT = "Ảnh! Ảnh!";
const CROWD_CHEERS = ["Cố lên!", "Lẹ lên!", "Chạy đi mèo!", "Wow!", "Đỉnh quá!", "Nhanh nữa!", "Hú hú!"] as const;

/** A bubble before it gets an id and a birth time. */
type Draft = Pick<ChatBubble, "anchor" | "text" | "tone" | "life" | "isCue">;

/**
 * Cut a cat's label so a bubble stays small.
 * @param label - The label from `catLabels`
 * @returns The label, at most `NAME_MAX_CHARS` long plus an ellipsis
 */
function shortName(label: string): string {
  if (label.length <= NAME_MAX_CHARS) return label;

  return label.slice(0, NAME_MAX_CHARS).trimEnd() + ELLIPSIS;
}

/**
 * Where in the stands a bubble's tail lands.
 * @param frame - The frame
 * @param random - Source of randomness in [0, 1)
 * @returns A crowd anchor
 */
function crowdAnchor(frame: ChatFrame, random: () => number): ChatAnchor {
  const left = frame.crowdLeft + CROWD_EDGE_INSET;
  const right = Math.max(left, frame.width - CROWD_EDGE_INSET);

  return { kind: "crowd", x: left + random() * (right - left) };
}

/**
 * One crowd bubble said because of a cue.
 * @param frame - The frame
 * @param random - Source of randomness in [0, 1)
 * @param line - What is said and how loudly
 * @returns The draft
 */
function crowdCue(frame: ChatFrame, random: () => number, line: { text: string; tone: ChatTone }): Draft {
  return { anchor: crowdAnchor(frame, random), ...line, life: CUE_LIFE_SECONDS, isCue: true };
}

/**
 * What a cue makes the stands say.
 * @param cue - The cue
 * @param frame - The frame
 * @param random - Source of randomness in [0, 1)
 * @returns Bubbles to add, none for a cue the crowd ignores
 */
function draftsForCue(cue: RaceCue, frame: ChatFrame, random: () => number): Draft[] {
  switch (cue.kind) {
    case "countdown":
      return [crowdCue(frame, random, { text: String(COUNTDOWN_STEPS - cue.step), tone: "hype" })];
    case "go":
      return Array.from({ length: GO_SHOUTS }, () => crowdCue(frame, random, { text: GO_TEXT, tone: "hype" }));
    case "lead-change": {
      const name = shortName(frame.labels.get(cue.catKey) ?? "?");

      return [crowdCue(frame, random, { text: `${name} lên rồi!`, tone: "lead" })];
    }
    case "sprint":
      return [crowdCue(frame, random, { text: SPRINT_TEXT, tone: "hype" })];
    case "finish":
      return [crowdCue(frame, random, { text: FINISH_TEXT, tone: "hype" })];
    case "slow-motion":
      return [];
    default:
      return assertNever(cue);
  }
}

/**
 * Add a bubble, making room by dropping the oldest random cheer (or, when every bubble is a cue,
 * the oldest cue) once the stands are full.
 * @param state - The bubbles alive
 * @param draft - The bubble to add
 * @param limit - Most crowd bubbles at once
 * @param time - Birth time
 * @returns The new state
 */
function addCrowdBubble(state: ChatterState, draft: Draft, limit: number, time: number): ChatterState {
  const crowd = state.bubbles.filter((bubble) => bubble.anchor.kind === "crowd");
  const bubble: ChatBubble = { ...draft, id: state.nextId, bornAt: time };
  if (crowd.length < limit) return { bubbles: [...state.bubbles, bubble], nextId: state.nextId + 1 };

  const candidates = crowd.some((b) => !b.isCue) ? crowd.filter((b) => !b.isCue) : crowd;
  const oldest = candidates.reduce((a, b) => (b.bornAt < a.bornAt ? b : a));

  return {
    bubbles: [...state.bubbles.filter((b) => b.id !== oldest.id), bubble],
    nextId: state.nextId + 1,
  };
}

/**
 * Move the chatter on one frame: drop what has run out, say what the cues call for, then maybe
 * add a random cheer at a rate that grows with the excitement.
 * @param state - The bubbles alive
 * @param frame - This frame
 * @param random - Source of randomness in [0, 1)
 * @returns The new state; `state` is not changed
 */
export function stepChatter(state: ChatterState, frame: ChatFrame, random: () => number): ChatterState {
  const limit = frame.width < NARROW_WIDTH ? CROWD_LIMIT_NARROW : CROWD_LIMIT;
  const alive: ChatterState = {
    ...state,
    bubbles: state.bubbles.filter((bubble) => bubble.bornAt + bubble.life > frame.time),
  };
  const cued = frame.cues
    .flatMap((cue) => draftsForCue(cue, frame, random))
    .reduce((current, draft) => addCrowdBubble(current, draft, limit, frame.time), alive);
  const crowdCount = cued.bubbles.filter((bubble) => bubble.anchor.kind === "crowd").length;
  if (crowdCount >= limit) return cued;
  if (random() >= CHEERS_PER_SECOND * frame.excitement * frame.dt) return cued;

  const cheer: Draft = {
    anchor: crowdAnchor(frame, random),
    text: CROWD_CHEERS[Math.floor(random() * CROWD_CHEERS.length)],
    tone: "plain",
    life: CROWD_LIFE_SECONDS,
    isCue: false,
  };

  return addCrowdBubble(cued, cheer, limit, frame.time);
}
