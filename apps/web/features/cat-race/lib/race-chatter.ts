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
  readonly cats: {
    /** Keys of the cats whose lanes are in view */
    readonly visible: readonly string[];
    /** Every cat key front to back while racing, else null */
    readonly ranks: readonly string[] | null;
  };
}

const CROWD_LIMIT = 3;
const CROWD_LIMIT_NARROW = 2;
const CAT_LIMIT = 4;
const CAT_LIFE_SECONDS = 1.5;
/** Random meows per second at excitement 1. */
const MEOWS_PER_SECOND = 0.3;
const SPRINT_HOWLS_MIN = 2;
const SPRINT_HOWLS_EXTRA = 2;
/** The slowest share of the pack that sounds tired. */
const TAIL_SHARE = 0.2;
const CROWD_LIFE_SECONDS = 1.8;
const CUE_LIFE_SECONDS = 2.2;
/** Random cheers per second at excitement 1; the crowd gets louder in step with the excitement. */
const CHEERS_PER_SECOND = 0.25;
const GO_SHOUTS = 2;
/** Keeps a bubble's tail over a spectator rather than the canvas edge. */
const CROWD_EDGE_INSET = 24;
const NAME_MAX_CHARS = 12;
const ELLIPSIS = "…";
/** The ` #n` `catLabels` puts after the name of an owner who runs several cats. */
const TICKET_SUFFIX = /( #\d+)$/;

const GO_TEXT = "Chạy điii!";
const SPRINT_TEXT = "NƯỚC RÚT!!";
const FINISH_TEXT = "Ảnh! Ảnh!";
const LEAD_MEOW_TEXT = "MEOW!!";
const SPRINT_MEOW_TEXT = "MEEEOW!!";
const CAT_MEOWS = ["meow", "meo meo", "meoww", "mèo mèo", "meow meow"] as const;
const TIRED_MEOWS = ["meo…", "hộc hộc"] as const;
const CROWD_CHEERS = ["Cố lên!", "Lẹ lên!", "Chạy đi mèo!", "Wow!", "Đỉnh quá!", "Nhanh nữa!", "Hú hú!"] as const;

/** Most bubbles alive at once, by what they hang over. */
type Limits = Record<ChatAnchor["kind"], number>;

/** A bubble before it gets an id and a birth time. */
type Draft = Pick<ChatBubble, "anchor" | "text" | "tone" | "life" | "isCue">;

/**
 * Cut a cat's label so a bubble stays small. The `#n` that `catLabels` adds for an owner of several
 * cats survives the cut, or the crowd would call two cats by one name.
 * @param label - The label from `catLabels`
 * @returns The name part cut to `NAME_MAX_CHARS` characters plus an ellipsis, then the `#n`
 */
function shortName(label: string): string {
  const suffix = TICKET_SUFFIX.exec(label)?.[1] ?? "";
  // By code point, so a name with an emoji is never cut through the middle of one.
  const name = Array.from(label.slice(0, label.length - suffix.length));
  if (name.length <= NAME_MAX_CHARS) return label;

  return name.slice(0, NAME_MAX_CHARS).join("").trimEnd() + ELLIPSIS + suffix;
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
 * A meow over one cat.
 * @param catKey - The cat
 * @param line - What is said, how loudly, and whether a cue asked for it
 * @returns The draft
 */
function catDraft(catKey: string, line: Pick<Draft, "text" | "tone" | "isCue">): Draft {
  return { anchor: { kind: "cat", catKey }, ...line, life: CAT_LIFE_SECONDS };
}

/**
 * Pick distinct cats at random.
 * @param keys - The candidates
 * @param count - How many to pick, at most
 * @param random - Source of randomness in [0, 1)
 * @returns The picked keys
 */
function pickCats(keys: readonly string[], count: number, random: () => number): string[] {
  const pool = [...keys];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }

  return picked;
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
      const name = shortName(frame.labels.get(cue.catKey)!);

      return [
        crowdCue(frame, random, { text: `${name} lên rồi!`, tone: "lead" }),
        catDraft(cue.catKey, { text: LEAD_MEOW_TEXT, tone: "lead", isCue: true }),
      ];
    }
    case "sprint":
      return [
        crowdCue(frame, random, { text: SPRINT_TEXT, tone: "hype" }),
        ...pickCats(frame.cats.visible, SPRINT_HOWLS_MIN + Math.floor(random() * SPRINT_HOWLS_EXTRA), random).map(
          (catKey) => catDraft(catKey, { text: SPRINT_MEOW_TEXT, tone: "hype", isCue: true })
        ),
      ];
    case "finish":
      return [crowdCue(frame, random, { text: FINISH_TEXT, tone: "hype" })];
    case "slow-motion":
      return [];
    default:
      return assertNever(cue);
  }
}

