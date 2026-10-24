import { PRIZE_TIER_LABEL } from "@guild/shared/enums";
import { vnParts } from "@guild/shared/lib";
import type { FeaturedRace, FeaturedRacePrize } from "@guild/shared/schemas";
import { CalendarDays, Users } from "lucide-react";

import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { groupPrizesByTier } from "../lib/group-prizes-by-tier";
import { FeaturedPrizeItem } from "./featured-prize-item";

/**
 * The end day as dd/MM/yyyy in Vietnam time. The server renders in UTC, so the runtime's own zone
 * would show a late-evening end a day early.
 */
function formatEndDate(iso: string) {
  const { day, month, year } = vnParts(new Date(iso));

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** Winners across some prizes; the entrance staggers by this running count. */
function countWinners(prizes: readonly FeaturedRacePrize[]) {
  return prizes.reduce((total, prize) => total + prize.winners.length, 0);
}

interface FeaturedRaceCardProps {
  /** The race to show */
  race: FeaturedRace;
  /** The newest race gets the larger title */
  isLead: boolean;
}

/**
 * One Featured race: its name, when it ended, how many took part, and who won what, prizes grouped
 * under their tier, the HIGH tier first.
 * @param race - The race to show
 * @param isLead - Whether this is the newest race
 * @returns The race card
 */
export function FeaturedRaceCard({ race, isLead }: FeaturedRaceCardProps) {
  const groups = groupPrizesByTier(race.prizes);

  return (
    <article
      data-slot="card"
      data-variant="default"
      className={cn(cardVariants(), "gap-5 p-5 sm:p-6", isLead && "shadow-lg")}
    >
      <header className="flex flex-col gap-2">
        <h3
          className={cn(
            "font-heading font-semibold tracking-tight",
            isLead ? "text-3xl" : "text-xl"
          )}
        >
          {race.name}
        </h3>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-4" />
            Kết thúc {formatEndDate(race.endedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden className="size-4" />
            {race.participantCount} người tham gia
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {groups.map(({ tier, prizes }, groupIndex) => {
          const groupStart = countWinners(
            groups.slice(0, groupIndex).flatMap((group) => group.prizes)
          );

          return (
            <section key={tier} className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Giải {PRIZE_TIER_LABEL[tier]}
              </h4>
              <ul className="flex flex-col gap-2">
                {prizes.map((prize, index) => (
                  <FeaturedPrizeItem
                    key={`${prize.name}-${index}`}
                    prize={prize}
                    firstWinnerIndex={
                      groupStart + countWinners(prizes.slice(0, index))
                    }
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
