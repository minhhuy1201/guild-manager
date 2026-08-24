"use client";

import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild, canViewAllAttendance } from "@guild/shared/lib";

import { WeekTimeline } from "./week-timeline";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceGrid } from "./attendance-grid";
import { MemberAttendanceCard } from "./member-attendance-card";

interface AttendanceScreenProps {
  /** Vai của người đang xem, quyết định thấy cả bang hay chỉ mình */
  role: GuildRole;
}

/**
 * Màn hình điểm danh. Bang chúng thấy đúng nhân vật của mình; cán bộ và quản trị thấy cả bang.
 * @param props.role - Vai của người đang xem
 * @returns Nội dung trang điểm danh
 */
export function AttendanceScreen({ role }: AttendanceScreenProps) {
  if (!canViewAllAttendance(role)) {
    return (
      <>
        <WeekTimeline />
        <MemberAttendanceCard />
      </>
    );
  }

  return (
    <>
      <WeekTimeline />
      <AttendanceFilters scope="attendance" />
      <AttendanceGrid isAdmin={canManageGuild(role)} />
    </>
  );
}
