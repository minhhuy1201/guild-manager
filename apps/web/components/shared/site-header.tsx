import Link from "next/link";

import { canManageGuild } from "@guild/shared/lib";

import { GuildSeal } from "@/components/shared/guild-seal";
import { MainNav } from "@/components/shared/main-nav";
import { ROUTES } from "@/config/routes";
import { UserMenu } from "@/features/auth";
import { fetchMe, getSession } from "@/features/auth/server";

/** Layout of the brand block, shared by its link and its plain-text form. */
const BRAND =
  "flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * The guild's seal and name, with the game's name as a small caption once there is room for it.
 * @returns The seal next to "Mèo Mập Giang Hồ"
 */
function GuildName() {
  return (
    <>
      <GuildSeal />
      {/* Below `sm` the nav leaves no room for the name, and "Mèo ..." reads worse than the seal
          alone - so the name drops to screen readers only, which keeps the home link named. */}
      <span className="sr-only min-w-0 flex-col leading-tight sm:not-sr-only sm:flex">
        <span className="truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
          Mèo Mập Giang Hồ
        </span>
        {/* `lang` so the browser picks a Chinese face for the glyphs rather than a Vietnamese one. */}
        <span
          lang="zh"
          className="hidden text-xs tracking-[0.3em] text-muted-foreground sm:block"
        >
          逆水寒
        </span>
      </span>
    </>
  );
}

/**
 * The app's top header: the guild name "Mèo Mập Giang Hồ" and, once signed in, the main nav.
 * Reads the session on the server to decide whether to show the nav at all, and whether it carries
 * the admin items.
 * @returns The styled header
 */
export async function SiteHeader() {
  const session = await getSession();
  // The login page renders this header too, so a broken session just means "signed out".
  const me = session ? await fetchMe().catch(() => null) : null;

  return (
    <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        {/* Signed out the name is plain text: it would otherwise link to a route the proxy
            bounces straight back to the login page. */}
        {session ? (
          <Link href={ROUTES.attendance} className={BRAND}>
            <GuildName />
          </Link>
        ) : (
          <div className={BRAND}>
            <GuildName />
          </div>
        )}
        {/* Signed out there is nowhere to navigate to — every route needs a session — so the
            header is just the guild name. */}
        {session && (
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <MainNav isAdmin={canManageGuild(session.role)} />
            <UserMenu
              label={me?.character?.name ?? me?.discordUsername ?? null}
              discordId={session.discordId}
              avatarHash={me?.discordAvatar ?? null}
            />
          </div>
        )}
      </div>
    </header>
  );
}
