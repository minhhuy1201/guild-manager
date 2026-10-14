import { PRIZE_TIER_LABEL, type PrizeTier } from "@guild/shared/enums";

import { cn } from "@/lib/utils";
import { PRIZE_TIER_BADGE_CLASS, PRIZE_TIER_ICON } from "../lib/prize-tier-style";

interface PrizeTierBadgeProps {
  tier: PrizeTier;
  /** Name the tier for screen readers; leave it off where the tier is already written out beside the badge */
  isNamed?: boolean;
  className?: string;
}

/**
 * The tier's icon on a tinted square. The icon is decorative; `isNamed` adds the tier name for
 * screen readers where no text beside the badge says it.
 * @param tier - The prize tier
 * @param isNamed - Whether to add the tier name as screen-reader text
 * @param className - Extra classes, for sizing
 * @returns The badge
 */
export function PrizeTierBadge({ tier, isNamed = false, className }: PrizeTierBadgeProps) {
  const Icon = PRIZE_TIER_ICON[tier];

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border",
        PRIZE_TIER_BADGE_CLASS[tier],
        className
      )}
    >
      <Icon aria-hidden className="size-4 text-foreground" />
      {isNamed ? <span className="sr-only">{PRIZE_TIER_LABEL[tier]}</span> : null}
    </span>
  );
}
