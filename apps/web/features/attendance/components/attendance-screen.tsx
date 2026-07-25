"use client";

import { WeekTimeline } from "./week-timeline";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceGrid } from "./attendance-grid";

/**
 * Màn hình điểm danh bang hội "Mèo Mập Giang Hồ".
 * Chỉ compose các phần; mỗi phần con tự lấy dữ liệu qua hook/store.
 * @returns Nội dung trang điểm danh
 */
export function AttendanceScreen() {
  return (
    <>
      <WeekTimeline />
      <AttendanceFilters />
      <AttendanceGrid />
    </>
  );
}
