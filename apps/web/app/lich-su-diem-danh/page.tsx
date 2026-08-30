import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import {
  AttendanceHistoryFilters,
  AttendanceLogTable,
} from "@/features/attendance";
import { getSession } from "@/features/auth/server";

export const metadata: Metadata = {
  title: "Lịch sử điểm danh — Mèo Mập Giang Hồ",
  description: "Lịch sử điểm danh của các thành viên bang hội",
};

/**
 * Route "/lich-su-diem-danh" — the attendance history page.
 * The filters are shown to everyone: a member only sees their own rows, but still filters them by
 * session answer.
 * @returns The filters and the attendance history table
 */
export default async function AttendanceHistoryPage() {
  const session = await getSession();

  // proxy.ts already blocked visitors; this branch only tells TypeScript `session` is not null.
  if (!session) redirect(ROUTES.login);

  return (
    <>
      <AttendanceHistoryFilters />
      <AttendanceLogTable />
    </>
  );
}
