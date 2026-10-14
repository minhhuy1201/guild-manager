"use client";

import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRIZE_LOCK_LABEL, prizeLockReason } from "../lib/prize-lock";
import { PRIZE_TIER_CLASS } from "../lib/prize-tier-style";
import { PrizeTierBadge } from "./prize-tier-badge";

interface PrizeChipsProps {
  event: CatRaceEventDetail;
  selectedPrizeId: string | null;
  /** Writes are off once the event ended or while a round runs */
  canEdit: boolean;
  onSelect: (prize: CatRacePrize) => void;
  onEdit: (prize: CatRacePrize) => void;
  onDelete: (prize: CatRacePrize) => void;
  onAdd: () => void;
}

/**
 * The prize selector: one chip per prize with `awarded/quantity`, its tier colour and, in words,
 * why it cannot be drawn right now. A prize with no round at all can also be deleted.
 * @param event - The event
 * @param selectedPrizeId - Prize chosen for the next round
 * @param canEdit - Whether edit, delete and add show
 * @param onSelect - Chooses the prize for the next round
 * @param onEdit - Opens the prize form
 * @param onDelete - Opens the delete confirmation
 * @param onAdd - Opens the add form
 * @returns The chip row
 */
export function PrizeChips({
  event,
  selectedPrizeId,
  canEdit,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
}: PrizeChipsProps) {
  return (
    <ul className="flex flex-wrap items-stretch gap-2">
      {event.prizes.map((prize) => {
        const lock = prizeLockReason(prize, event.status);
        const hasRounds = event.rounds.some((round) => round.prizeId === prize.id);

        return (
          <li
            key={prize.id}
            className={cn(
              "flex items-center rounded-lg border-2 transition-colors duration-[var(--duration-fast)]",
              PRIZE_TIER_CLASS[prize.tier],
              prize.id === selectedPrizeId && "ring-3 ring-primary/60"
            )}
          >
            <button
              type="button"
              aria-pressed={prize.id === selectedPrizeId}
              className="flex min-h-10 items-center gap-2 px-3 py-1.5 text-left"
              onClick={() => onSelect(prize)}
            >
              <PrizeTierBadge tier={prize.tier} isNamed />
              <span className="flex flex-col items-start">
                <span className="font-medium">
                  {prize.name} {prize.awardedCount}/{prize.quantity}
                </span>
                {lock ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="size-3" />
                    {PRIZE_LOCK_LABEL[lock]}
                  </span>
                ) : null}
              </span>
            </button>
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sửa hạng mục ${prize.name}`}
                  onClick={() => onEdit(prize)}
                >
                  <Pencil />
                </Button>
                {hasRounds ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xoá hạng mục ${prize.name}`}
                    onClick={() => onDelete(prize)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </>
            ) : null}
          </li>
        );
      })}
      {canEdit ? (
        <li>
          <Button type="button" variant="outline" className="h-full" onClick={onAdd}>
            <Plus />
            Hạng mục
          </Button>
        </li>
      ) : null}
    </ul>
  );
}
