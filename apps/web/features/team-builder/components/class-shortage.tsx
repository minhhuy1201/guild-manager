import Image from "next/image";
import { GUILD_CLASS_LABEL } from "@shared/enums";

import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { countByGuildClass } from "../lib/class-shortage";
import type { PoolCandidate } from "../lib/pool";

interface ClassShortageProps {
  /** Members still available to place */
  pool: PoolCandidate[];
}

/**
 * A row of "class × how many are still unplaced", so the arranger can tell at a
 * glance what is left to spread across teams.
 * @param pool - Members still available to place
 * @returns The counter row, or nothing when everybody is placed
 */
export function ClassShortage({ pool }: ClassShortageProps) {
  const counts = countByGuildClass(pool);
  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground">Chưa xếp:</span>
      {counts.map(({ guildClass, count }) => (
        <span
          key={guildClass}
          className="flex items-center gap-1.5 text-xs"
          title={GUILD_CLASS_LABEL[guildClass]}
        >
          <Image
            src={GUILD_CLASS_IMAGE[guildClass]}
            alt={GUILD_CLASS_LABEL[guildClass]}
            width={16}
            height={16}
            className="size-4 rounded-sm object-cover"
          />
          <span className="font-medium">{count}</span>
        </span>
      ))}
    </div>
  );
}
