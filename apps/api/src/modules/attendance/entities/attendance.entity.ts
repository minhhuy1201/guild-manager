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

/** Một lượt điểm danh của nhân vật ở một trận. */
export interface AttendanceRecordEntity {
  characterId: string;
  sessionId: string;
  status: AttendanceStatus;
  markedAt: string;
}
