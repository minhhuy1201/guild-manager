/** The presence filter on the history screen: every record, or only one of the two answers. */
export type AttendancePresenceFilter = "all" | "present" | "absent";

/** Vietnamese label of each presence option, reusing the wording of the recorded answer. */
export const PRESENCE_FILTER_LABEL: Record<AttendancePresenceFilter, string> = {
  all: "Tất cả",
  present: "Có",
  absent: "Không",
};

/** Options in display order, "Tất cả" first. */
export const PRESENCE_FILTER_OPTIONS = [
  "all",
  "present",
  "absent",
] as const satisfies readonly AttendancePresenceFilter[];

/** Predicate per option; a Record so a new option becomes a compile error. */
const PRESENCE_PREDICATE: Record<
  AttendancePresenceFilter,
  (isPresent: boolean) => boolean
> = {
  all: () => true,
  present: (isPresent) => isPresent,
  absent: (isPresent) => !isPresent,
};

/**
 * Whether a recorded answer passes the presence filter.
 * @param presence - Option currently selected
 * @param isPresent - The recorded answer
 * @returns True when the record should stay in the list
 */
export function matchesPresenceFilter(
  presence: AttendancePresenceFilter,
  isPresent: boolean
): boolean {
  return PRESENCE_PREDICATE[presence](isPresent);
}
