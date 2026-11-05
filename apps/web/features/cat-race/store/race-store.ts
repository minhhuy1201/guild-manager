import { create } from "zustand";
import type { CatRaceDrawResult } from "@guild/shared/schemas";

import { RACE_DURATION_DEFAULT_SECONDS, parseRaceDuration } from "../lib/race-duration";

/** Where one round is: nothing running, waiting for the server, replaying, or showing the winner. */
export type RaceStage = "idle" | "drawing" | "racing" | "result";

/** `localStorage` key of the chosen duration; the old `cat-race-speed` key is left alone. */
const DURATION_STORAGE_KEY = "cat-race-duration-seconds";

/**
 * The duration saved by an earlier visit.
 * @returns The stored seconds, or the default when storage is unreadable, empty or out of range
 */
function readDuration(): number {
  try {
    const stored = localStorage.getItem(DURATION_STORAGE_KEY);

    return (stored === null ? null : parseRaceDuration(stored)) ?? RACE_DURATION_DEFAULT_SECONDS;
  } catch {
    // Storage can be blocked (private window, site data off); a preference is not worth failing for.
    return RACE_DURATION_DEFAULT_SECONDS;
  }
}

/** `localStorage` key of the commentary switch. */
const COMMENTARY_STORAGE_KEY = "cat-race-commentary-on";

/** Commentary is on until the admin switches it off. */
const COMMENTARY_DEFAULT_ON = true;

/**
 * The commentary choice saved by an earlier visit.
 * @returns The stored choice, or the default when storage is unreadable, empty or not a boolean
 */
function readCommentaryOn(): boolean {
  try {
    const stored = localStorage.getItem(COMMENTARY_STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;

    return COMMENTARY_DEFAULT_ON;
  } catch {
    // Same as `readDuration`: storage can be blocked, and a preference is not worth failing for.
    return COMMENTARY_DEFAULT_ON;
  }
}

interface RaceState {
  selectedPrizeId: string | null;
  /** Seconds the winner takes to cross the line */
  durationSeconds: number;
  /** Whether the commentary bar narrates the race */
  isCommentaryOn: boolean;
  stage: RaceStage;
  /** The server's answer, held until the replay ends */
  pendingResult: CatRaceDrawResult | null;
  /** Cat keys from the top lane down after a shuffle, with the prize it was made for; null keeps A to Z */
  laneOrder: { prizeId: string; keys: string[] } | null;
  selectPrize: (prizeId: string) => void;
  shuffleLanes: (prizeId: string, keys: string[]) => void;
  setDurationSeconds: (seconds: number) => void;
  setCommentaryOn: (isOn: boolean) => void;
  startDrawing: () => void;
  startRacing: (result: CatRaceDrawResult) => void;
  showResult: (result: CatRaceDrawResult) => void;
  reset: () => void;
}

/** UI state of the race screen (Zustand). The event data itself stays in TanStack Query. */
export const useRaceStore = create<RaceState>((set) => ({
  selectedPrizeId: null,
  durationSeconds: readDuration(),
  isCommentaryOn: readCommentaryOn(),
  stage: "idle",
  pendingResult: null,
  laneOrder: null,
  // Another prize has another field, so a shuffle made for a different prize is dropped.
  selectPrize: (prizeId) =>
    set((state) => ({
      selectedPrizeId: prizeId,
      laneOrder: state.laneOrder?.prizeId === prizeId ? state.laneOrder : null,
    })),
  shuffleLanes: (prizeId, keys) => set({ laneOrder: { prizeId, keys } }),
  setDurationSeconds: (durationSeconds) => {
    try {
      localStorage.setItem(DURATION_STORAGE_KEY, String(durationSeconds));
    } catch {
      // Same as `readDuration`: the choice still holds for this visit.
    }
    set({ durationSeconds });
  },
  setCommentaryOn: (isCommentaryOn) => {
    try {
      localStorage.setItem(COMMENTARY_STORAGE_KEY, String(isCommentaryOn));
    } catch {
      // Same as `readCommentaryOn`: the choice still holds for this visit.
    }
    set({ isCommentaryOn });
  },
  startDrawing: () => set({ stage: "drawing", pendingResult: null }),
  startRacing: (result) => set({ stage: "racing", pendingResult: result }),
  showResult: (result) => set({ stage: "result", pendingResult: result }),
  reset: () => set({ stage: "idle", pendingResult: null }),
}));
