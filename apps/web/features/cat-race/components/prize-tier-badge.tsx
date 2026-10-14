import type { PrizeTier } from "@guild/shared/enums";

import { cn } from "@/lib/utils";
import { PRIZE_TIER_BADGE_CLASS, PRIZE_TIER_ICON } from "../lib/prize-tier-style";

interface PrizeTierBadgeProps {
  tier: PrizeTier;
  className?: string;
}

/**
 * The tier's icon on a tinted square. Decorative: the tier name always sits beside it in words.
 * @param tier - The prize tier
 * @param className - Extra classes, for sizing
 * @returns The badge
 */
export function PrizeTierBadge({ tier, className }: PrizeTierBadgeProps) {
  const Icon = PRIZE_TIER_ICON[tier];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border",
        PRIZE_TIER_BADGE_CLASS[tier],
        className
      )}
    >
      <Icon className="size-4 text-foreground" />
    </span>
  );
}
