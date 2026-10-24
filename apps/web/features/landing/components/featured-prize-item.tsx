import { PrizeTier } from "@guild/shared/enums";
import type { FeaturedRacePrize } from "@guild/shared/schemas";
import { Medal } from "lucide-react";
import type { CSSProperties } from "react";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { cn } from "@/lib/utils";

interface FeaturedPrizeItemProps {
  /** The prize and its winners */
  prize: FeaturedRacePrize;
  /** Position of the prize's first winner among all winners of the card, for the entrance stagger */
  firstWinnerIndex: number;
}

/**
 * One prize of a Featured race with the people who won it. Gold marks the HIGH tier only (border,
 * medal, a one-off sheen from `globals.css`) - a tier, never a state.
 * @param prize - The prize and its winners
 * @param firstWinnerIndex - Where the prize's winners start in the card's run of winners
 * @returns The prize row
 */
export function FeaturedPrizeItem({
  prize,
  firstWinnerIndex,
}: FeaturedPrizeItemProps) {
  const isHigh = prize.tier === PrizeTier.HIGH;

  return (
    <li
      data-slot="featured-prize"
      data-tier={prize.tier}
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-inner border p-3",
        isHigh && "border-2 border-gold bg-gold/15 p-4"
      )}
    >
      {isHigh && (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-[var(--glow-gold)]"
        >
          <Medal className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className={cn("font-medium", isHigh && "text-lg")}>{prize.name}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {prize.winners.map((winner, position) => (
            <li
              key={`${winner.name}-${position}`}
              data-slot="featured-winner"
              style={{ "--i": firstWinnerIndex + position } as CSSProperties}
              className="flex items-center gap-2 text-sm"
            >
              <GuildClassIcon guildClass={winner.guildClass} />
              {winner.name}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
