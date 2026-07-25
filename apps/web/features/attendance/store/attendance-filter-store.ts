import { create } from "zustand";
import type { GuildClass } from "@shared/enums";

interface AttendanceFilterState {
  /** Từ khóa tìm kiếm (tên hoặc gameId) */
  search: string;
  /** Các lưu phái đang lọc. Mảng rỗng = tất cả lưu phái. */
  guildClasses: GuildClass[];
  setSearch: (value: string) => void;
  setGuildClasses: (value: GuildClass[]) => void;
}

/**
 * Store UI state cho bộ lọc điểm danh (Zustand).
 * Chỉ giữ client/UI state — KHÔNG chứa server data (records nằm ở TanStack Query).
 */
export const useAttendanceFilterStore = create<AttendanceFilterState>(
  (set) => ({
    search: "",
    guildClasses: [],
    setSearch: (value) => set({ search: value }),
    setGuildClasses: (value) => set({ guildClasses: value }),
  })
);
