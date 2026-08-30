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
 * The attendance screen. Everyone reads the whole guild's grid, filters included; only an admin gets
 * its edit column. A member answers for their own character in the card above the grid.
 * @param props.role - Role of the viewer
 * @returns The attendance page content
 */
export function AttendanceScreen({ role }: AttendanceScreenProps) {
  const isAdmin = canManageGuild(role);

  return (
    <>
      <WeekTimeline />
      {!isAdmin && <MemberAttendanceCard />}
      <AttendanceFilters scope="attendance" />
      <AttendanceGrid isAdmin={isAdmin} />
    </>
  );
}
