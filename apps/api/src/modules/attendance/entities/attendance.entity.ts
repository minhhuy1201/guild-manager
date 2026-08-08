import type { AttendanceStatus, GuildClass } from '@guild/shared/enums';

/** Nhân vật trả về cho client ở luồng điểm danh công khai. */
export interface CharacterEntity {
  /** Khoá chính do hệ thống sinh. */
  id: string;
  name: string;
  guildClass: GuildClass;
}

/** Một lượt điểm danh của nhân vật ở một trận. */
export interface AttendanceRecordEntity {
  characterId: string;
  sessionId: string;
  status: AttendanceStatus;
  markedAt: string;
}
