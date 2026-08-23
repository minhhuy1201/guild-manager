import { create } from "zustand";

import type { RosterFilter } from "@/lib/roster-filter";

/** Màn đang dùng bộ lọc — mỗi màn giữ state riêng, không ảnh hưởng nhau. */
export type AttendanceFilterScope = "attendance" | "history";

interface AttendanceFilterState {
  /** Bộ lọc của từng màn, tra theo scope */
  filters: Record<AttendanceFilterScope, RosterFilter>;
  setFilter: (scope: AttendanceFilterScope, value: RosterFilter) => void;
}

/** Bộ lọc rỗng dùng làm giá trị khởi tạo cho mỗi màn. */
const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

/**
 * Store UI state cho bộ lọc điểm danh (Zustand).
 * State tách theo scope nên lọc ở màn Điểm danh không kéo theo màn Lịch sử và ngược lại.
 * Chỉ giữ client/UI state — KHÔNG chứa server data (records nằm ở TanStack Query).
 */
export const useAttendanceFilterStore = create<AttendanceFilterState>((set) => ({
  filters: {
    attendance: EMPTY_FILTER,
    history: EMPTY_FILTER,
  },
  setFilter: (scope, value) =>
    set((state) => ({ filters: { ...state.filters, [scope]: value } })),
}));
