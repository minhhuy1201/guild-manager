import { Capability } from "@guild/shared/enums";
import { can } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { WEB_AUTH_ERROR } from "@/features/auth";
import { getActor } from "@/features/auth/server";
import { CatRaceListScreen } from "@/features/cat-race";

export const metadata: Metadata = {
  title: "Đua mèo — Mèo Mập Giang Hồ",
  description: "Đua mèo trong bang (cần được cấp quyền)",
};

/**
 * Route "/dua-meo" — the cat race events; needs the Đua mèo Capability. This server-side check is
 * the web gate: the proxy only requires a session, and the role and Grants come from /auth/me via
 * `getActor`.
 * @returns The event list page
 */
export default async function CatRacePage() {
  const session = await getActor();
  if (!session || !can(session, Capability.CAT_RACE)) {
    redirect(`${ROUTES.attendance}?error=${WEB_AUTH_ERROR.adminOnly}`);
  }

  return <CatRaceListScreen />;
}
