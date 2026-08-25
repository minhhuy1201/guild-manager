import { create } from "zustand";

import type { RosterFilter } from "@/lib/roster-filter";

/** The screen using the filters — each keeps its own state, independent of the others. */
export type AttendanceFilterScope = "attendance" | "history";

interface AttendanceFilterState {
  /** Per-screen filters, keyed by scope */
  filters: Record<AttendanceFilterScope, RosterFilter>;
  setFilter: (scope: AttendanceFilterScope, value: RosterFilter) => void;
}

/** The empty filter used as each screen's initial value. */
const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

/**
 * UI state store for the attendance filters (Zustand).
 * State is split by scope, so filtering on the Attendance screen does not affect the History screen
 * or vice versa. Client/UI state only — NO server data (records live in TanStack Query).
 */
export const useAttendanceFilterStore = create<AttendanceFilterState>((set) => ({
  filters: {
    attendance: EMPTY_FILTER,
    history: EMPTY_FILTER,
  },
  setFilter: (scope, value) =>
    set((state) => ({ filters: { ...state.filters, [scope]: value } })),
}));
