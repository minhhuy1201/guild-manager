import { canManageGuild } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth/server";
import { TeamBuilderScreen } from "@/features/team-builder";

export const metadata: Metadata = {
  title: "Xếp team — Mèo Mập Giang Hồ",
  description: "Xếp team cho bang hội (chỉ quản trị viên)",
};

/**
 * Route "/xep-team" — the team builder page, admins only.
 * The proxy already blocks it; both the session and the role are re-checked here in case the proxy is
 * bypassed (an internal rewrite, a matcher config change…). Checking only "has a session" is not
 * enough: member tokens are valid too.
 * @returns The team builder page content
 */
export default async function TeamBuilderPage() {
  const session = await getSession();
  if (!session || !canManageGuild(session.role)) redirect(ROUTES.attendance);

  return <TeamBuilderScreen />;
}
