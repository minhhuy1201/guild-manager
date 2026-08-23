"use client";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

interface AttendanceFiltersProps {
  /** Màn đang dùng bộ lọc — mỗi màn giữ state riêng. */
  scope: AttendanceFilterScope;
}

/**
 * Thanh lọc: tìm kiếm theo tên/ID trong game và chọn lưu phái.
 * Đọc/ghi vào phần store ứng với `scope`, nên hai màn không dùng chung giá trị lọc.
 * @param scope - Màn đang dùng bộ lọc
 * @returns Card chứa các bộ lọc
 */
export function AttendanceFilters({ scope }: AttendanceFiltersProps) {
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);

  return (
    <Card>
      <CardContent>
        <RosterFilterBar
          idPrefix={scope}
          value={filter}
          onChange={(next) => setFilter(scope, next)}
        />
      </CardContent>
    </Card>
  );
}
