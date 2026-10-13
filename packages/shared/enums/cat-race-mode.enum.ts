/** How a cat race event weighs its entrants: one chance each, or one cat per ticket. */
export enum CatRaceMode {
  STANDARD = "STANDARD",
  TICKET = "TICKET",
}

/** Vietnamese display label per mode. */
export const CAT_RACE_MODE_LABEL: Record<CatRaceMode, string> = {
  [CatRaceMode.STANDARD]: "Thường",
  [CatRaceMode.TICKET]: "Vé",
};
