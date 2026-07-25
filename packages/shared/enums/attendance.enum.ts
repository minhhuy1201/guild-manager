/**
 * Trạng thái điểm danh của một nhân vật cho một buổi đánh.
 * Dùng chung cho cả FE và BE.
 */
export enum AttendanceStatus {
  /** Có tham gia buổi đánh */
  PRESENT = "CO",
  /** Không tham gia buổi đánh */
  ABSENT = "KHONG",
}

/**
 * Nhãn hiển thị tiếng Việt cho từng trạng thái điểm danh.
 */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: "Có",
  [AttendanceStatus.ABSENT]: "Không",
};
