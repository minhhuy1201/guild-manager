import { assertNever } from "@guild/shared/lib";

import type { RaceStanding } from "./race-board";
import type { RaceCue } from "./race-cue";

/** A quiet line waits this long after the last one; an urgent line never waits. */
export const COMMENTARY_MIN_GAP_MS = 2200;
/** How far back a comeback is measured. */
export const COMMENTARY_HISTORY_MS = 3000;
const COMEBACK_PLACES = 4;
const COMEBACK_TOP = 3;
const COMEBACK_FROM_SHARE = 0.25;
const HALF_FROM_SHARE = 0.45;
const PACK_FROM_SHARE = 0.55;
const PACK_UNTIL_SHARE = 0.8;
const PACK_LENGTHS = 1;
/** Bodies behind at the line under which the finish is called a photo. */
const PHOTO_LENGTHS = 0.5;

/** One thing the commentator says. */
export interface CommentaryLine {
  readonly text: string;
  /** Painted in gold: a shout rather than a remark */
  readonly isHype: boolean;
}

/** What the commentator remembers of one round. */
export interface CommentaryMemory {
  /** When the race started, in ms on the caller's clock; null before `go` */
  readonly goAt: number | null;
  /** When the last line was said; null before the first */
  readonly lastAt: number | null;
  /** One-off remarks already made */
  readonly said: ReadonlySet<string>;
  /** Board orders over the last `COMMENTARY_HISTORY_MS`, oldest first */
  readonly history: readonly { readonly at: number; readonly keys: readonly string[] }[];
  readonly leaderKey: string | null;
}

export const INITIAL_COMMENTARY: CommentaryMemory = {
  goAt: null,
  lastAt: null,
  said: new Set(),
  history: [],
  leaderKey: null,
};

/** The memory after one input and the line it produced, if any. */
export interface CommentaryStep {
  readonly memory: CommentaryMemory;
  readonly line: CommentaryLine | null;
}

/** What a cue needs besides the memory. */
export interface CueContext {
  /** Ms on a steady clock */
  readonly now: number;
  /** Display name by cat key */
  readonly nameOf: (key: string) => string;
  readonly catCount: number;
  /** A source in `[0, 1)` */
  readonly random: () => number;
}

/** What a board update needs besides the memory. */
export interface BoardContext {
  readonly now: number;
  readonly nameOf: (key: string) => string;
  /** Seconds the winner takes, to place the share of the race */
  readonly durationSeconds: number;
}

const pick = <T>(items: readonly T[], random: () => number): T =>
  items[Math.floor(random() * items.length)]!;

/**
 * Say a line unless it is quiet and too soon after the last one.
 * @param memory - The memory before
 * @param line - What would be said
 * @param isUrgent - Whether it skips the wait
 * @param now - Ms on a steady clock
 * @returns The memory with the line's time, and the line; unchanged and silent when dropped
 */
function say(
  memory: CommentaryMemory,
  line: CommentaryLine,
  isUrgent: boolean,
  now: number
): CommentaryStep {
  const isTooSoon = memory.lastAt !== null && now - memory.lastAt < COMMENTARY_MIN_GAP_MS;
  if (!isUrgent && isTooSoon) return { memory, line: null };

  return { memory: { ...memory, lastAt: now }, line };
}

/**
 * What the commentator makes of one cue from the track.
 * @param memory - The memory before
 * @param cue - What the track announced
 * @param context - The clock, names and the random source
 * @returns The memory after and the line to show, if any
 */
