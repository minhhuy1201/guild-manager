"use client";

import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild } from "@guild/shared/lib";

import { WeekTimeline } from "./week-timeline";
import { AttendanceFilters } from "./attendance-filters";
import { AttendanceGrid } from "./attendance-grid";
import { MemberAttendanceCard } from "./member-attendance-card";

interface AttendanceScreenProps {
  /** Role of the viewer, deciding whether they may edit the grid or only read it */
  role: GuildRole;
}

/**
 * The attendance screen. Everyone reads the whole guild's grid, filters included, and answers for
 * their own character in the card above it — an admin fights the battles too. The role only decides
 * whether the grid gets its edit column.
 * @param props.role - Role of the viewer
 * @returns The attendance page content
 */
export function AttendanceScreen({ role }: AttendanceScreenProps) {
  const isAdmin = canManageGuild(role);

  return (
    <>
      <WeekTimeline />
      <MemberAttendanceCard />
      <AttendanceFilters scope="attendance" />
      <AttendanceGrid isAdmin={isAdmin} />
    </>
  );
}
