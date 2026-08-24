"use server";

import type {
  FormationWeek,
  MatchFormation,
  SessionFormation,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth/server";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Tham số của `saveFormation`. Không phải body của request: `sessionId` đi trên
 * URL, chỉ `matches` được gửi lên — body ấy là `SaveFormationInput` ở
 * `@guild/shared/schemas`.
 */
export interface SaveFormationArgs {
  /** ID ngày đánh cần lưu */
  sessionId: string;
  /** Từng trận: đội hình đã bỏ ô trống, và ghi chú đã bỏ ô để rỗng */
  matches: MatchFormation[];
}

/**
 * Lấy access token của quản trị viên đang đăng nhập.
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
 * Lấy các tuần còn dữ liệu đội hình.
 * Chạy ở server vì endpoint chỉ dành cho quản trị viên và token nằm trong cookie
 * httpOnly, client không tự gắn header được.
 * @returns Mảng tuần, mới nhất trước
 * @throws ApiError khi chưa đăng nhập hoặc backend từ chối
 */
export async function fetchFormationWeeks(): Promise<FormationWeek[]> {
  return apiFetch<FormationWeek[]>("/team-builder/weeks", {
    headers: await authHeader(),
  });
}

/**
 * Lấy đội hình của các trận trong một tuần.
 * @param weekStart - Mốc Thứ 2 của tuần (ISO string); bỏ trống = tuần đang mở
 * @returns Mảng trận sắp theo thời gian đánh
 * @throws ApiError khi chưa đăng nhập hoặc backend từ chối
 */
export async function fetchFormations(
  weekStart?: string
): Promise<SessionFormation[]> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";

  return apiFetch<SessionFormation[]>(`/team-builder/formations${query}`, {
    headers: await authHeader(),
  });
}

/**
 * Ghi đè đội hình cả ngày (1 hoặc 2 trận), kèm ghi chú theo ô.
 * @param input - sessionId và đội hình từng trận cần lưu
 * @returns Ngày đánh kèm đội hình vừa ghi
 * @throws ApiError khi chưa đăng nhập, ngày đã khoá (409), hoặc backend từ chối
 */
export async function saveFormation(
  input: SaveFormationArgs
): Promise<SessionFormation> {
  return apiFetch<SessionFormation>(
    `/team-builder/formations/${encodeURIComponent(input.sessionId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ matches: input.matches }),
      headers: await authHeader(),
    }
  );
}
