import { COUNTDOWN_STEPS, type RaceMoment } from "./race-timeline";

/** The track's own lead changes below this race time are the pack sorting itself out, not news. */
export const LEAD_CHANGE_FROM_U = 0.08;

/** What the track tells the stage while a round plays; each fires once, in this order. */
export type RaceCue =
  | { readonly kind: "countdown"; readonly step: number }
  | { readonly kind: "go" }
  | { readonly kind: "lead-change"; readonly catKey: string }
  | { readonly kind: "sprint" }
  | { readonly kind: "slow-motion"; readonly isOn: boolean }
  | {
      readonly kind: "finish";
      readonly isPhotoFinish: boolean;
      /** Cat bodies the runner-up is short of the line, as the canvas sees them */
      readonly lengthsBehind: number;
    };

/** The finish cue, which the track builds because only it knows the lane layout. */
export type FinishCue = Extract<RaceCue, { kind: "finish" }>;

/** What has been announced so far in one round. */
export interface CueCursor {
  /** Last countdown step announced; -1 before the first */
  readonly countdownStep: number;
  readonly hasGone: boolean;
  /** Who led at the last look; null before the first */
  readonly leaderKey: string | null;
  readonly hasSprinted: boolean;
  readonly isSlow: boolean;
  readonly hasFinished: boolean;
}

export const INITIAL_CUE_CURSOR: CueCursor = {
  countdownStep: -1,
  hasGone: false,
  leaderKey: null,
  hasSprinted: false,
  isSlow: false,
  hasFinished: false,
};

/**
 * The cues a frame owes, given what was already announced. A late frame that jumped over a step
 * still announces it, so the stage never misses one and never sees one twice.
 * @param cursor - What was announced before this frame
 * @param moment - Where the round stands now
 * @param leaderKey - Who leads now
 * @param finish - The finish cue to send when the winner is on the line
 * @returns The cues in order and the cursor to pass to the next frame
 */
export function nextCues(
  cursor: CueCursor,
  moment: RaceMoment,
  leaderKey: string,
  finish: FinishCue
): { cues: RaceCue[]; cursor: CueCursor } {
  const isRacing = moment.phase !== "countdown";
  const lastStep = moment.countdownStep ?? COUNTDOWN_STEPS - 1;
  const countdown: RaceCue[] = Array.from(
    { length: Math.max(0, lastStep - cursor.countdownStep) },
    (_, index) => ({ kind: "countdown", step: cursor.countdownStep + 1 + index })
  );
  const go: RaceCue[] = isRacing && !cursor.hasGone ? [{ kind: "go" }] : [];
  const hasLeadChange =
    isRacing &&
    cursor.leaderKey !== null &&
    leaderKey !== cursor.leaderKey &&
    moment.u > LEAD_CHANGE_FROM_U;
  const leadChange: RaceCue[] = hasLeadChange ? [{ kind: "lead-change", catKey: leaderKey }] : [];
  const sprint: RaceCue[] = isRacing && moment.isSprint && !cursor.hasSprinted ? [{ kind: "sprint" }] : [];
  const slow: RaceCue[] =
    isRacing && moment.isSlow !== cursor.isSlow ? [{ kind: "slow-motion", isOn: moment.isSlow }] : [];
  const isFinished = moment.phase === "finish" || moment.phase === "photo" || moment.phase === "done";
  const finishing: RaceCue[] = isFinished && !cursor.hasFinished ? [finish] : [];

  return {
    cues: [...countdown, ...go, ...leadChange, ...sprint, ...slow, ...finishing],
    cursor: {
      countdownStep: Math.max(cursor.countdownStep, lastStep),
      hasGone: cursor.hasGone || isRacing,
      leaderKey,
      hasSprinted: cursor.hasSprinted || (isRacing && moment.isSprint),
      isSlow: isRacing ? moment.isSlow : cursor.isSlow,
      hasFinished: cursor.hasFinished || isFinished,
    },
  };
}
