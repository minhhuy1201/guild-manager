"use client";

import { useEffect, useRef, useState } from "react";
import type { TacticStage } from "@guild/shared/schemas";

import {
  TRANSITION_MS,
  easeOutCubic,
  frameToStage,
  staticFrame,
  transitionFrame,
  type StageFrame,
} from "../lib/stage-transition";
import { useReducedMotion } from "./use-reduced-motion";

/** How the caller wants the canvas driven. */
export interface StageTransitionOptions {
  /** False freezes the canvas on the active stage, with no animation at all */
  enabled?: boolean;
  /** Whether to ghost the stage before the active one while standing still */
  onionSkin?: boolean;
}

/** What the canvas needs to draw, and whether it is moving. */
export interface StageTransitionResult {
  /** The frame to draw; null when there is no stage yet */
  frame: StageFrame | null;
  /** Whether a move is running right now */
  animating: boolean;
}

/** A move in flight: where it came from, where it goes, and how far along it is. */
interface RunningMove {
  /** The stage being left, frozen at the moment the move started */
  from: TacticStage;
  /** The stage being entered */
  to: TacticStage;
  /** Linear progress, before easing */
  t: number;
}

/**
 * Drive the canvas across a stage change.
 *
 * Every rule about what a frame looks like lives in `lib/stage-transition.ts`; this hook only pushes
 * `t` from 0 to 1 and decides what the next move starts from. Going backwards is not a branch here:
 * it is the same call with the two stages swapped.
 * @param stages - Every stage of the tactic, in order
 * @param activeStageId - Stage whose tab is open
 * @param options - Whether to animate at all, and whether to show onion skin
 * @returns The frame to draw and whether it is moving
 */
export function useStageTransition(
  stages: TacticStage[],
  activeStageId: string | null,
  { enabled = true, onionSkin = false }: StageTransitionOptions = {}
): StageTransitionResult {
  const reducedMotion = useReducedMotion();
  const animates = enabled && !reducedMotion;

  const [move, setMove] = useState<RunningMove | null>(null);
  const activeIndex = stages.findIndex((stage) => stage.id === activeStageId);
  const activeStage =
    activeIndex === -1 ? (stages[0] ?? null) : stages[activeIndex];
  const previousStage = activeIndex > 0 ? stages[activeIndex - 1] : null;

  const frame: StageFrame | null = !activeStage
    ? null
    : move
      ? transitionFrame(move.from, move.to, easeOutCubic(move.t))
      : staticFrame(activeStage, onionSkin ? previousStage : null);

  // What the canvas showed before this render. Recorded by the effect at the bottom of this hook,
  // which runs after the one below, so the one below still sees the frame being walked away from.
  const frameRef = useRef<StageFrame | null>(null);
  const shownStageRef = useRef<TacticStage | null>(null);

  const activeStageKey = activeStage?.id ?? null;

  useEffect(() => {
    const target = activeStage;
    const previous = shownStageRef.current;

    shownStageRef.current = target;

    // Nothing to walk from: the first stage the canvas ever shows, or the same stage again.
    if (!target || !previous || previous.id === target.id || !animates) {
      setMove(null);

      return;
    }

    // Always walk from the frame on screen, never from `previous` alone. That stage object was
    // captured when it became active, so an edit made since then - a dragged token, an undo - is
    // not in it, and starting there would snap the token back before it moved. It still names the
    // stage being left, which is all `frameToStage` takes from it.
    const source = frameRef.current
      ? frameToStage(frameRef.current, previous)
      : previous;

    setMove({ from: source, to: target, t: 0 });

    const start = performance.now();
    let handle = 0;

    /**
     * Push the move one frame on, and end it once the clock runs out.
     * @param time - The timestamp the browser handed this frame
     */
    function step(time: number): void {
      const t = Math.min((time - start) / TRANSITION_MS, 1);

      if (t >= 1) {
        setMove(null);

        return;
      }

      setMove((running) => (running ? { ...running, t } : running));
      handle = requestAnimationFrame(step);
    }

    handle = requestAnimationFrame(step);

    return () => cancelAnimationFrame(handle);
    // `activeStage` is looked up fresh on every render; its id is what actually changes, and the
    // refs above carry everything else this effect reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStageKey, animates]);

  // Declared last on purpose: effects run in order, so the effect above reads the previous render's
  // frame rather than the one this render has already rebuilt for the new stage.
  useEffect(() => {
    frameRef.current = frame;
  });

  return { frame, animating: move !== null };
}
