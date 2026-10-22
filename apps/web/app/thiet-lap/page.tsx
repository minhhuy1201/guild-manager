import { can } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { SETTINGS_CAPABILITIES } from "@/config/settings-capabilities";
import { WEB_AUTH_ERROR } from "@/features/auth";
import { getActor } from "@/features/auth/server";
import { SettingsTabs } from "@/features/settings";

export const metadata: Metadata = {
  title: "Thiết lập — Mèo Mập Giang Hồ",
  description: "Thiết lập lịch đánh và quản lý thành viên (chỉ quản trị viên)",
};

/**
 * Route "/thiet-lap" — schedule setup, member management and leaves, for an Admin or a Manager
 * holding at least one of those Capabilities. The proxy already turns Members away by role; the
 * Capability is re-checked here, since the token carries no Grants. Checking only "has a session"
 * is not enough: member tokens are valid too.
 * @returns The settings page content
 */
export default async function SettingsPage() {
  const session = await getActor();
  // With the reason, not bare: someone just demoted from ADMIN opens an old bookmark and would
  // otherwise watch a page they use every day silently vanish.
  const canOpen =
    session && SETTINGS_CAPABILITIES.some((capability) => can(session, capability));
  if (!session || !canOpen) {
    redirect(`${ROUTES.attendance}?error=${WEB_AUTH_ERROR.adminOnly}`);
  }

  return <SettingsTabs actor={session} />;
}
