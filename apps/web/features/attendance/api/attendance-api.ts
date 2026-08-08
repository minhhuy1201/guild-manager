import type { MarkAttendanceInput } from "@shared/schemas";

import { apiFetch } from "@/lib/api-client";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
  Week,
} from "../types/attendance";
import { recordKey } from "../types/attendance";

export type { MarkAttendanceInput };

/**
 * Query key factory cho domain điểm danh.
 * Dùng chung cho mọi useQuery/invalidateQueries của feature này.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  characters: () => [...attendanceKeys.all, "characters"] as const,
  sessions: () => [...attendanceKeys.all, "sessions"] as const,
  weeks: () => [...attendanceKeys.all, "weeks"] as const,
  week: () => [...attendanceKeys.all, "week"] as const,
  records: () => [...attendanceKeys.all, "records"] as const,
};

/**
 * Kiểm tra đã quá hạn điểm danh (deadline) hay chưa.
 * Chỉ dùng để khóa cột trên UI — server mới là nơi chặn thật.
 * @param deadline - Hạn chót cần kiểm tra (ISO string)
 * @returns true nếu hiện tại đã quá deadline
 */
export function isDeadlinePassed(deadline: string): boolean {
  return Date.now() > new Date(deadline).getTime();
}

/**
 * Lấy danh sách nhân vật trong bang.
 * @returns Promise trả về mảng nhân vật
 */
export function fetchCharacters(): Promise<Character[]> {
  return apiFetch<Character[]>("/attendance/characters");
}

/**
 * Lấy danh sách buổi đánh của tuần đang mở.
 * @returns Promise trả về mảng buổi đánh
 */
export function fetchBattleSessions(): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>("/battle-sessions");
}

/**
 * Lấy các tuần được phép thiết lập: tuần đang mở và tuần kế tiếp.
 * @returns Promise trả về mảng tuần, tuần đang mở đứng trước
 */
export function fetchEditableWeeks(): Promise<Week[]> {
  return apiFetch<Week[]>("/battle-sessions/weeks");
}

/**
 * Lấy tuần điểm danh đang mở.
 * @returns Promise trả về tuần đang mở
 * @throws Error khi backend không trả về tuần nào đang mở
 */
export async function fetchCurrentWeek(): Promise<Week> {
  const weeks = await fetchEditableWeeks();
  const active = weeks.find((week) => week.isActive);

  if (!active) throw new Error("Không xác định được tuần điểm danh.");

  return active;
}

/**
 * Lấy toàn bộ record điểm danh của tuần đang mở.
 * API trả về mảng, component tra cứu theo cặp (nhân vật, buổi đánh) nên đổi sang map.
 * @returns Promise trả về map record theo khóa `recordKey`
 */
export async function fetchAttendanceRecords(): Promise<
  Record<string, AttendanceRecord>
> {
  const records = await apiFetch<AttendanceRecord[]>("/attendance/records");

  return Object.fromEntries(
    records.map((record) => [
      recordKey(record.characterId, record.sessionId),
      record,
    ])
  );
}

/**
 * Điểm danh cho một nhân vật ở một buổi đánh.
 * Deadline do server kiểm tra; lỗi nổi lên dưới dạng `ApiError` với message
 * tiếng Việt để hiển thị.
 * @param input - Thông tin điểm danh
 * @returns Promise trả về record vừa ghi
 */
export function markAttendance(
  input: MarkAttendanceInput
): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>("/attendance", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
