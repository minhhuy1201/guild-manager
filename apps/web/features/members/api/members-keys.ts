/**
 * Query key factory cho màn Quản lý thành viên.
 * Tách khỏi `members-api.ts` vì file `"use server"` chỉ được export hàm async.
 */
export const memberKeys = {
  all: ["members"] as const,
  list: () => [...memberKeys.all, "list"] as const,
};
