import { create } from "zustand";
import type { GuildClass } from "@guild/shared/enums";

/** Màn đang dùng bộ lọc — mỗi màn giữ state riêng, không ảnh hưởng nhau. */
export type AttendanceFilterScope = "attendance" | "history";

/** Giá trị bộ lọc của một màn. */
interface AttendanceFilterValue {
  /** Từ khóa tìm kiếm (tên hoặc ID trong game) */
  search: string;
  /** Các lưu phái đang lọc. Mảng rỗng = tất cả lưu phái. */
  guildClasses: GuildClass[];
}

interface AttendanceFilterState {
  /** Bộ lọc của từng màn, tra theo scope */
  filters: Record<AttendanceFilterScope, AttendanceFilterValue>;
  setSearch: (scope: AttendanceFilterScope, value: string) => void;
  setGuildClasses: (scope: AttendanceFilterScope, value: GuildClass[]) => void;
}

/** Bộ lọc rỗng dùng làm giá trị khởi tạo cho mỗi màn. */
const EMPTY_FILTER: AttendanceFilterValue = { search: "", guildClasses: [] };

/**
 * Store UI state cho bộ lọc điểm danh (Zustand).
 * State tách theo scope nên lọc ở màn Điểm danh không kéo theo màn Lịch sử và ngược lại.
 * Chỉ giữ client/UI state — KHÔNG chứa server data (records nằm ở TanStack Query).
 */
export const useAttendanceFilterStore = create<AttendanceFilterState>(
  (set) => ({
    filters: {
      attendance: EMPTY_FILTER,
      history: EMPTY_FILTER,
    },
    setSearch: (scope, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [scope]: { ...state.filters[scope], search: value },
        },
      })),
    setGuildClasses: (scope, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [scope]: { ...state.filters[scope], guildClasses: value },
        },
      })),
  })
);
