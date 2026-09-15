import { BannerImage } from "@/components/shared/banner-image";
import { LANDING_PILLAR } from "@/lib/page-banners";

import { GUILD_PILLARS } from "../lib/guild-info";

/** Width hint for the picture in the wide cell: two thirds of the shell at most. */
const PILLAR_SIZES = "(min-width: 768px) 66vw, 100vw";

/**
 * What the guild is, in three claims.
 *
 * A bento with exactly three cells for exactly three claims, and three different surfaces: the first
 * carries a scene from the game, the second the gold of the season's goal, the third the plain card.
 * Three identical white tiles would say the same words and mean nothing.
 * @returns The pillars block
 */
export function GuildPillars() {
  const [lead, goal, discipline] = GUILD_PILLARS;
  const LeadIcon = lead.icon;
  const GoalIcon = goal.icon;
  const DisciplineIcon = discipline.icon;

  return (
    // One column on a phone; from `md` the wide cell takes two thirds and both rows.
    <section className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
      <article
        className="relative flex min-h-64 flex-col justify-end overflow-hidden rounded-2xl md:col-span-2 md:row-span-2"
        style={{ backgroundColor: LANDING_PILLAR.tint }}
      >
        <BannerImage
          src={LANDING_PILLAR.src}
          objectPosition={LANDING_PILLAR.objectPosition}
          sizes={PILLAR_SIZES}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/80 via-black/45 to-black/10"
        />
        <div className="relative flex flex-col gap-3 p-6 sm:p-8">
          <LeadIcon aria-hidden className="size-6 text-jade" />
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-white">
            {lead.title}
          </h2>
          <p className="max-w-md text-sm text-pretty text-white/85">
            {lead.body}
          </p>
        </div>
      </article>

      <article className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-6">
        <GoalIcon aria-hidden className="size-6 text-gold" />
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {goal.title}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{goal.body}</p>
      </article>

      <article className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <DisciplineIcon aria-hidden className="size-6 text-jade" />
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {discipline.title}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {discipline.body}
        </p>
      </article>
    </section>
  );
}
