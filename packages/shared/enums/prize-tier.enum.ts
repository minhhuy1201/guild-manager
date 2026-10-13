/** How valuable a cat race prize is; drives its colour on screen. */
export enum PrizeTier {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/** Vietnamese display label per tier. */
export const PRIZE_TIER_LABEL: Record<PrizeTier, string> = {
  [PrizeTier.HIGH]: "Cao",
  [PrizeTier.MEDIUM]: "Vừa",
  [PrizeTier.LOW]: "Thấp",
};
