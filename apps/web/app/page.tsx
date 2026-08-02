import { AttendanceScreen } from "@/features/attendance";
import { getSession } from "@/features/auth";

/**
 * Route gốc "/" — chỉ compose màn hình điểm danh của feature attendance.
 * Đọc phiên đăng nhập ở server để quản trị viên điểm danh hộ được mà không cần
 * mật khẩu của từng nhân vật.
 * @returns Màn hình điểm danh
 */
export default async function Home() {
  const session = await getSession();

  return <AttendanceScreen isAdmin={Boolean(session)} />;
}
