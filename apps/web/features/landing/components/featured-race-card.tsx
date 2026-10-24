import { PRIZE_TIER_LABEL, PrizeTier } from "@guild/shared/enums";
import type { FeaturedRace } from "@guild/shared/schemas";
import { CalendarDays, Users } from "lucide-react";

import { GuildClassIcon } from "@/components/shared/guild-class-icon";
import { cardVariants } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { groupPrizesByTier } from "../lib/group-prizes-by-tier";

/** The guild's zone: the server renders in UTC, which would show a late-evening end a day early. */
const GUILD_TIME_ZONE = "Asia/Ho_Chi_Minh";

interface FeaturedRaceCardProps {
  /** The race to show */
  race: FeaturedRace;
  /** The newest race gets the larger title */
  isLead: boolean;
}

/**
 * One Featured race: its name, when it ended, how many took part, and who won what, prizes grouped
 * under their tier. Gold marks the HIGH prize only - a tier, never a state.
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
      className={cn(cardVariants(), "gap-4 p-5 sm:p-6")}
    >
      <header className="flex flex-col gap-2">
        <h3
          className={cn(
            "font-heading font-semibold tracking-tight",
            isLead ? "text-2xl" : "text-xl"
          )}
        >
          {race.name}
        </h3>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden className="size-4" />
            Kết thúc {formatDate(race.endedAt, GUILD_TIME_ZONE)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden className="size-4" />
            {race.participantCount} người tham gia
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {groups.map(({ tier, prizes }) => (
          <section key={tier} className="flex flex-col gap-2">
            <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Giải {PRIZE_TIER_LABEL[tier]}
            </h4>
            <ul className="flex flex-col gap-2">
              {prizes.map((prize, index) => (
                <li
                  key={`${prize.name}-${index}`}
                  className={cn(
                    "rounded-inner border p-3",
                    tier === PrizeTier.HIGH && "border-gold bg-gold/15"
                  )}
                >
                  <p className="font-medium">{prize.name}</p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                    {prize.winners.map((winner, winnerIndex) => (
                      <li
                        key={`${winner.name}-${winnerIndex}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <GuildClassIcon guildClass={winner.guildClass} />
                        {winner.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
