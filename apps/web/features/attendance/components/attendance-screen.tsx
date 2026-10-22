"use client";

import { Capability } from "@guild/shared/enums";
import { can, type Actor } from "@guild/shared/lib";

import { PageHeader } from "@/components/shared/page-header";
import { AttendanceGrid } from "./attendance-grid";
import { LeaveSection } from "./leave-section";
import { MemberAttendanceCard } from "./member-attendance-card";

interface AttendanceScreenProps {
  /** Role and Grants of the viewer, deciding whether they may edit the grid or only read it */
  actor: Actor;
}

/**
 * The attendance screen. Everyone reads the whole guild's grid, filters included, and answers for
 * their own character in the card above it — an admin fights the battles too. The viewer's Capability only decides
 * whether the grid gets its edit column. The card carries the week's schedule as well, so the page
 * shows one grid of day tiles, with the one thing a member came to do right under the banner.
 * @param props.actor - Role and Grants of the viewer
 * @returns The attendance page content
 */
export function AttendanceScreen({ actor }: AttendanceScreenProps) {
  const isAdmin = can(actor, Capability.ATTENDANCE);

  return (
    <>
      <PageHeader
        banner="attendance"
        isPlainOnPhone
        title="Điểm danh"
        description="Chọn Có hoặc Không cho từng trận trong tuần, trước hạn chót của trận đó."
      />
      <LeaveSection isAdmin={isAdmin} />
      <MemberAttendanceCard />
      <AttendanceGrid isAdmin={isAdmin} />
    </>
  );
}
