"use client";

import { Ban } from "lucide-react";
import { CatRaceMode } from "@guild/shared/enums";
import type { CatRaceEventDetail, CatRaceRound } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WinnersPanelProps {
  event: CatRaceEventDetail;
  /** Voiding is off once the event ended */
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
  const isTicketMode = event.mode === CatRaceMode.TICKET;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Người thắng đợt này</h2>
      {event.prizes.map((prize) => {
        const rounds = event.rounds.filter((round) => round.prizeId === prize.id);

        return (
          <div key={prize.id} className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">
              {prize.name}{" "}
              <span className="text-muted-foreground">
                {prize.awardedCount}/{prize.quantity}
              </span>
            </h3>
            {rounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có người thắng.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {rounds.map((round) => (
                  <li key={round.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("truncate", round.voidedAt && "line-through text-muted-foreground")}>
                        {round.winnerName}
                        {isTicketMode ? (
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            · {round.winnerTickets}/{round.totalTickets} vé
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            · giữa {round.entrantCount} người
                          </span>
                        )}
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
    </section>
  );
}
