import Link from "next/link";
import { Cat } from "lucide-react";

import { canManageGuild } from "@guild/shared/lib";

import { MainNav } from "@/components/shared/main-nav";
import { ROUTES } from "@/config/routes";
import { UserMenu } from "@/features/auth";
import { fetchMe, getSession } from "@/features/auth/server";

/**
 * The app's top header: the guild name "Mèo Mập Giang Hồ" and the main nav.
 * Reads the session on the server to decide whether to show the admin nav items.
 * @returns The styled header
 */
export async function SiteHeader() {
  const session = await getSession();
  // The login page renders this header too, so a broken session just means "signed out".
  const me = session ? await fetchMe().catch(() => null) : null;

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Link
          href={ROUTES.attendance}
          className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cat className="size-6" />
          </span>
          <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
            Mèo Mập Giang Hồ
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <MainNav isAdmin={session ? canManageGuild(session.role) : false} />
          {session && (
            <UserMenu
              label={me?.character?.name ?? me?.discordUsername ?? null}
              discordId={session.discordId}
              avatarHash={me?.discordAvatar ?? null}
            />
          )}
        </div>
      </div>
    </header>
  );
}
