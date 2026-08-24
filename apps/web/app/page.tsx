import { redirect } from "next/navigation";

import { ROUTES } from "@/config/routes";
import { AttendanceScreen } from "@/features/attendance";
import { getSession } from "@/features/auth";

/**
 * Route gốc "/" — chỉ compose màn hình điểm danh của feature attendance.
 * Đọc vai ở server để quyết định người này thấy cả bang hay chỉ nhân vật của mình.
 * @returns Màn hình điểm danh
 */
export default async function Home() {
  const session = await getSession();

  // proxy.ts đã chặn khách; nhánh này chỉ để TypeScript biết `session` không null.
  if (!session) redirect(ROUTES.login);

  return <AttendanceScreen role={session.role} />;
}
