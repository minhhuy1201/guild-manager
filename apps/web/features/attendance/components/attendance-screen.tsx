"use client";

import { WeekTimeline } from "./week-timeline";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceGrid } from "./attendance-grid";

interface AttendanceScreenProps {
  /** Người đang xem là quản trị viên — không bị khóa theo deadline. */
  isAdmin: boolean;
}

/**
 * Màn hình điểm danh bang hội "Mèo Mập Giang Hồ".
 * Chỉ compose các phần; mỗi phần con tự lấy dữ liệu qua hook/store.
 * @param isAdmin - Người đang xem có phải quản trị viên hay không
 * @returns Nội dung trang điểm danh
 */
export function AttendanceScreen({ isAdmin }: AttendanceScreenProps) {
  return (
    <>
      <WeekTimeline />
      <AttendanceFilters scope="attendance" />
      <AttendanceGrid isAdmin={isAdmin} />
    </>
  );
}
