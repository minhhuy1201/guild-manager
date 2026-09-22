"use client";

import { useCallback, useEffect, useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

/** How long a stage stays on screen before playback moves on, in milliseconds. */
export const PLAYBACK_DWELL_MS = 900;

/** The play button's state and the two things it can do. */
export interface StagePlayback {
  /** Whether the stages are walking themselves */
  playing: boolean;
  /** Start playback, from the first stage when the last one is already open; stop it again */
  toggle: () => void;
  /** Give the stages back to the person */
  stop: () => void;
}

/**
 * Walk the stages on their own, one after the next.
 *
 * Playback stops at the last stage rather than looping: a tactic is read front to back, and a loop
 * would leave a viewer unsure whether they are watching the second pass or the first.
 * @param stages - Every stage of the tactic, in order
 * @param activeStageId - Stage whose tab is open
 * @param animating - Whether a stage change is still running; the dwell starts after it ends
 * @param onSelect - Called with the stage playback lands on
 * @returns The playback state and its controls
 */
export function useStagePlayback(
  stages: TacticStage[],
  activeStageId: string | null,
  animating: boolean,
  onSelect: (stageId: string) => void
): StagePlayback {
  const [playing, setPlaying] = useState(false);
  const index = stages.findIndex((stage) => stage.id === activeStageId);
  const next = index === -1 ? null : (stages[index + 1] ?? null);

  useEffect(() => {
    if (!playing || animating) {
      return;
    }

    if (!next) {
      setPlaying(false);

      return;
    }

    const timer = setTimeout(() => onSelect(next.id), PLAYBACK_DWELL_MS);

    return () => clearTimeout(timer);
  }, [playing, animating, next, onSelect]);

  const stop = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(() => {
    if (playing) {
      setPlaying(false);

      return;
    }

    // Pressing play on the last stage means "watch it again", not "do nothing".
    if (!next && stages[0]) {
      onSelect(stages[0].id);
    }

    setPlaying(true);
  }, [playing, next, stages, onSelect]);

  return { playing, toggle, stop };
}
