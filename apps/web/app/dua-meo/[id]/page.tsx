import { Capability } from "@guild/shared/enums";
import { can } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { WEB_AUTH_ERROR } from "@/features/auth";
import { getActor } from "@/features/auth/server";
import { CatRaceEventScreen } from "@/features/cat-race";

export const metadata: Metadata = {
  title: "Đua mèo — Mèo Mập Giang Hồ",
  description: "Màn đua mèo (cần được cấp quyền)",
};

interface CatRaceEventPageProps {
  /** Route parameters: the event's id */
  params: Promise<{ id: string }>;
}

/**
 * Route "/dua-meo/[id]" — one cat race event; needs the Đua mèo Capability, checked here like the
 * list page (the proxy only requires a session).
 * @param params - Route parameters carrying the event id
 * @returns The event page
 */
export default async function CatRaceEventPage({
  params,
}: CatRaceEventPageProps) {
  const session = await getActor();
  if (!session || !can(session, Capability.CAT_RACE)) {
    redirect(`${ROUTES.attendance}?error=${WEB_AUTH_ERROR.adminOnly}`);
  }

  const { id } = await params;

  return <CatRaceEventScreen id={id} />;
}
