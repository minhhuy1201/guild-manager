"use client";

import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild, canViewAllAttendance } from "@guild/shared/lib";

import { WeekTimeline } from "./week-timeline";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceGrid } from "./attendance-grid";
import { MemberAttendanceCard } from "./member-attendance-card";

interface AttendanceScreenProps {
  /** Role of the viewer, deciding whether they see the whole guild or only themselves */
  role: GuildRole;
}

/**
 * The attendance screen. A member sees only their own character; leaders and admins see the whole guild.
 * @param props.role - Role of the viewer
 * @returns The attendance page content
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
