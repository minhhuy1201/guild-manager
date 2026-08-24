"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "../api/me";

/** Query key của phiên đăng nhập — dùng chung để invalidate sau khi đăng xuất. */
export const sessionKeys = { me: () => ["auth", "me"] as const };

/**
 * Query thông tin phiên đang đăng nhập (vai và nhân vật của mình).
 * @returns Kết quả query TanStack (data là SessionUser)
 */
export function useSession() {
  return useQuery({ queryKey: sessionKeys.me(), queryFn: fetchMe });
}
