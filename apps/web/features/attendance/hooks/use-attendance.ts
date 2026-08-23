"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Character } from "@guild/shared/schemas";

import { matchesRosterFilter } from "@/lib/roster-filter";
import {
  attendanceKeys,
  fetchAttendanceRecords,
  fetchBattleSessions,
  fetchCharacters,
  fetchCurrentWeek,
  markAttendance,
} from "../api/attendance-api";
import { markAttendanceAsAdmin } from "../api/mark-attendance-action";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

/**
 * Query danh sách nhân vật trong bang.
 * @returns Kết quả query TanStack (data là mảng nhân vật)
 */
export function useCharacters() {
  return useQuery({
    queryKey: attendanceKeys.characters(),
    queryFn: fetchCharacters,
  });
}

/**
 * Query danh sách buổi đánh trong tuần.
 * @returns Kết quả query TanStack (data là mảng buổi đánh)
 */
export function useBattleSessions() {
  return useQuery({
    queryKey: attendanceKeys.sessions(),
    queryFn: fetchBattleSessions,
  });
}

/**
 * Query thông tin tuần điểm danh hiện tại.
 * @returns Kết quả query TanStack (data là tuần hiện tại)
 */
export function useCurrentWeek() {
  return useQuery({
    queryKey: attendanceKeys.week(),
    queryFn: fetchCurrentWeek,
  });
}

/**
 * Query toàn bộ record điểm danh.
 * @returns Kết quả query TanStack (data là map record theo khóa)
 */
export function useAttendanceRecords() {
  return useQuery({
    queryKey: attendanceKeys.records(),
    queryFn: fetchAttendanceRecords,
  });
}

/**
 * Danh sách nhân vật đã lọc theo bộ lọc của một màn (tìm kiếm + lưu phái).
 * So khớp tên/ID trong game không phân biệt hoa/thường.
 * @param scope - Màn đang đọc bộ lọc; mỗi màn có state lọc riêng
 * @returns Mảng nhân vật khớp bộ lọc (rỗng khi query chưa có data)
 */
export function useFilteredCharacters(
  scope: AttendanceFilterScope
): Character[] {
  const { data: characters } = useCharacters();
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);

  return useMemo(
    () =>
      (characters ?? []).filter((character) =>
        matchesRosterFilter(character, filter)
      ),
    [characters, filter]
  );
}

/**
 * Mutation điểm danh; thành công thì invalidate lại danh sách record.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi validation)
 */
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    },
  });
}

/**
 * Mutation điểm danh hộ dành cho quản trị viên — đi qua Server Action để gắn được
 * access token, nhờ đó server cho bỏ qua deadline.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi từ backend)
 */
export function useMarkAttendanceAsAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAttendanceAsAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    },
  });
}
