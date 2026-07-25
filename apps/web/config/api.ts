/**
 * Base URL của backend API.
 * Đặt qua `NEXT_PUBLIC_API_URL`; mặc định là API chạy local ở cổng 3001.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
