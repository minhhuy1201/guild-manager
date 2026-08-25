import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canViewAllAttendance } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";
import { AttendanceFilters, AttendanceLogTable } from "@/features/attendance";
import { getSession } from "@/features/auth/server";

export const metadata: Metadata = {
  title: "Lịch sử điểm danh — Mèo Mập Giang Hồ",
  description: "Lịch sử điểm danh của các thành viên bang hội",
};

/**
 * Route "/lich-su-diem-danh" — the attendance history page.
 * A member has exactly one character in the table (the backend filtered it), so no filters are shown.
 * @returns The filters and the attendance history table
 */
export default async function AttendanceHistoryPage() {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  return (
    <>
      {canViewAllAttendance(session.role) && (
        <AttendanceFilters scope="history" />
      )}
      <AttendanceLogTable />
    </>
  );
}
