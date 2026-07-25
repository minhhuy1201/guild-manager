import type { Metadata } from "next";
import { AttendanceLogTable } from "@/features/attendance";

export const metadata: Metadata = {
  title: "Lịch sử điểm danh — Mèo Mập Giang Hồ",
  description: "Lịch sử điểm danh của các thành viên bang hội",
};

/**
 * Route "/lich-su-diem-danh" — trang lịch sử điểm danh.
 * @returns Bảng lịch sử điểm danh
 */
export default function AttendanceHistoryPage() {
  return <AttendanceLogTable />;
}
