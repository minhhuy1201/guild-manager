import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { safeRedirect } from "@guild/shared/lib";

import { BannerImage } from "@/components/shared/banner-image";
import { ErrorNotice } from "@/components/shared/error-notice";
import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Card, CardContent } from "@/components/ui/card";
import { DiscordLoginButton, loginErrorMessage } from "@/features/auth";
import { getSession } from "@/features/auth/server";
import { LOGIN_BACKDROP } from "@/lib/page-banners";

export const metadata: Metadata = {
  title: "Đăng nhập — Mèo Mập Giang Hồ",
  description: "Đăng nhập bằng Discord để điểm danh",
};

/**
 * Route "/dang-nhap" — where signing in starts. A visitor who already has a session is sent on to
 * wherever they were heading rather than shown a form they have no use for.
 * @param props.searchParams - `error` (code from the API) and `redirect` (intended page)
 * @returns The login page
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: target } = await searchParams;

  // Somebody already signed in has nothing to do here, and the Discord bot's "Mở website" button
  // sends every member through this page on its way to attendance. Send them on instead of showing
  // a login form to someone who is logged in. `safeRedirect` because `target` is a query parameter:
  // an unchecked one turns this into an open redirect anyone can hand a member in Discord.
  const session = await getSession();
  if (session) redirect(safeRedirect(target));

  const message = loginErrorMessage(error);

  return (
    <>
      {/* The whole viewport behind the card: the one page with room for the full scene. The veil
          lightens towards the bottom so the card's edge and the text under it stay crisp. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: LOGIN_BACKDROP.tint }}
      >
        <BannerImage
          src={LOGIN_BACKDROP.src}
          objectPosition={LOGIN_BACKDROP.objectPosition}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-b from-background/10 via-background/25 to-background/70" />
      </div>

      <Card className="mx-auto mt-[6vh] w-full max-w-md bg-card/85 backdrop-blur-md">
        <CardContent className="flex flex-col items-center gap-5 px-8 py-8 text-center">
          <GuildSeal size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Mèo Mập Giang Hồ
            </h1>
            {/* `lang` so the browser picks a Chinese face for the glyphs rather than a Vietnamese one. */}
            <p
              lang="zh"
              className="text-xs tracking-[0.3em] text-muted-foreground"
            >
              逆水寒
            </p>
          </div>
          <OrnamentDivider tone="gold" align="center" className="w-40" />
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">
            Đăng nhập bằng Discord để xem và điểm danh lịch đánh trong tuần.
          </p>
          {message && <ErrorNotice message={message} />}
          <DiscordLoginButton redirect={target} />
        </CardContent>
      </Card>
    </>
  );
}
