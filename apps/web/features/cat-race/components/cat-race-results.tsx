import type { CatRaceEventDetail } from "@guild/shared/schemas";

import { prizesByTier } from "../lib/results-order";
import { PrizeResult } from "./prize-result";

interface CatRaceResultsProps {
  event: CatRaceEventDetail;
}

/**
 * The finished event as a results board: a summary strip, then every prize with its winners, the
 * most valuable tier first. No race area and no controls - the event can no longer change.
 * @param event - The ended event
 * @returns The results board
 */
export function CatRaceResults({ event }: CatRaceResultsProps) {
  const prizes = prizesByTier(event.prizes);
  const awarded = event.prizes.reduce((sum, prize) => sum + prize.awardedCount, 0);
  const quantity = event.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const voided = event.rounds.filter((round) => round.voidedAt !== null).length;

  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="Tổng kết đợt đua"
        className="flex flex-wrap gap-x-6 gap-y-1 text-base text-muted-foreground tabular-nums"
      >
        <li>{event.participants.length} người tham gia</li>
        <li>
          {awarded}/{quantity} giải đã trao
        </li>
        {voided > 0 ? <li>{voided} vòng huỷ</li> : null}
      </ul>
      <div className="grid gap-4 md:grid-cols-2">
        {prizes.map((prize, index) => (
          <PrizeResult key={prize.id} event={event} prize={prize} index={index} />
        ))}
      </div>
    </div>
  );
}
