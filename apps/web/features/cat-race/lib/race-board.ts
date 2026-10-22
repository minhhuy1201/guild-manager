import type { LaneLayout } from "./race-layout";
import { formatLengths, lengthsBehind } from "./race-lengths";
import { progressAt, rankAt, type RaceScript } from "./race-script";

/** One cat on the live board. */
export interface RaceStanding {
  readonly key: string;
  /** Cat bodies to the leader as the canvas sees them; null where no canvas measured it */
  readonly lengthsBehind: number | null;
}

/** Which way a cat went since the previous board update. */
export type RankMove = "up" | "down";

/** The board now and the order it had one update ago, which the arrows compare against. */
export interface BoardState {
  readonly rows: readonly RaceStanding[];
  readonly previousKeys: readonly string[];
}

export const EMPTY_BOARD: BoardState = { rows: [], previousKeys: [] };

/**
 * The board after one more update.
 * @param board - The board before
 * @param rows - The new standings, leader first
 * @returns The new board, remembering the order it replaces
 */
export function advanceBoard(board: BoardState, rows: readonly RaceStanding[]): BoardState {
  return { rows, previousKeys: board.rows.map((row) => row.key) };
}

/**
 * Every cat's place and gap to the leader at one moment.
 * @param script - The race
 * @param u - Race time, 0..1
 * @param layout - The track the gap is seen on; null leaves every gap unmeasured
 * @returns Standings, leader first, the leader's gap being 0
 */
export function standingsAt(
  script: RaceScript,
  u: number,
  layout: LaneLayout | null
): readonly RaceStanding[] {
  const keys = rankAt(script, u);
  const leaderKey = keys[0];
  if (leaderKey === undefined) return [];
  const progressOf = (key: string) => progressAt(script.curves.get(key)!, u);
  const leaderProgress = progressOf(leaderKey);

  return keys.map((key) => ({
    key,
    lengthsBehind: layout ? lengthsBehind(leaderProgress - progressOf(key), layout) : null,
  }));
}

/**
 * Whether a cat climbed or fell since the previous update.
 * @param previousKeys - The order one update ago
 * @param key - The cat
 * @param index - Its place now, 0 for the leader
 * @returns null for a cat that held its place or was not on the board before
 */
export function moveOf(previousKeys: readonly string[], key: string, index: number): RankMove | null {
  const before = previousKeys.indexOf(key);
  if (before === -1 || before === index) return null;

  return before > index ? "up" : "down";
}

/**
 * The gap column of one row.
 * @param row - The row
 * @param index - Its place, 0 for the leader
 * @returns "-1,2" in cat bodies; empty for the leader and for an unmeasured gap
 */
export function gapLabel(row: RaceStanding, index: number): string {
  if (index === 0 || row.lengthsBehind === null) return "";

  return `-${formatLengths(row.lengthsBehind)}`;
}
