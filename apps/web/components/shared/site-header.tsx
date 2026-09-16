import Link from "next/link";

import { canManageGuild } from "@guild/shared/lib";

import { GuildSeal } from "@/components/shared/guild-seal";
import { MainNav } from "@/components/shared/main-nav";
import { MobileTabBar } from "@/components/shared/mobile-tab-bar";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { UserMenu } from "@/features/auth";
import { fetchMe, getSession } from "@/features/auth/server";

/**
 * Layout of the brand block, shared by its link and its plain-text form. The padding, cancelled by
 * an equal negative margin, grows the touch target past the seal without moving anything: below
 * `lg` the seal alone is the home link, and it is smaller than a finger.
 */
const BRAND =
  "-m-1 flex min-w-0 items-center gap-3 rounded-lg p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * The guild's seal and name, with the game's name as a small caption once there is room for it.
 * @returns The seal next to "Mèo Mập Giang Hồ"
 */
function GuildName() {
  return (
    <>
      <GuildSeal />
      {/* Below `lg` the header has no room for it: under `sm` it is the seal and the avatar only
          (the nav moves to the tab bar at the bottom), and from `sm` to `lg` the nav takes the row,
          which squeezed the name to nothing and broke 逆水寒 into one glyph per line. "Mèo ..."
          cut short reads worse than the seal alone - so the name drops to screen readers only,
          which keeps the home link named. */}
      <span className="sr-only min-w-0 flex-col leading-tight lg:not-sr-only lg:flex">
        <span className="truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
          Mèo Mập Giang Hồ
        </span>
        {/* `lang` so the browser picks a Chinese face for the glyphs rather than a Vietnamese one. */}
        <span
          lang="zh"
          className="hidden text-xs tracking-[0.3em] text-muted-foreground lg:block"
        >
          逆水寒
        </span>
      </span>
    </>
  );
}

/**
 * The app's top header: the guild name "Mèo Mập Giang Hồ" and, once signed in, the main nav - in
 * the header from `sm` up, in the tab bar at the bottom of a phone's screen below it. A visitor gets
 * the guild's public page behind the mark and a way to sign in.
 * Reads the session on the server to decide whether to show the nav at all, and whether it carries
 * the admin items.
 * @returns The styled header, followed by the phone's tab bar when signed in
 */
export async function SiteHeader() {
  const session = await getSession();
  // The login page renders this header too, so a broken session just means "signed out".
  const me = session ? await fetchMe().catch(() => null) : null;
  const isAdmin = session ? canManageGuild(session.role) : false;

  return (
    <>
      {/* Not sticky on a short screen (a phone turned sideways): pinned there, it and the save
          bar took about 40% of the height. */}
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur [@media(max-height:500px)]:static">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          {/* Signed in the mark leads to the week's attendance, signed out to the guild's public
              page - the one route besides the login screen a visitor can actually reach. */}
          <Link
            href={session ? ROUTES.attendance : ROUTES.landing}
            className={BRAND}
          >
            <GuildName />
          </Link>
          {/* Signed out there is nothing to navigate between, only a way in. */}
          {!session && (
            <div className="ml-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={ROUTES.login} />}
              >
                Đăng nhập
              </Button>
            </div>
          )}
          {session && (
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <MainNav isAdmin={isAdmin} />
              <UserMenu
                label={me?.character?.name ?? me?.discordUsername ?? null}
                discordId={session.discordId}
                avatarHash={me?.discordAvatar ?? null}
              />
            </div>
          )}
        </div>
      </header>
      {/* A sibling of the header, not a child: the header's backdrop blur would become the
          containing block of the bar's `position: fixed` and pin it to the header instead of the
          bottom of the screen. */}
      {session && <MobileTabBar isAdmin={isAdmin} />}
    </>
  );
}
