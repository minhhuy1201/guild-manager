import { API_BASE_URL } from "@/config/api";

/** Thông báo dùng khi không đọc được nội dung lỗi từ server. */
const FALLBACK_ERROR_MESSAGE = "Không kết nối được máy chủ.";

/** Lỗi trả về từ API, giữ nguyên message tiếng Việt của backend để hiển thị thẳng lên UI. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status code của response lỗi */
    readonly statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Gọi API backend và bóc lớp bọc `{ data }` của response thành công.
 * Đây là chỗ DUY NHẤT gọi fetch tới backend — feature không tự fetch.
 * @param path - Đường dẫn tính từ base URL, ví dụ "/attendance/characters"
 * @param init - Tùy chọn fetch bổ sung (method, body...)
 * @returns Phần `data` của response
 * @throws ApiError khi server trả status lỗi, message lấy từ body backend
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(readErrorMessage(body), response.status);
  }

  return (body as { data: T }).data;
}

/**
 * Đọc message lỗi từ body backend.
 * @param body - Body đã parse (null nếu không phải JSON)
 * @returns Message của backend, hoặc thông báo mặc định
 */
function readErrorMessage(body: unknown): string {
  const message = (body as { message?: unknown } | null)?.message;

  return typeof message === "string" && message !== ""
    ? message
    : FALLBACK_ERROR_MESSAGE;
}
