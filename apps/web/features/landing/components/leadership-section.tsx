import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { GUILD_LEADERS, type GuildLeader } from "../lib/guild-info";

/** Anchor the hero and the nav can point at. */
export const LEADERSHIP_SECTION_ID = "ban-chi-huy";

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
 * the badge does.
 * @returns The leadership block
 */
export function LeadershipSection() {
  const [master, ...officers] = GUILD_LEADERS;

  return (
    <section
      id={LEADERSHIP_SECTION_ID}
      className="flex flex-col gap-6 scroll-mt-20"
    >
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Ban chỉ huy
        </h2>
        <OrnamentDivider />
      </div>

      {/* One column on a phone; from `md` the guild master keeps the left third. */}
      <div className="grid gap-4 md:grid-cols-3">
        <article className="flex flex-col items-start gap-4 rounded-2xl border border-gold/40 bg-gold/5 p-6">
          <LeaderAvatar leader={master} className="size-24" />
          <div className="flex flex-col gap-2">
            {/* `text-foreground`, not `text-gold-foreground`: that token is the ink for a solid
                gold fill, and on this /15 tint it goes unreadable in dark mode. */}
            <Badge
              variant="outline"
              className="border-gold/50 bg-gold/15 text-foreground"
            >
              {master.role}
            </Badge>
            <h3 className="font-heading text-xl font-semibold tracking-tight">
              {master.name}
            </h3>
            <p className="text-sm text-pretty text-muted-foreground">
              {master.duty}
            </p>
          </div>
        </article>

        <div className="divide-y rounded-2xl border bg-card md:col-span-2">
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
