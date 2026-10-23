import Link from "next/link";

import { Capability } from "@guild/shared/enums";
import { can } from "@guild/shared/lib";

import { GuildSeal } from "@/components/shared/guild-seal";
import { HeaderLoginButton } from "@/components/shared/header-login-button";
import { MainNav } from "@/components/shared/main-nav";
import { MobileTabBar } from "@/components/shared/mobile-tab-bar";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { ROUTES } from "@/config/routes";
import { UserMenu } from "@/features/auth";
import { getActor, getMe } from "@/features/auth/server";
import { APP_SHELL_WIDTH } from "@/lib/layout";
import { PAGE_NAV_TRANSITION } from "@/lib/page-transition";
import { cn } from "@/lib/utils";

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
 * Reads the actor on the server to decide whether to show the nav at all, and which items it
 * carries. The theme switch sits right of the brand for everyone, signed in or not.
 * @returns The styled header, followed by the phone's tab bar when signed in
 */
export async function SiteHeader() {
  // The login page renders this header too, so a broken session just means "signed out".
  // The actor carries the role and Grants `/auth/me` reports today, not the token's older role, and
  // shares that one read with `getMe` below and with the page being rendered.
  const actor = await getActor();
  const meResult = actor ? await getMe() : null;
  const me = meResult?.ok ? meResult.data : null;

  return (
    <>
      {/* Not sticky on a short screen (a phone turned sideways): pinned there, it and the save
          bar took about 40% of the height.
          `dark` in both themes: the header is an ink-navy band framing the page, which is what
          lifts it off the light plane. Scoping the dark tokens to it (rather than a set of header
          tokens) keeps the nav, the seal and the avatar on the palette they already use.
          `text-foreground` again because `color` inherits as a value from the body, not as the
          variable.
          `z-40`: above every layer the page itself raises (sticky table columns, the save bar at
          z-20, overlays at z-10) - on equal z-index the page, later in the DOM, paints over the
          header. Below the portalled popups and dialogs at z-50. */}
      <header
        style={{ viewTransitionName: "site-header" }}
        className="dark sticky top-0 z-40 border-b border-white/10 bg-card/85 text-foreground shadow-[inset_0_-1px_0_0_rgb(255_255_255/0.04),0_8px_24px_-12px_rgb(0_0_0/0.5)] backdrop-blur-xl backdrop-saturate-150 [@media(max-height:500px)]:static"
      >
        <div
          className={cn(
            "mx-auto flex h-14 items-center gap-3 px-4 sm:px-6",
            APP_SHELL_WIDTH
          )}
        >
          {/* Signed in the mark leads to the week's attendance, signed out to the guild's public
              page - the one route besides the login screen a visitor can actually reach. */}
          <Link
            href={actor ? ROUTES.attendance : ROUTES.landing}
            transitionTypes={PAGE_NAV_TRANSITION}
            className={BRAND}
          >
            <GuildName />
          </Link>
          <ThemeSwitch />
          {/* Signed out there is nothing to navigate between, only a way in. */}
          {!actor && (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <HeaderLoginButton />
            </div>
          )}
          {actor && (
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <MainNav actor={actor} />
              <UserMenu
                label={me?.character?.name ?? me?.discordUsername ?? null}
                discordId={actor.discordId}
                avatarHash={me?.discordAvatar ?? null}
                canRaceCats={can(actor, Capability.CAT_RACE)}
              />
            </div>
          )}
        </div>
      </header>
      {/* A sibling of the header, not a child: the header's backdrop blur would become the
          containing block of the bar's `position: fixed` and pin it to the header instead of the
          bottom of the screen. */}
      {actor && <MobileTabBar actor={actor} />}
    </>
  );
}
