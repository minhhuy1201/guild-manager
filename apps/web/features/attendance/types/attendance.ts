import type { AttendanceStatus, GuildClass } from "@shared/enums";

/**
 * Nhân vật trong bang hội.
 */
export interface Character {
  /** ID trong game — cũng là khóa chính của nhân vật */
  id: string;
  /** Tên nhân vật */
  name: string;
  /** Lưu phái (class) */
  guildClass: GuildClass;
}

/**
 * Một ngày đánh trong tuần (ví dụ: Thứ 7 · Guild War).
 * Mỗi ngày có hạn chót điểm danh (deadline) riêng.
 */
export interface BattleSession {
  /** ID ngày đánh */
  id: string;
  /** Nhãn hiển thị ngắn gọn (thứ + ghi chú) */
  label: string;
  /** Thời điểm diễn ra trận đánh (ISO string) */
  dateTime: string;
  /** Hạn chót điểm danh riêng của ngày này (ISO string) — quá hạn thì khóa cột */
  deadline: string;
  /** Ngày guild war (Thứ 7) — cố định, được làm nổi bật */
  isGuildWar: boolean;
}

/**
 * Thông tin tuần điểm danh hiện tại (chỉ dùng cho khoảng thời gian hiển thị).
 */
export interface Week {
  /** Ngày bắt đầu tuần (ISO string) */
  fromDate: string;
  /** Ngày kết thúc tuần (ISO string) */
  toDate: string;
}

/**
 * Một lượt điểm danh của nhân vật cho một buổi đánh.
 */
export interface AttendanceRecord {
  /** ID nhân vật */
  characterId: string;
  /** ID buổi đánh */
  sessionId: string;
  /** Trạng thái Có/Không */
  status: AttendanceStatus;
  /** Thời điểm điểm danh (ISO string) */
  markedAt: string;
}

/**
 * Khóa duy nhất cho một record: cặp (characterId, sessionId).
 * @param characterId - ID nhân vật
 * @param sessionId - ID buổi đánh
 * @returns Chuỗi khóa duy nhất
 */
export function recordKey(characterId: string, sessionId: string): string {
  return `${characterId}__${sessionId}`;
}
