import { Capability } from "@guild/shared/enums";
import { can } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { WEB_AUTH_ERROR } from "@/features/auth";
import { getActor } from "@/features/auth/server";
import { TeamBuilderScreen } from "@/features/team-builder";

export const metadata: Metadata = {
  title: "Xếp team — Mèo Mập Giang Hồ",
  description: "Xếp team cho bang hội (cần được cấp quyền)",
};

/**
 * Route "/xep-team" — the team builder page; needs the Xếp team Capability. This server-side check
 * is the web gate: the proxy only requires a session, and the role and Grants come from /auth/me
 * via `getActor`.
 * @returns The team builder page content
 */
export default async function TeamBuilderPage() {
  const session = await getActor();
  // With the reason, not bare: someone just demoted from ADMIN opens an old bookmark and would
  // otherwise watch a page they use every day silently vanish.
  if (!session || !can(session, Capability.TEAM_BUILDER)) {
    redirect(`${ROUTES.attendance}?error=${WEB_AUTH_ERROR.notGranted}`);
  }

  return <TeamBuilderScreen />;
}
