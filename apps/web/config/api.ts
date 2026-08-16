/** API local mặc định khi chạy dev mà chưa khai báo biến môi trường. */
const FALLBACK_API_URL = "http://localhost:3001/api";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

// `NEXT_PUBLIC_*` được nhúng thẳng vào bundle lúc build và không đọc lại lúc chạy, nên thiếu biến
// này ở production nghĩa là bản build đã hỏng sẵn: mọi request sẽ lặng lẽ trỏ về localhost. Ném lỗi
// ngay để `next build` chết ở khâu deploy thay vì lên production rồi mới lộ.
if (process.env.NODE_ENV === "production" && !configuredApiUrl) {
  throw new Error(
    "Thiếu biến môi trường NEXT_PUBLIC_API_URL — phải khai báo trước khi build production."
  );
}

/**
 * Base URL của backend API.
 * Đặt qua `NEXT_PUBLIC_API_URL`; mặc định là API chạy local ở cổng 3001.
 */
export const API_BASE_URL = configuredApiUrl ?? FALLBACK_API_URL;
