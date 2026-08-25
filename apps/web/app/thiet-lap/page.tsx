import { canManageGuild } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth/server";
import { SettingsTabs } from "@/features/settings";

export const metadata: Metadata = {
  title: "Thiết lập — Mèo Mập Giang Hồ",
  description: "Thiết lập lịch đánh và quản lý thành viên (chỉ quản trị viên)",
};

/**
 * Route "/thiet-lap" — schedule setup and member management, admins only.
 * The proxy already blocks it; both the session and the role are re-checked here in case the proxy is
 * bypassed. Checking only "has a session" is not enough: leader and member tokens are valid too.
 * @returns The settings page content
 */
export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !canManageGuild(session.role)) redirect(ROUTES.attendance);

  return <SettingsTabs />;
}
