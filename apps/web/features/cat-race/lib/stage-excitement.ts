import { assertNever } from "@guild/shared/lib";

import type { RacePhase } from "./race-timeline";

/** Where the stage is: a round's phase, or `idle` before any round starts (the preview). */
export type StagePhase = RacePhase | "idle";

/** How hard the crowd bobs in each phase; from `ARMS_UP_FROM` on the spectators raise their arms. */
const EXCITEMENT_IDLE = 0.5;
const EXCITEMENT_COUNTDOWN = 1.6;
const EXCITEMENT_RUNNING = 1.2;
const EXCITEMENT_SPRINT = 3.2;
const EXCITEMENT_FINISH = 4;
export const ARMS_UP_FROM = 3;

/**
 * How excited the crowd is.
 * @param phase - Where the stage is
 * @param isSprint - Whether the race time passed the sprint mark
 * @returns The bob strength, 0.5..4
 */
export function excitementAt(phase: StagePhase, isSprint: boolean): number {
  switch (phase) {
    case "idle":
      return EXCITEMENT_IDLE;
    case "countdown":
      return EXCITEMENT_COUNTDOWN;
    case "running":
      return isSprint ? EXCITEMENT_SPRINT : EXCITEMENT_RUNNING;
    case "finish":
    case "photo":
    case "done":
      return EXCITEMENT_FINISH;
    default:
      return assertNever(phase);
  }
}

/**
 * Whether ranks and the leader's highlight show: from "go" on.
 * @param phase - Where the stage is
 * @returns False while idle and counting down
 */
export function isRacing(phase: StagePhase): boolean {
  return phase !== "idle" && phase !== "countdown";
}
