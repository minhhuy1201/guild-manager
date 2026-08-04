"use server";

import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from "@shared/schemas";

import type { BattleSession, Week } from "@/features/attendance";
import { getAccessToken } from "@/features/auth";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Lấy access token của quản trị viên đang đăng nhập.
 * Chạy ở server vì token nằm trong cookie httpOnly, client không đọc được.
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
 * Lấy các tuần thiết lập được: tuần đang mở và tuần kế tiếp.
 * @returns Mảng 2 tuần, tuần đang mở đứng trước
 */
export async function fetchSettingsWeeks(): Promise<Week[]> {
  return apiFetch<Week[]>("/battle-sessions/weeks");
}

/**
 * Lấy các trận của một tuần.
 * @param weekStart - Mốc Thứ 2 của tuần (ISO string)
 * @returns Mảng trận sắp theo thời gian đánh
 */
export async function fetchWeekSessions(
  weekStart: string
): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>(
    `/battle-sessions?weekStart=${encodeURIComponent(weekStart)}`
  );
}

/**
 * Thêm một trận scrim.
 * @param input - Giờ đánh, hạn chót và tên bang đối thủ
 * @returns Trận vừa tạo
 * @throws ApiError với message tiếng Việt của backend khi bị từ chối
 */
export async function createBattleSession(
  input: CreateBattleSessionInput
): Promise<BattleSession> {
  return apiFetch<BattleSession>("/battle-sessions", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Sửa một trận.
 * @param id - Id trận cần sửa
 * @param input - Các field cần đổi
 * @returns Trận sau khi sửa
 * @throws ApiError khi trận đã bị xoá (404) hoặc backend từ chối
 */
export async function updateBattleSession(
  id: string,
  input: UpdateBattleSessionInput
): Promise<BattleSession> {
  return apiFetch<BattleSession>(`/battle-sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Xoá một trận scrim cùng điểm danh và đội hình của nó.
 * @param id - Id trận cần xoá
 * @returns Promise hoàn tất khi đã xoá
 * @throws ApiError khi là Guild War, tuần đã qua, hoặc trận đã bị xoá
 */
export async function deleteBattleSession(id: string): Promise<void> {
  await apiFetch<void>(`/battle-sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
