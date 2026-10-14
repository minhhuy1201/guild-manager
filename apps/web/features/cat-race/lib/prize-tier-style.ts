import { Crown, Gem, Gift, type LucideIcon } from "lucide-react";
import { PRIZE_TIER_LABEL, PrizeTier } from "@guild/shared/enums";

/** Chip and card accent per prize tier, from the palette tokens so both themes follow. */
export const PRIZE_TIER_CLASS: Record<PrizeTier, string> = {
  [PrizeTier.HIGH]: "border-gold bg-gold/15",
  [PrizeTier.MEDIUM]: "border-jade bg-jade/10",
  [PrizeTier.LOW]: "border-primary/50 bg-primary/5",
};

/** Tinted square behind a tier icon. The icon itself stays `foreground`: gold on a pale surface is under 3:1. */
export const PRIZE_TIER_BADGE_CLASS: Record<PrizeTier, string> = {
  [PrizeTier.HIGH]: "border-gold bg-gold/30",
  [PrizeTier.MEDIUM]: "border-jade bg-jade/25",
  [PrizeTier.LOW]: "border-primary/50 bg-primary/15",
};

export const PRIZE_TIER_ICON: Record<PrizeTier, LucideIcon> = {
  [PrizeTier.HIGH]: Crown,
  [PrizeTier.MEDIUM]: Gem,
  [PrizeTier.LOW]: Gift,
};

/** The tier picker's choices, shared by the create and edit forms. */
export const PRIZE_TIER_OPTIONS = Object.values(PrizeTier).map((value) => ({
  value,
  label: PRIZE_TIER_LABEL[value],
  icon: PRIZE_TIER_ICON[value],
}));

export const PRIZE_TIER_FIELD_LABEL = "Độ quý của giải";
export const PRIZE_TIER_HINT = "Chỉ đổi màu và icon hiển thị, không ảnh hưởng ai thắng.";
