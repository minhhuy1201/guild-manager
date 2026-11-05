import { useCallback, useRef, useState } from "react";

import {
  INITIAL_COMMENTARY,
  commentOnBoard,
  commentOnCue,
  type CommentaryLine,
  type CommentaryMemory,
  type CommentaryStep,
} from "../lib/race-commentary";
import type { RaceStanding } from "../lib/race-board";
import type { RaceCue } from "../lib/race-cue";

/** A line on screen; each `id` is new, so its animation restarts. */
export interface ShownCommentary extends CommentaryLine {
  readonly id: number;
}

/**
 * Commentary for one round: feed it the canvas's cues and board rows, it keeps one line on screen.
 * @param labels - Display name by cat key
 * @param durationSeconds - Seconds the winner takes, to place "half way"
 * @returns The current line, the two feeds and a reset for the next round
 */
export function useRaceCommentary(
  labels: ReadonlyMap<string, string> | null,
  durationSeconds: number
) {
  const [line, setLine] = useState<ShownCommentary | null>(null);
  const memory = useRef<CommentaryMemory>(INITIAL_COMMENTARY);
  const nextId = useRef(1);

  const nameOf = useCallback((key: string) => labels?.get(key) ?? "?", [labels]);

  const apply = useCallback((step: CommentaryStep) => {
    memory.current = step.memory;
    if (!step.line) return;
    setLine({ ...step.line, id: nextId.current++ });
  }, []);

  const onCue = useCallback(
    (cue: RaceCue) =>
      apply(
        commentOnCue(memory.current, cue, {
          now: performance.now(),
          nameOf,
          catCount: labels?.size ?? 0,
          random: Math.random,
        })
      ),
    [apply, labels, nameOf]
  );

  const onStandings = useCallback(
    (rows: readonly RaceStanding[]) =>
      apply(
        commentOnBoard(memory.current, rows, { now: performance.now(), nameOf, durationSeconds })
      ),
    [apply, durationSeconds, nameOf]
  );

  const reset = useCallback(() => {
    memory.current = INITIAL_COMMENTARY;
    setLine(null);
  }, []);

  return { line, onCue, onStandings, reset };
}
