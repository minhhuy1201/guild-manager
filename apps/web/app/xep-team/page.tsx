import { canManageGuild } from "@guild/shared/lib";
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
 * Proxy đã chặn từ trước; kiểm lại cả phiên lẫn vai ở đây để phòng trường hợp
 * proxy bị bỏ qua (rewrite nội bộ, đổi cấu hình matcher...). Chỉ kiểm "có phiên"
 * là không đủ: token của cán bộ và bang chúng cũng hợp lệ.
 * @returns Nội dung trang xếp team
 */
export default async function TeamBuilderPage() {
  const session = await getSession();
  if (!session || !canManageGuild(session.role)) redirect(ROUTES.attendance);

  return <TeamBuilderScreen />;
}
