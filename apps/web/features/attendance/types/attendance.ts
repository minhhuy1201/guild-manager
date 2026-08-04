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
 * Một ngày đánh trong tuần — đúng shape backend trả về.
 * Nhãn do server suy ra từ giờ đánh, client không tự dựng.
 */
export interface BattleSession {
  /** ID ngày đánh */
  id: string;
  /** Nhãn hiển thị, ví dụ "Thứ 3 · 20:30" */
  label: string;
  /** Thời điểm diễn ra trận đánh (ISO string) */
  dateTime: string;
  /** Hạn chót điểm danh (ISO string) — quá hạn thì khóa cột */
  deadline: string;
  /** Ngày guild war — được làm nổi bật, không xoá được */
  isGuildWar: boolean;
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: string | null;
  /** Mốc Thứ 2 00:00 của tuần chứa trận này (ISO string) */
  weekStart: string;
  /** Số lượt điểm danh đã ghi cho trận này */
  attendanceCount: number;
  /** Trận đã có đội hình xếp sẵn hay chưa */
  hasFormation: boolean;
}

/** Một tuần điểm danh. */
export interface Week {
  /** Thứ 2 00:00 (ISO string) */
  weekStart: string;
  /** Thứ 7 23:59 (ISO string) */
  weekEnd: string;
  /** Có phải tuần đang mở không */
  isActive: boolean;
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
