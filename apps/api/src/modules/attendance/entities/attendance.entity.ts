import type { AttendanceStatus, GuildClass } from '@guild/shared/enums';

/**
 * Nhân vật trả về cho client.
 * Không bao giờ chứa `passwordHash` — mật khẩu chỉ dùng để verify phía server.
 */
export interface CharacterEntity {
  /** ID trong game — khóa chính của nhân vật. */
  id: string;
  name: string;
  guildClass: GuildClass;
}

/** Một trận đánh trong tuần, thời gian ở dạng ISO string. */
export interface BattleSessionEntity {
  id: string;
  label: string;
  dateTime: string;
  /** Hạn điểm danh hiệu dụng (đã tính trần 17:00 Thứ 5). */
  deadline: string;
  isGuildWar: boolean;
}

/** Khoảng thời gian của tuần điểm danh đang mở. */
export interface WeekEntity {
  fromDate: string;
  toDate: string;
}

/** Một lượt điểm danh của nhân vật ở một trận. */
export interface AttendanceRecordEntity {
  characterId: string;
  sessionId: string;
  status: AttendanceStatus;
  markedAt: string;
}
