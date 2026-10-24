import type { FeaturedRace } from "@guild/shared/schemas";
import { Trophy } from "lucide-react";

import { OrnamentDivider } from "@/components/shared/ornament-divider";

import { FeaturedRaceCard } from "./featured-race-card";

const FEATURED_HEADING_ID = "bang-vang-tieu-de";

interface FeaturedRacesProps {
  /** Featured races, newest first; at most a handful */
  races: FeaturedRace[];
}

/**
 * The Bảng vàng: the cat races the guild chose to show, and the page's showpiece. A centred title
 * with a gold ornament opens it; the newest race is the large card, older ones stack beside it on
 * a wide screen, and on a phone everything stacks, newest on top. A single race takes the whole
 * width.
 *
 * The soft gold wash behind the title is decoration on the page surface, not on a card.
 * @param races - Featured races, newest first
 * @returns The block, or nothing when there is no race to show
 */
export function FeaturedRaces({ races }: FeaturedRacesProps) {
  if (races.length === 0) return null;

  const [lead, ...older] = races;

  return (
    <section
      aria-labelledby={FEATURED_HEADING_ID}
      className="relative flex flex-col gap-8 py-4 sm:py-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_70%)]"
      />
      <header className="relative flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full border border-gold bg-gold/15 text-gold-ink"
        >
          <Trophy className="size-6" />
        </span>
        <h2
          id={FEATURED_HEADING_ID}
          className="font-heading text-4xl font-semibold tracking-tight text-gold-ink sm:text-5xl"
        >
          Bảng vàng
        </h2>
        <OrnamentDivider tone="gold" align="center" className="w-48" />
      </header>
      <div className="relative grid gap-4 lg:grid-cols-3">
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
