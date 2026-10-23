"use client";

import { Ban } from "lucide-react";
import { PRIZE_TIER_LABEL } from "@guild/shared/enums";
import type { CatRaceEventDetail, CatRaceRound } from "@guild/shared/schemas";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIZE_TIER_CLASS } from "../lib/prize-tier-style";
import { PrizeTierBadge } from "./prize-tier-badge";

interface WinnersPanelProps {
  event: CatRaceEventDetail;
  /** Voiding is off while a race runs */
  canVoid: boolean;
  onVoid: (round: CatRaceRound) => void;
}

/**
 * Winners of the event, grouped by prize. A voided round stays, struck through, with its reason in
 * plain words.
 * @param event - The event
 * @param canVoid - Whether the void button shows
 * @param onVoid - Opens the void dialog for a round
 * @returns The panel
 */
export function WinnersPanel({ event, canVoid, onVoid }: WinnersPanelProps) {
  return (
    <section className="flex flex-col gap-3 rounded-container border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Người thắng đợt này</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {event.prizes.map((prize) => {
          const rounds = event.rounds.filter((round) => round.prizeId === prize.id);

          return (
            <div
              key={prize.id}
              className={cn("flex flex-col gap-2 rounded-inner border-2 p-3", PRIZE_TIER_CLASS[prize.tier])}
            >
              <div className="flex items-center gap-2">
                <PrizeTierBadge tier={prize.tier} />
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{prize.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {PRIZE_TIER_LABEL[prize.tier]} · đã trao {prize.awardedCount}/{prize.quantity}
                  </p>
                </div>
              </div>
              {rounds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có người thắng.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {rounds.map((round) => (
                    <li
                      key={round.id}
                      className="flex items-start justify-between gap-2 rounded-lg bg-card px-2 py-1"
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "flex items-center gap-2",
                            round.voidedAt && "line-through text-muted-foreground"
                          )}
                        >
                          <GuildClassIcon guildClass={round.winnerGuildClass} />
                          <span className="truncate">{round.winnerName}</span>
                        </p>
                        {round.voidedAt ? (
                          <p className="text-xs text-muted-foreground">
                            Đã huỷ: {round.voidReason}
                          </p>
                        ) : null}
                      </div>
                      {canVoid && !round.voidedAt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Huỷ vòng của ${round.winnerName}`}
                          onClick={() => onVoid(round)}
                        >
                          <Ban />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
