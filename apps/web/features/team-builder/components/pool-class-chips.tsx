"use client";

import { GUILD_CLASS_LABEL, type GuildClass } from "@guild/shared/enums";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { cn } from "@/lib/utils";
import type { GuildClassCount } from "../lib/pool";

interface PoolClassChipsProps {
  /** Members left per class, in display order, zero classes already dropped */
  counts: GuildClassCount[];
  /** Classes the pool is filtered to right now */
  selected: GuildClass[];
  /** Turn one class on or off in the filter */
  onToggle: (guildClass: GuildClass) => void;
}

/**
 * One chip per guild class still in the pool, with how many are left of it: a formation is built
 * by class, so "how many Tố Vấn do I still have" is the question asked at every slot. Pressing a
 * chip toggles that class in the pool's class filter, the same filter the select above writes.
 *
 * The class shows as its icon, name in the tooltip and in the chip's accessible name (§6: a class
 * is never written out in a narrow row). A chip in the filter takes the selected surface.
 * @param counts - Members left per class
 * @param selected - Classes the pool is filtered to
 * @param onToggle - Turn one class on or off
 * @returns The chip row, or nothing when the pool is empty
 */
export function PoolClassChips({
  counts,
  selected,
  onToggle,
}: PoolClassChipsProps) {
  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.map(({ guildClass, count }) => {
        const isSelected = selected.includes(guildClass);

        return (
          <button
            key={guildClass}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${GUILD_CLASS_LABEL[guildClass]}: ${count} người`}
            onClick={() => onToggle(guildClass)}
            className={cn(
              // `max-sm:h-10` like the button scale: 44px on a phone, where it measured 40px.
              "inline-flex h-9 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-medium tabular-nums outline-none max-sm:h-10",
              "transition-colors duration-[var(--duration-fast)] focus-visible:ring-3 focus-visible:ring-ring/50",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-foreground/5"
            )}
          >
            <GuildClassIcon guildClass={guildClass} />
            {count}
          </button>
        );
      })}
    </div>
  );
}
