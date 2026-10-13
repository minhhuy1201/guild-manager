import { PrizeTier } from "@guild/shared/enums";

/** Chip and card accent per prize tier, from the palette tokens so both themes follow. */
export const PRIZE_TIER_CLASS: Record<PrizeTier, string> = {
  [PrizeTier.HIGH]: "border-gold bg-gold/10",
  [PrizeTier.MEDIUM]: "border-jade bg-jade/10",
  [PrizeTier.LOW]: "border-border bg-card",
};
