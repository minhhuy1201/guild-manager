/**
 * One named area of guild management an Admin can grant to a Manager as a whole. Each value covers
 * both viewing and writing in its area. Travels over the network (`/auth/me`, the member shapes), so
 * it lives here and must match Prisma's `Capability` enum values.
 *
 * Changing the role or the Grants of a member is deliberately not a Capability: only an Admin does it.
 */
export enum Capability {
  /** `/xep-team`, the Formation announcement and the Team notice */
  TEAM_BUILDER = "TEAM_BUILDER",
  /** The schedule tab of the settings page: battle days, reopening attendance, fewer matches */
  SCHEDULE = "SCHEDULE",
  /** The members tab of the settings page, within the limits a Manager has on members */
  MEMBERS = "MEMBERS",
  /** Marking and leaves on behalf of others, past the deadline, and the leaves tab */
  ATTENDANCE = "ATTENDANCE",
  /** `/dua-meo`: events, races and announcements */
  CAT_RACE = "CAT_RACE",
  /** Creating, editing and deleting tactics */
  TACTICS = "TACTICS",
}

/** Vietnamese display label per Capability, keys in display order. */
export const CAPABILITY_LABEL: Record<Capability, string> = {
  [Capability.TEAM_BUILDER]: "Xếp team",
  [Capability.SCHEDULE]: "Lịch trận",
  [Capability.MEMBERS]: "Thành viên",
  [Capability.ATTENDANCE]: "Điểm danh & nghỉ phép",
  [Capability.CAT_RACE]: "Đua mèo",
  [Capability.TACTICS]: "Sửa chiến thuật",
};
