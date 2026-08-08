"use server";

import type { MarkAttendanceInput } from "@shared/schemas";

import { getAccessToken } from "@/features/auth";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { AttendanceRecord } from "../types/attendance";

/**
 * Điểm danh hộ với tư cách quản trị viên.
 * Chạy ở server vì access token nằm trong cookie httpOnly của Next, client không đọc
 * được để tự gắn header `Authorization`. Backend mới là nơi kiểm tra token và quyết
 * định có cho bỏ qua deadline hay không.
 * @param input - characterId, sessionId và trạng thái cần ghi
 * @returns Record vừa ghi
 * @throws ApiError khi chưa đăng nhập hoặc backend từ chối, message tiếng Việt để hiển thị
 */
export async function markAttendanceAsAdmin(
  input: MarkAttendanceInput
): Promise<AttendanceRecord> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", 401);
  }

  return apiFetch<AttendanceRecord>("/attendance", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
