import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { GUILD_LEADERS, type GuildLeader } from "../lib/guild-info";

/** Anchor the hero and the nav can point at. */
export const LEADERSHIP_SECTION_ID = "ban-chi-huy";

/** Ties the section to its heading, so the region carries a name. */
const LEADERSHIP_HEADING_ID = "ban-chi-huy-tieu-de";

/**
 * A leader's picture, falling back to their initials.
 *
 * shadcn's `Avatar` and not `next/image`, and that is the whole point: the files under
 * `public/img/members/` do not exist yet. `AvatarImage` only takes the frame once the picture has
 * loaded, so a missing file leaves the initials in place and the page renders correctly today;
 * dropping a PNG at the path is the only step left. `next/image` would fail at runtime instead.
 * @param leader - Whose picture to draw
 * @param className - Size classes for the frame
 * @returns The avatar
 */
function LeaderAvatar({
  leader,
  className,
}: {
  leader: GuildLeader;
  className: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={leader.avatarSrc} alt={leader.name} />
      <AvatarFallback className="bg-jade/10 font-heading text-jade">
        {leader.initials}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Who runs the guild: the guild master on their own, then the three people beside them.
 *
 * Deliberately not four equal cards. The guild master decides, and the layout should say so before
 * the badge does. The title sits in its own column so this block does not repeat the stacked
 * title-over-content rhythm of the one below it.
 * @returns The leadership block
 */
export function LeadershipSection() {
  const [master, ...officers] = GUILD_LEADERS;

  return (
    <section
      id={LEADERSHIP_SECTION_ID}
      aria-labelledby={LEADERSHIP_HEADING_ID}
      className="grid scroll-mt-20 gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12"
    >
      {/* From `lg` the title keeps the left column and stays beside the people as the page scrolls. */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
        <h2
          id={LEADERSHIP_HEADING_ID}
          className="font-heading text-3xl font-semibold tracking-tight"
        >
          Ban chỉ huy
        </h2>
        <OrnamentDivider stroke="brush" />
      </div>

      <div className="flex flex-col gap-4">
        <article
          data-slot="card"
          data-variant="raised"
          className={cn(
            cardVariants({ variant: "raised" }),
            "items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8"
          )}
        >
          <LeaderAvatar
            leader={master}
            className="size-24 ring-2 ring-jade/40 ring-offset-2 ring-offset-card sm:size-28"
          />
          <div className="flex flex-col gap-2">
            <Badge>{master.role}</Badge>
            <h3 className="font-heading text-2xl font-semibold tracking-tight">
              {master.name}
            </h3>
            <p className="max-w-md text-sm text-pretty text-muted-foreground">
              {master.duty}
            </p>
          </div>
        </article>

        <div className="divide-y rounded-container border bg-card shadow-sm">
          {officers.map((officer) => (
            <article
              key={officer.name}
              className="flex items-center gap-4 p-5 sm:p-6"
            >
              <LeaderAvatar leader={officer} className="size-14 shrink-0" />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold tracking-tight">
                    {officer.name}
                  </h3>
                  <Badge variant="secondary">{officer.role}</Badge>
                </div>
                <p className="text-sm text-pretty text-muted-foreground">
                  {officer.duty}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
