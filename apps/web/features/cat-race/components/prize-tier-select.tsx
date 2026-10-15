"use client";

import type { PrizeTier } from "@guild/shared/enums";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIZE_TIER_OPTIONS } from "../lib/prize-tier-style";
import { PrizeTierBadge } from "./prize-tier-badge";

interface PrizeTierSelectProps {
  /** Accessible name of the trigger; the trigger itself shows only the tier icon */
  label: string;
  value: PrizeTier;
  onChange: (tier: PrizeTier) => void;
}

/**
 * Tier picker that takes the room of one icon: the list names each tier, the trigger shows its badge.
 * @param label - Accessible name of the trigger
 * @param value - Selected tier
 * @param onChange - Receives the picked tier
 * @returns The picker
 */
export function PrizeTierSelect({ label, value, onChange }: PrizeTierSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as PrizeTier)}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue>{(tier: PrizeTier) => <PrizeTierBadge tier={tier} />}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {PRIZE_TIER_OPTIONS.map(({ value: tier, label: tierLabel, icon: Icon }) => (
          <SelectItem key={tier} value={tier}>
            {/* ItemText is a bare flex row with no cross-axis alignment, so the icon needs its own. */}
            <span className="flex items-center gap-2">
              <Icon />
              {tierLabel}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
