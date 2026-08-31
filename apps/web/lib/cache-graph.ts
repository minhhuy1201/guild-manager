import type { QueryKey } from "@tanstack/react-query";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { memberKeys } from "@/features/members/api/members-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";

/**
 * Every data topic a write can make stale.
 * The single source of topic names: `CacheTopic` derives from it, so adding a topic without declaring
 * its dependents is a compile error.
 */
export const CACHE_TOPICS = [
  "roster",
  "schedule",
  "attendance",
  "attendance-window",
  "formation",
] as const;

/** A kind of data a write can make stale. */
export type CacheTopic = (typeof CACHE_TOPICS)[number];

/**
 * Which query keys must be invalidated when a topic is written. Reads like a domain sentence:
 * "change the schedule and the schedule, the attendance and the formations all go stale".
 *
 * This is the only place in the app allowed to import another feature's key factory: "which data makes
 * which data stale" is cross-feature knowledge that no single feature owns.
 *
 * The values are thunks rather than prebuilt arrays, so a key factory only runs at invalidation time —
 * module load order does not matter.
 */
export const CACHE_DEPENDENTS: Record<CacheTopic, () => QueryKey[]> = {
  /**
   * The attendance table and the team builder both list characters; missing one leaves the screens
   * inconsistent until a page reload.
   */
  roster: () => [
    memberKeys.all,
    attendanceKeys.characters(),
    attendanceKeys.records(),
    attendanceKeys.summary(),
    teamBuilderKeys.all,
  ],
  /**
   * The attendance table changes column count and the team builder changes tab count, so missing one
   * leaves the two screens inconsistent until a page reload.
   */
  schedule: () => [
    settingsKeys.all,
    attendanceKeys.sessions(),
    attendanceKeys.records(),
    attendanceKeys.summary(),
    teamBuilderKeys.all,
  ],
  /**
   * Marking one cell changes the records and the per-session tallies derived from them; the columns
   * and the character list are untouched. The summary travels with the records everywhere for the
   * same reason — the server counts the rows, so whatever makes a row stale makes the count stale.
   */
  attendance: () => [attendanceKeys.records(), attendanceKeys.summary()],
  /**
   * A deadline passing must lock the column: `isDeadlinePassed` is computed by the server and travels
   * with the session, so both the sessions and the records must be refetched. The schedule itself is
   * unchanged, which is why this is not `schedule` — and no row is written, so the tallies stand.
   */
  "attendance-window": () => [
    attendanceKeys.sessions(),
    attendanceKeys.records(),
  ],
  /** Saving a formation only touches the team builder's own data. */
  formation: () => [teamBuilderKeys.all],
};
