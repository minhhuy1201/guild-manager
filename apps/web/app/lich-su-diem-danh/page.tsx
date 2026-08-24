import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canViewAllAttendance } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";
import { AttendanceFilters, AttendanceLogTable } from "@/features/attendance";
import { getSession } from "@/features/auth";

export const metadata: Metadata = {
  title: "Lịch sử điểm danh — Mèo Mập Giang Hồ",
  description: "Lịch sử điểm danh của các thành viên bang hội",
};

/**
 * Route "/lich-su-diem-danh" — trang lịch sử điểm danh.
 * Bang chúng chỉ có đúng một nhân vật trong bảng (backend đã lọc) nên không hiện bộ lọc.
 * @returns Bộ lọc và bảng lịch sử điểm danh
 */
export default async function AttendanceHistoryPage() {
  const session = await getSession();

  // proxy.ts đã chặn khách; nhánh này chỉ để TypeScript biết `session` không null.
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
