import { canManageGuild } from "@guild/shared/lib";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth";
import { SettingsTabs } from "@/features/settings";

export const metadata: Metadata = {
  title: "Thiết lập — Mèo Mập Giang Hồ",
  description: "Thiết lập lịch đánh và quản lý thành viên (chỉ quản trị viên)",
};

/**
 * Route "/thiet-lap" — trang thiết lập lịch đánh và quản lý thành viên,
 * chỉ quản trị viên truy cập được.
 * Proxy đã chặn từ trước; kiểm lại cả phiên lẫn vai ở đây để phòng trường hợp proxy
 * bị bỏ qua. Chỉ kiểm "có phiên" là không đủ: token của cán bộ và bang chúng cũng hợp lệ.
 * @returns Nội dung trang thiết lập
 */
export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !canManageGuild(session.role)) redirect(ROUTES.attendance);

  return <SettingsTabs />;
}
