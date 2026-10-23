import type { Metadata } from "next";

import { BannerImage } from "@/components/shared/banner-image";
import { ErrorNotice } from "@/components/shared/error-notice";
import { GuildSeal } from "@/components/shared/guild-seal";
import { OrnamentDivider } from "@/components/shared/ornament-divider";
import { Card, CardContent } from "@/components/ui/card";
import { DiscordLoginButton, loginErrorMessage } from "@/features/auth";
import { LOGIN_BACKDROP } from "@/lib/page-banners";

export const metadata: Metadata = {
  title: "Đăng nhập — Mèo Mập Giang Hồ",
  description: "Đăng nhập bằng Discord để điểm danh",
};

/**
 * Route "/dang-nhap" - where signing in starts. A visitor who already has a session never reaches
 * it: `proxy.ts` sends them on to wherever they were heading. The Discord bot's "Mở website" button
 * sends every member through here, and a redirect from this page would be streamed behind the root
 * loading boundary instead of answering 307.
 * @param props.searchParams - `error` (code from the API) and `redirect` (intended page)
 * @returns The login page
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: target } = await searchParams;

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

      {/* An invitation card: the guild's seal stamped across its top edge, the one gold glow on the
          page. The stamp is tilted a few degrees, as a real one never lands square. */}
      <Card className="mx-auto mt-[10vh] w-full max-w-md bg-card/90 shadow-[inset_0_1px_0_var(--card-highlight),var(--glow-gold)] backdrop-blur-md">
        <CardContent className="flex flex-col items-center gap-5 px-8 pt-0 pb-10 text-center">
          <div className="-mt-9 -rotate-6 rounded-lg bg-card p-1 shadow-md">
            <GuildSeal size="lg" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
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
