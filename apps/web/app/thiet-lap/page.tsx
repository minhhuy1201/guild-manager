import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth";
import { SettingsScreen } from "@/features/settings";

export const metadata: Metadata = {
  title: "Thiết lập — Mèo Mập Giang Hồ",
  description: "Thiết lập lịch đánh trong tuần (chỉ quản trị viên)",
};

/**
 * Route "/thiet-lap" — trang thiết lập lịch đánh, chỉ quản trị viên truy cập được.
 * Proxy đã chặn từ trước; kiểm tra lại ở đây để phòng trường hợp proxy bị bỏ qua.
 * @returns Nội dung trang thiết lập
 */
export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.attendance);

  return <SettingsScreen />;
}