/**
 * Add a bubble, making room by dropping the oldest random one (or, when every bubble of its kind
 * is a cue, the oldest cue) once that kind is full. A cat has one bubble: a new one replaces it.
 * @param state - The bubbles alive
 * @param draft - The bubble to add
 * @param limits - Most bubbles at once of each kind
 * @param time - Birth time
 * @returns The new state
 */
function addBubble(state: ChatterState, draft: Draft, limits: Limits, time: number): ChatterState {
  const bubble: ChatBubble = { ...draft, id: state.nextId, bornAt: time };
  const next = (kept: readonly ChatBubble[]): ChatterState => ({
    bubbles: [...kept, bubble],
    nextId: state.nextId + 1,
  });
  const { kind } = draft.anchor;
  const sameCat = (b: ChatBubble) =>
    draft.anchor.kind === "cat" && b.anchor.kind === "cat" && b.anchor.catKey === draft.anchor.catKey;
  const others = state.bubbles.filter((b) => !sameCat(b));
  const group = others.filter((b) => b.anchor.kind === kind);
  if (group.length < limits[kind]) return next(others);

  const candidates = group.some((b) => !b.isCue) ? group.filter((b) => !b.isCue) : group;
  const oldest = candidates.reduce((a, b) => (b.bornAt < a.bornAt ? b : a), candidates[0]);

  return next(others.filter((b) => b.id !== oldest.id));
}

/**
 * A random meow from a cat in view, tired if it runs in the slowest fifth.
 * @param frame - The frame
 * @param state - The bubbles alive
 * @param random - Source of randomness in [0, 1)
 * @returns The draft, or null when no cat is free to speak or the race has no ranking yet
 */
function randomMeow(frame: ChatFrame, state: ChatterState, random: () => number): Draft | null {
  const { ranks, visible } = frame.cats;
  if (!ranks) return null;
  const talking = new Set(state.bubbles.flatMap((b) => (b.anchor.kind === "cat" ? [b.anchor.catKey] : [])));
  const [catKey] = pickCats(visible.filter((key) => !talking.has(key)), 1, random);
  if (catKey === undefined) return null;

  const isTired = ranks.indexOf(catKey) >= Math.floor(ranks.length * (1 - TAIL_SHARE));
  const lines = isTired ? TIRED_MEOWS : CAT_MEOWS;

  return catDraft(catKey, { text: lines[Math.floor(random() * lines.length)], tone: "plain", isCue: false });
}

/**
 * Move the chatter on one frame: drop what has run out, say what the cues call for, then maybe
 * add a random cheer and a random meow at rates that grow with the excitement.
 * @param state - The bubbles alive
 * @param frame - This frame
 * @param random - Source of randomness in [0, 1)
 * @returns The new state; `state` is not changed
 */
export function stepChatter(state: ChatterState, frame: ChatFrame, random: () => number): ChatterState {
  const limits: Limits = {
    crowd: frame.width < NARROW_WIDTH ? CROWD_LIMIT_NARROW : CROWD_LIMIT,
    cat: CAT_LIMIT,
  };
  const alive: ChatterState = {
    ...state,
    bubbles: state.bubbles.filter((bubble) => bubble.bornAt + bubble.life > frame.time),
  };
  const cued = frame.cues
    .flatMap((cue) => draftsForCue(cue, frame, random))
    .reduce((current, draft) => addBubble(current, draft, limits, frame.time), alive);
  const countOf = (kind: ChatAnchor["kind"]) => cued.bubbles.filter((bubble) => bubble.anchor.kind === kind).length;
  const crowdCheer: Draft | null =
    countOf("crowd") < limits.crowd && random() < CHEERS_PER_SECOND * frame.excitement * frame.dt
      ? {
          anchor: crowdAnchor(frame, random),
          text: CROWD_CHEERS[Math.floor(random() * CROWD_CHEERS.length)],
          tone: "plain",
          life: CROWD_LIFE_SECONDS,
          isCue: false,
        }
      : null;
  const withCheer = crowdCheer ? addBubble(cued, crowdCheer, limits, frame.time) : cued;
  if (countOf("cat") >= limits.cat) return withCheer;
  if (random() >= MEOWS_PER_SECOND * frame.excitement * frame.dt) return withCheer;

  const meow = randomMeow(frame, withCheer, random);

  return meow ? addBubble(withCheer, meow, limits, frame.time) : withCheer;
}
