import { assertNever } from "@guild/shared/lib";

import type { RaceCue } from "./race-cue";

/** Two lead-change bars start at least this far apart; a change in between is counted but not shown. */
export const LEAD_TOAST_MIN_GAP_MS = 1300;

/** The words on a banner. */
export type BannerText = "CHẠY!" | "NƯỚC RÚT";

/** What the stage's overlays show right now. Each `id` is new for every showing, so an animation restarts. */
export interface OverlayState {
  /** Last lantern lit; -1 before the first */
  readonly countdownStep: number;
  readonly isCountingDown: boolean;
  readonly banner: { readonly id: number; readonly text: BannerText } | null;
  readonly leadToast: { readonly id: number; readonly catKey: string } | null;
  /** When the last lead-change bar was shown, in ms on the caller's clock */
  readonly lastToastAt: number | null;
  readonly isSlow: boolean;
  readonly flashId: number | null;
  readonly photo: { readonly lengthsBehind: number } | null;
  /** Last id handed out */
  readonly sequence: number;
}

export const INITIAL_OVERLAY: OverlayState = {
  countdownStep: -1,
  isCountingDown: false,
  banner: null,
  leadToast: null,
  lastToastAt: null,
  isSlow: false,
  flashId: null,
  photo: null,
  sequence: 0,
};

/**
 * The overlays after one cue.
 * @param state - The overlays before
 * @param cue - What the track announced
 * @param now - When it arrived, in ms on a steady clock
 * @returns The overlays after
 */
export function applyCue(state: OverlayState, cue: RaceCue, now: number): OverlayState {
  const id = state.sequence + 1;
  switch (cue.kind) {
    case "countdown":
      return { ...state, countdownStep: cue.step, isCountingDown: true };
    case "go":
      return { ...state, isCountingDown: false, banner: { id, text: "CHẠY!" }, sequence: id };
    case "lead-change": {
      const isTooSoon = state.lastToastAt !== null && now - state.lastToastAt < LEAD_TOAST_MIN_GAP_MS;
      if (isTooSoon) return state;

      return { ...state, leadToast: { id, catKey: cue.catKey }, lastToastAt: now, sequence: id };
    }
    case "sprint":
      return { ...state, banner: { id, text: "NƯỚC RÚT" }, sequence: id };
    case "slow-motion":
      return { ...state, isSlow: cue.isOn };
    case "finish":
      return {
        ...state,
        isSlow: false,
        flashId: id,
        photo: { lengthsBehind: cue.lengthsBehind },
        sequence: id,
      };
    default:
      return assertNever(cue);
  }
}
