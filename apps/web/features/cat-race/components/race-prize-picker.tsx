import { PRIZE_TIER_LABEL } from "@guild/shared/enums";
import type { CatRaceEventDetail, CatRacePrize } from "@guild/shared/schemas";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { PRIZE_LOCK_LABEL, prizeLockReason } from "../lib/prize-lock";
import { PRIZE_TIER_ICON } from "../lib/prize-tier-style";

interface RacePrizePickerProps {
  event: CatRaceEventDetail;
  /** Prize the next round is for */
  prize: CatRacePrize;
  /** True while a round is drawing, racing or showing its result */
  disabled: boolean;
  onSelect: (prizeId: string) => void;
}

/**
 * The broadcast bar's tier label as a select over every prize: a prize that cannot be raced for
 * stays in the list, dimmed, with the reason in words.
 * @param event - The event
 * @param prize - Prize the next round is for
 * @param disabled - Whether the choice is locked
 * @param onSelect - Chooses the prize for the next round
 * @returns The picker
 */
export function RacePrizePicker({ event, prize, disabled, onSelect }: RacePrizePickerProps) {
  const TierIcon = PRIZE_TIER_ICON[prize.tier];

  return (
    <Select
      value={prize.id}
      disabled={disabled}
      onValueChange={(prizeId) => prizeId && onSelect(prizeId)}
    >
      <SelectTrigger
        aria-label="Chọn hạng mục"
        data-tier={prize.tier}
        className="race-tier h-auto w-fit bg-transparent py-[inherit] pr-2 pl-[inherit] text-[length:inherit] font-[inherit] dark:bg-transparent dark:hover:bg-transparent"
      >
        <TierIcon aria-hidden className="size-4" />
        {PRIZE_TIER_LABEL[prize.tier]} · {prize.name}
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {event.prizes.map((option) => {
          const lock = prizeLockReason(option, event.status);

          return (
            <SelectItem key={option.id} value={option.id} disabled={lock !== null}>
              <span>
                {PRIZE_TIER_LABEL[option.tier]} · {option.name}
              </span>
              {lock ? (
                <span className="text-xs text-muted-foreground">{PRIZE_LOCK_LABEL[lock]}</span>
              ) : null}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
