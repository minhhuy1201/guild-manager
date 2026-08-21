"use server";

import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Lấy access token của quản trị viên đang đăng nhập.
 * Chạy ở server vì token nằm trong cookie httpOnly, client không đọc được.
 * (Trùng với helper cùng tên ở features/settings và features/team-builder —
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
 * Lấy danh sách thành viên.
 * @returns Mảng thành viên sắp theo tên
 */
export async function fetchMembers(): Promise<Character[]> {
  return apiFetch<Character[]>("/characters", { headers: await authHeader() });
}

/**
 * Thêm một thành viên.
 * @param input - Tên và lưu phái
 * @returns Thành viên vừa tạo
 * @throws ApiError với message tiếng Việt của backend khi bị từ chối
 */
export async function createMember(
  input: CreateCharacterInput
): Promise<Character> {
  return apiFetch<Character>("/characters", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Sửa tên hoặc lưu phái của một thành viên.
 * @param id - Id thành viên
 * @param input - Các field cần đổi
 * @returns Thành viên sau khi sửa
 * @throws ApiError khi thành viên đã bị xoá (404) hoặc backend từ chối
 */
export async function updateMember(
  id: string,
  input: UpdateCharacterInput
): Promise<Character> {
  return apiFetch<Character>(`/characters/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}


/**
 * Xoá một thành viên cùng lịch sử điểm danh và đội hình của họ.
 * @param id - Id thành viên
 * @returns Promise hoàn tất khi đã xoá
 * @throws ApiError khi thành viên đã bị xoá (404)
 */
export async function deleteMember(id: string): Promise<void> {
  await apiFetch<void>(`/characters/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
