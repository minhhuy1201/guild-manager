"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  attendanceKeys,
  fetchAttendanceRecords,
  fetchBattleSessions,
  fetchCharacters,
  fetchCurrentWeek,
  markAttendance,
} from "../api/attendance-api";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";
import type { Character } from "../types/attendance";

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
 * Danh sách nhân vật đã lọc theo state của bộ lọc (tìm kiếm + lưu phái).
 * So khớp tên/ID trong game không phân biệt hoa/thường.
 * @returns Mảng nhân vật khớp bộ lọc (rỗng khi query chưa có data)
 */
export function useFilteredCharacters(): Character[] {
  const { data: characters } = useCharacters();
  const search = useAttendanceFilterStore((s) => s.search);
  const guildClasses = useAttendanceFilterStore((s) => s.guildClasses);

  return useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (characters ?? []).filter((character) => {
      const matchKeyword =
        keyword === "" ||
        character.name.toLowerCase().includes(keyword) ||
        character.id.toLowerCase().includes(keyword);
      const matchClass =
        guildClasses.length === 0 ||
        guildClasses.includes(character.guildClass);
      return matchKeyword && matchClass;
    });
  }, [characters, search, guildClasses]);
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
