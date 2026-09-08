import { create } from "zustand";

import type { RosterFilter } from "@/lib/roster-filter";
import type { AttendancePresenceFilter } from "../lib/presence-filter";

/** The screen using the filters — each keeps its own state, independent of the others. */
export type AttendanceFilterScope = "attendance" | "history";

interface AttendanceFilterState {
  /** Per-screen filters, keyed by scope */
  filters: Record<AttendanceFilterScope, RosterFilter>;
  setFilter: (scope: AttendanceFilterScope, value: RosterFilter) => void;
  /** Presence filter of the History screen only — the Attendance grid shows both answers at once. */
  presence: AttendancePresenceFilter;
  setPresence: (value: AttendancePresenceFilter) => void;
  /** Session filter of the History screen only; null means every session. */
  sessionId: string | null;
  setSessionId: (value: string | null) => void;
  /**
   * Week the History screen is reading; null means the open week. Unlike the other three this one
   * chooses *which data is fetched* rather than narrowing what was already fetched - which is why
   * changing it changes a query key.
   */
  weekStart: string | null;
  setWeekStart: (value: string | null) => void;
  /**
   * Clear every filter the History screen owns in one write — its roster filter, the presence, the
   * session and the week. History-only, like the fields it resets: the Attendance grid has no such
   * button, so a scoped `resetFilters(scope)` would carry a branch nothing calls.
   */
  resetHistoryFilters: () => void;
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
  presence: "all",
  setPresence: (value) => set({ presence: value }),
  sessionId: null,
  setSessionId: (value) => set({ sessionId: value }),
  weekStart: null,
  // Clearing the session alongside it: an id from the week being left resolves to nothing anyway,
  // and leaving it set would show the picker filtering on a day that is not on screen.
  setWeekStart: (value) => set({ weekStart: value, sessionId: null }),
  resetHistoryFilters: () =>
    set((state) => ({
      filters: { ...state.filters, history: EMPTY_FILTER },
      presence: "all",
      sessionId: null,
      weekStart: null,
    })),
}));
