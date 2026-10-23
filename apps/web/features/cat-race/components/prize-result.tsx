import { PRIZE_TIER_LABEL, PrizeTier } from "@guild/shared/enums";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { REVEAL_CLASS, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PRIZE_TIER_CLASS } from "../lib/prize-tier-style";
import { roundsOf } from "../lib/results-order";
import { PrizeTierBadge } from "./prize-tier-badge";
import { ResultWinnerRow } from "./result-winner-row";

interface PrizeResultProps {
  event: CatRaceEventDetail;
  prize: CatRacePrize;
  /** Position on the board, for the reveal delay */
  index: number;
}

/**
 * One prize block of the results board: its tier, how many went out, and the winners. The top
 * tier spans the full row and shows its winners larger.
 * @param event - The event
 * @param prize - The prize
 * @param index - Position on the board
 * @returns The block
 */
export function PrizeResult({ event, prize, index }: PrizeResultProps) {
  const rounds = roundsOf(event.rounds, prize.id);
  const isFeatured = prize.tier === PrizeTier.HIGH;

  return (
    <section
      style={revealStyle(index)}
      className={cn(
        "flex flex-col gap-3 rounded-container border-2 p-4",
        PRIZE_TIER_CLASS[prize.tier],
        REVEAL_CLASS,
        isFeatured && "md:col-span-2"
      )}
    >
      <div className="flex items-center gap-3">
        <PrizeTierBadge tier={prize.tier} className="size-9" />
        <div className="min-w-0">
          <h3 className="truncate font-heading text-xl font-semibold">{prize.name}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {PRIZE_TIER_LABEL[prize.tier]} · {prize.awardedCount}/{prize.quantity}
          </p>
        </div>
      </div>
      {rounds.length === 0 ? (
        <p className="text-muted-foreground">Không trao giải nào.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rounds.map((round) => (
            <ResultWinnerRow
              key={round.id}
              round={round}
              participant={event.participants.find((p) => p.characterId === round.winnerCharacterId)}
              isFeatured={isFeatured}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
