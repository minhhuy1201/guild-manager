import { create } from "zustand";
import type { CatRaceDrawResult } from "@guild/shared/schemas";

import { RACE_DURATION_SECONDS, type RaceSpeed } from "../lib/race-script";

/** Where one round is: nothing running, waiting for the server, replaying, or showing the winner. */
export type RaceStage = "idle" | "drawing" | "racing" | "result";

/** `localStorage` key of the chosen speed. */
const SPEED_STORAGE_KEY = "cat-race-speed";
const DEFAULT_SPEED: RaceSpeed = "NORMAL";

/**
 * Whether a stored string is one of the speeds.
 * @param value - Raw stored value
 * @returns True for `FAST`, `NORMAL` or `SLOW`
 */
function isRaceSpeed(value: string | null): value is RaceSpeed {
  return value !== null && value in RACE_DURATION_SECONDS;
}

/**
 * The speed saved by an earlier visit.
 * @returns The stored speed, or the default when storage is unreadable or empty
 */
function readSpeed(): RaceSpeed {
  try {
    const stored = localStorage.getItem(SPEED_STORAGE_KEY);

    return isRaceSpeed(stored) ? stored : DEFAULT_SPEED;
  } catch {
    // Storage can be blocked (private window, site data off); a preference is not worth failing for.
    return DEFAULT_SPEED;
  }
}

interface RaceState {
  selectedPrizeId: string | null;
  speed: RaceSpeed;
  stage: RaceStage;
  /** The server's answer, held until the replay ends */
  pendingResult: CatRaceDrawResult | null;
  selectPrize: (prizeId: string) => void;
  setSpeed: (speed: RaceSpeed) => void;
  startDrawing: () => void;
  startRacing: (result: CatRaceDrawResult) => void;
  showResult: (result: CatRaceDrawResult) => void;
  reset: () => void;
}

/** UI state of the race screen (Zustand). The event data itself stays in TanStack Query. */
export const useRaceStore = create<RaceState>((set) => ({
  selectedPrizeId: null,
  speed: readSpeed(),
  stage: "idle",
  pendingResult: null,
  selectPrize: (prizeId) => set({ selectedPrizeId: prizeId }),
  setSpeed: (speed) => {
    try {
      localStorage.setItem(SPEED_STORAGE_KEY, speed);
    } catch {
      // Same as `readSpeed`: the choice still holds for this visit.
    }
    set({ speed });
  },
  startDrawing: () => set({ stage: "drawing", pendingResult: null }),
  startRacing: (result) => set({ stage: "racing", pendingResult: result }),
  showResult: (result) => set({ stage: "result", pendingResult: result }),
  reset: () => set({ stage: "idle", pendingResult: null }),
}));
