/** Attendance status of a character for one battle session. */
export enum AttendanceStatus {
  PRESENT = "CO",
  ABSENT = "KHONG",
}

/** Vietnamese display label per attendance status. */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PRESENT]: "Có",
  [AttendanceStatus.ABSENT]: "Không",
};
