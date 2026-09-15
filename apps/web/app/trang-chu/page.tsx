import type { Metadata } from "next";

import { LandingScreen } from "@/features/landing";
import { getSession } from "@/features/auth/server";
import { LANDING_HERO } from "@/lib/page-banners";

export const metadata: Metadata = {
  title: "Mèo Mập Giang Hồ - Bang hard PVP Nghịch Thuỷ Hàn",
  description:
    "Mèo Mập Giang Hồ là bang hard PVP của Nghịch Thuỷ Hàn, mùa này nhắm bảng A. Ban chỉ huy, cách bang hoạt động và lối vào trang điểm danh.",
  // The link gets pasted into Discord, which is where most visitors come from.
  //
  // The picture's path is relative, and `next build` warns that `metadataBase` is unset. On Vercel
  // it is not a problem: Next fills `metadataBase` from `VERCEL_PROJECT_PRODUCTION_URL`, so the
  // production embed carries the real origin. The warning is local and CI only. Do not "fix" it by
  // hard-coding a domain here.
  openGraph: {
    title: "Mèo Mập Giang Hồ",
    description: "Bang hard PVP của Nghịch Thuỷ Hàn. Mùa này nhắm bảng A.",
    images: [LANDING_HERO.src],
  },
};

/**
 * Route "/trang-chu" - the guild's public page, and the only one besides "/dang-nhap" a visitor
 * without a session can reach.
 *
 * The session is read for one reason: it decides where the page's call to action points, not what
 * the page shows. Nothing here is gated.
 * @returns The landing screen
 */
export default async function LandingPage() {
  const session = await getSession();

  return <LandingScreen isSignedIn={Boolean(session)} />;
}