export function commentOnCue(
  memory: CommentaryMemory,
  cue: RaceCue,
  context: CueContext
): CommentaryStep {
  const { now, nameOf, random } = context;
  switch (cue.kind) {
    case "countdown":
      return { memory, line: null };
    case "go": {
      const text = pick(
        [
          `Cổng mở! ${context.catCount} chú mèo lao ra khỏi vạch!`,
          "Xuất phát! Bụi bay mù mịt!",
          "Chạy rồi! Cả đàn ùa ra!",
        ],
        random
      );

      return say({ ...memory, goAt: now }, { text, isHype: true }, true, now);
    }
    case "lead-change": {
      const name = nameOf(cue.catKey);
      const placeBefore = memory.history[0]?.keys.indexOf(cue.catKey) ?? -1;
      const previous = memory.leaderKey ? nameOf(memory.leaderKey) : null;
      const next = { ...memory, leaderKey: cue.catKey };
      if (placeBefore >= COMEBACK_PLACES) {
        const text = `${name} từ hạng ${placeBefore + 1} vọt lên dẫn đầu!`;

        return say(next, { text, isHype: true }, true, now);
      }
      const lines = [`${name} vượt lên dẫn đầu!`, `Đổi ngôi! ${name} lên số một!`];
      const text = pick(previous ? [...lines, `${name} cắn răng vượt mặt ${previous}!`] : lines, random);

      return say(next, { text, isHype: true }, false, now);
    }
    case "sprint": {
      const text = pick(["Nước rút! Ai sẽ về nhất đây?!", "Vào nước rút! Ráng lên các bé ơi!"], random);

      return say(memory, { text, isHype: true }, true, now);
    }
    case "slow-motion":
      if (!cue.isOn) return { memory, line: null };

      return say(memory, { text: "Chậm lại... từng sợi râu đều quan trọng!", isHype: false }, true, now);
    case "finish": {
      // Never a name: the winner is still to be announced.
      const text =
        cue.lengthsBehind < PHOTO_LENGTHS
          ? "Sát nút! Phải soi ảnh đích!"
          : "Về đích! Chờ trọng tài xác nhận...";

      return say(memory, { text, isHype: true }, true, now);
    }
    default:
      return assertNever(cue);
  }
}

/**
 * What the commentator makes of one board update.
 * @param memory - The memory before
 * @param rows - The standings, leader first
 * @param context - The clock, names and race length
 * @returns The memory after and the line to show, if any
 */
export function commentOnBoard(
  memory: CommentaryMemory,
  rows: readonly RaceStanding[],
  context: BoardContext
): CommentaryStep {
  const { now, nameOf, durationSeconds } = context;
  const keys = rows.map((row) => row.key);
  const history = [
    ...memory.history.filter((entry) => now - entry.at <= COMMENTARY_HISTORY_MS),
    { at: now, keys },
  ];
  const seen = { ...memory, history };
  if (memory.goAt === null || keys.length < 2) return { memory: seen, line: null };

  const share = (now - memory.goAt) / (durationSeconds * 1000);
  const oldest = history[0]!.keys;
  const remember = (step: CommentaryStep, remark: string): CommentaryStep =>
    step.line ? { ...step, memory: { ...step.memory, said: new Set(step.memory.said).add(remark) } } : step;

  if (share > COMEBACK_FROM_SHARE) {
    const climber = keys.slice(0, COMEBACK_TOP).find((key, place) => {
      const was = oldest.indexOf(key);

      return was - place >= COMEBACK_PLACES && !memory.said.has(`comeback:${key}`);
    });
    if (climber) {
      const text = `Chú ý ${nameOf(climber)}! Từ cuối đoàn lên hạng ${keys.indexOf(climber) + 1}!`;

      return remember(say(seen, { text, isHype: true }, false, now), `comeback:${climber}`);
    }
  }
  if (share > HALF_FROM_SHARE && !memory.said.has("half")) {
    const text = `Nửa chặng đường. ${nameOf(keys[0]!)} giữ đầu, ${nameOf(keys[1]!)} bám sát phía sau.`;

    return remember(say(seen, { text, isHype: false }, false, now), "half");
  }
  const third = rows[2];
  const isPack =
    share > PACK_FROM_SHARE &&
    share < PACK_UNTIL_SHARE &&
    third?.lengthsBehind != null &&
    third.lengthsBehind < PACK_LENGTHS &&
    !memory.said.has("pack");
  if (isPack) {
    const text = "Ba chú mèo dính nhau như sam! Chưa ai dám chắc!";

    return remember(say(seen, { text, isHype: true }, false, now), "pack");
  }

  return { memory: seen, line: null };
}
