/** How valuable a cat race prize is; drives its colour on screen. */
export enum PrizeTier {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/** Every tier, most valuable first. */
export const PRIZE_TIER_ORDER: readonly PrizeTier[] = [
  PrizeTier.HIGH,
  PrizeTier.MEDIUM,
  PrizeTier.LOW,
];

/** Vietnamese display label per tier. */
export const PRIZE_TIER_LABEL: Record<PrizeTier, string> = {
  [PrizeTier.HIGH]: "Đặc biệt",
  [PrizeTier.MEDIUM]: "Lớn",
  [PrizeTier.LOW]: "Thường",
};
