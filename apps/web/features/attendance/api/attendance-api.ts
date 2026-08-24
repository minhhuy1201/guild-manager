"use server";

import type {
  AttendanceRecord,
  AttendanceSummary,
  BattleSession,
  Character,
  MarkAttendanceInput,
  Week,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth/server";
import { ApiError, apiFetch } from "@/lib/api-client";
import { recordKey } from "../lib/record-key";

/**
 * Lấy access token của người đang đăng nhập.
 * Chạy ở server vì token nằm trong cookie httpOnly, client không đọc được.
 * (Trùng với helper cùng tên ở features/members, settings và team-builder —
 * file "use server" chỉ được export hàm async nên không dùng chung được.)
 * @returns Header Authorization đã dựng sẵn
 * @throws ApiError khi phiên đăng nhập đã hết hạn
 */
async function authHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      401
    );
  }

  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Lấy danh sách nhân vật cho màn điểm danh — backend đã lọc theo vai của người gọi.
 * @returns Promise trả về mảng nhân vật
 */
export async function fetchCharacters(): Promise<Character[]> {
  return apiFetch<Character[]>("/attendance/characters", {
    headers: await authHeader(),
  });
}

/**
 * Lấy danh sách buổi đánh của tuần đang mở.
 * @returns Promise trả về mảng buổi đánh
 */
export async function fetchBattleSessions(): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>("/battle-sessions", {
    headers: await authHeader(),
  });
}

/**
 * Lấy các tuần được phép thiết lập: tuần đang mở và tuần kế tiếp.
 * @returns Promise trả về mảng tuần, tuần đang mở đứng trước
 */
export async function fetchEditableWeeks(): Promise<Week[]> {
  return apiFetch<Week[]>("/battle-sessions/weeks", {
    headers: await authHeader(),
  });
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
 * Lấy record điểm danh của tuần đang mở — backend đã lọc theo vai của người gọi.
 * API trả về mảng, component tra cứu theo cặp (nhân vật, buổi đánh) nên đổi sang map.
 * @returns Promise trả về map record theo khóa `recordKey`
 */
export async function fetchAttendanceRecords(): Promise<
  Record<string, AttendanceRecord>
> {
  const records = await apiFetch<AttendanceRecord[]>("/attendance/records", {
    headers: await authHeader(),
  });

  return Object.fromEntries(
    records.map((record) => [
      recordKey(record.characterId, record.sessionId),
      record,
    ])
  );
}

/**
 * Lấy số lượt Có/Không của từng trận trong tuần đang mở.
 * @returns Mảng số đếm theo trận
 */
export async function fetchAttendanceSummary(): Promise<AttendanceSummary[]> {
  return apiFetch<AttendanceSummary[]>("/attendance/summary", {
    headers: await authHeader(),
  });
}

/**
 * Điểm danh cho một nhân vật ở một buổi đánh.
 * Deadline và quyền điểm danh hộ do server kiểm tra; lỗi nổi lên dưới dạng `ApiError`
 * với message tiếng Việt để hiển thị.
 * @param input - Thông tin điểm danh
 * @returns Promise trả về record vừa ghi
 */
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>("/attendance", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}
