import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import {
  AttendanceHistoryFilters,
  AttendanceLogTable,
  AttendanceSummaryDashboard,
} from "@/features/attendance";
import { getSession } from "@/features/auth/server";

export const metadata: Metadata = {
  title: "Lịch sử điểm danh — Mèo Mập Giang Hồ",
  description: "Lịch sử điểm danh của các thành viên bang hội",
};

/**
 * Route "/lich-su-diem-danh" — the attendance history page.
 * The whole guild's history, for every signed-in member: attendance is shared information, so the
 * page is the same whatever the role.
 * @returns The filters, the per-class summary dashboard and the attendance history table
 */
export default async function AttendanceHistoryPage() {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  return (
    <>
      <AttendanceHistoryFilters />
      <AttendanceSummaryDashboard />
      <AttendanceLogTable />
    </>
  );
}
