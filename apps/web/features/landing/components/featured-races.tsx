import type { FeaturedRace } from "@guild/shared/schemas";
import { Trophy } from "lucide-react";

import { FeaturedRaceCard } from "./featured-race-card";

interface FeaturedRacesProps {
  /** Featured races, newest first; at most a handful */
  races: FeaturedRace[];
}

/**
 * The Bảng vàng: the cat races the guild chose to show. The newest is the large card; older ones
 * stack beside it on a wide screen, and on a phone everything stacks, newest on top. A single race
 * takes the whole width.
 * @param races - Featured races, newest first
 * @returns The block, or nothing when there is no race to show
 */
export function FeaturedRaces({ races }: FeaturedRacesProps) {
  if (races.length === 0) return null;

  const [lead, ...older] = races;

  return (
    <section aria-labelledby="featured-races-title" className="flex flex-col gap-4">
      <h2
        id="featured-races-title"
        className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight"
      >
        <Trophy aria-hidden className="size-6 text-gold" />
        Bảng vàng
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={older.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <FeaturedRaceCard race={lead} isLead />
        </div>
        {older.length > 0 && (
          <div className="flex flex-col gap-4">
            {older.map((race) => (
              <FeaturedRaceCard key={race.id} race={race} isLead={false} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
