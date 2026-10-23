import type { ReactNode } from "react";
import { PRIZE_TIER_LABEL } from "@guild/shared/enums";
import type { CatRacePrize } from "@guild/shared/schemas";

import { cn } from "@/lib/utils";
import { PRIZE_TIER_ICON } from "../lib/prize-tier-style";
import type { RaceClock } from "../lib/race-clock";
import { RaceClockDisplay } from "./race-clock-display";

/** `focus` is the larger type of the full-screen mode, where the bar is the top edge of the screen. */
type RaceBroadcastBarSize = "default" | "focus";

interface RaceBroadcastBarProps {
  prize: CatRacePrize;
  entrantCount: number;
  /** Total tickets of the field; null in standard mode, which has none to show */
  ticketCount: number | null;
  /** True from the countdown through the finish photo */
  isLive: boolean;
  clock: RaceClock;
  size?: RaceBroadcastBarSize;
  /** Replaces the static tier label, e.g. with the focus mode's prize picker */
  tierSlot?: ReactNode;
  className?: string;
}

/**
 * The television-style bar above the track: the live tag, the prize with its tier, the size of the
 * field and the clock.
 * @param props.prize - Prize the round is for
 * @param props.entrantCount - People in the field
 * @param props.ticketCount - Tickets in the field, or null when the event has none
 * @param props.isLive - Whether the live tag is lit
 * @param props.clock - The race clock
 * @param props.size - `focus` for the full-screen mode's larger type
 * @param props.tierSlot - Stands in for the static tier label when given
 * @param props.className - Extra classes, e.g. the stage font variable
 * @returns The bar
 */
export function RaceBroadcastBar({
  prize,
  entrantCount,
  ticketCount,
  isLive,
  clock,
  size = "default",
  tierSlot,
  className,
}: RaceBroadcastBarProps) {
  const TierIcon = PRIZE_TIER_ICON[prize.tier];

  return (
    <header data-slot="cat-race-hud" data-size={size} className={cn("race-bar", className)}>
      <span className="race-live race-display" data-on={isLive}>
        <i aria-hidden />
        TRỰC TIẾP
      </span>
      {tierSlot ?? (
        <span className="race-tier" data-tier={prize.tier}>
          <TierIcon aria-hidden className="size-4" />
          {PRIZE_TIER_LABEL[prize.tier]} · {prize.name}
        </span>
      )}
      <span className="race-meta">
        {entrantCount} người{ticketCount === null ? "" : ` · ${ticketCount} vé`}
      </span>
      <RaceClockDisplay clock={clock} />
    </header>
  );
}
