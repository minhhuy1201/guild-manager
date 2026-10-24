import { BannerImage } from "@/components/shared/banner-image";
import { cardVariants } from "@/components/ui/card";
import { LANDING_PILLAR } from "@/lib/page-banners";
import { cn } from "@/lib/utils";

import { GUILD_PILLARS } from "../lib/guild-info";

/** Width hint for the picture in the wide cell: two thirds of the shell at most. */
const PILLAR_SIZES = "(min-width: 768px) 66vw, 100vw";

/**
 * What the guild is, in three claims.
 *
 * A bento with exactly three cells for exactly three claims, and three different surfaces: the first
 * carries a scene from the game, the second a raised card for the season's goal (jade glow: gold
 * never sits on a raised card), the third the plain card. Each cell is an `<article>` wearing the
 * card styles, so the three claims keep the same semantics.
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
    //
    // `aria-label` because this is the one block with no heading of its own: its three claims are
    // three `<h2>`, none of which names the set. A `<section>` is only a landmark once it has an
    // accessible name, and every other block on the page gets one from its own heading.
    <section
      aria-label="Định hướng của bang"
      className="grid gap-4 md:grid-cols-3 md:grid-rows-2"
    >
      <article
        className="relative flex min-h-72 flex-col justify-end overflow-hidden rounded-container shadow-md md:col-span-2 md:row-span-2 md:min-h-[26rem]"
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
          {/* White, not `text-jade`: jade is a page-surface accent and at either theme's lightness
              it goes dim against the scrim, where every other mark on this picture is white. */}
          <LeadIcon aria-hidden className="size-8 text-white/85" />
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {lead.title}
          </h2>
          <p className="max-w-md text-base text-pretty text-white/85">
            {lead.body}
          </p>
        </div>
      </article>

      <article
        data-slot="card"
        data-variant="raised"
        className={cn(
          cardVariants({ variant: "raised" }),
          "relative gap-3 overflow-hidden p-6"
        )}
      >
        {/* A watermark of the card's own icon: depth for a card that is otherwise text on a plane. */}
        <GoalIcon
          aria-hidden
          className="pointer-events-none absolute -right-4 -bottom-4 size-28 text-jade/10"
        />
        <GoalIcon aria-hidden className="relative size-6 text-jade" />
        <h2 className="relative font-heading text-xl font-semibold tracking-tight">
          {goal.title}
        </h2>
        <p className="relative text-sm text-pretty text-muted-foreground">
          {goal.body}
        </p>
      </article>

      <article
        data-slot="card"
        data-variant="default"
        className={cn(cardVariants(), "gap-3 border-t-2 border-t-jade/60 p-6")}
      >
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
