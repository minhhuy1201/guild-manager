import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { getSession } from "@/features/auth";
import { TeamBuilderScreen } from "@/features/team-builder";

export const metadata: Metadata = {
  title: "Xếp team — Mèo Mập Giang Hồ",
  description: "Xếp team cho bang hội (chỉ quản trị viên)",
};

/**
 * Route "/xep-team" — trang xếp team, chỉ quản trị viên truy cập được.
 * Middleware đã chặn từ trước; kiểm tra lại ở đây để phòng trường hợp
 * middleware bị bỏ qua (rewrite nội bộ, đổi cấu hình matcher...).
 * @returns Nội dung trang xếp team
 */
export default async function TeamBuilderPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.attendance);

  return <TeamBuilderScreen />;
}
