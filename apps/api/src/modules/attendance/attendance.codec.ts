import type { AttendanceStatus } from '@guild/shared/enums';
import {
  attendanceRecordSchema,
  type AttendanceRecord,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';

/** Những cột của bảng AttendanceRecord mà codec cần để dựng response. */
export type AttendanceRecordRow = {
  characterId: string;
  sessionId: string;
  status: string;
  markedAt: Date;
};

/**
 * Đổi một hàng AttendanceRecord thành object trả cho client.
 * @param row - Hàng đọc từ Prisma
 * @returns Lượt điểm danh đúng shape contract, thời điểm ở dạng ISO string
 */
export function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return verifyResponse(attendanceRecordSchema, {
    characterId: row.characterId,
    sessionId: row.sessionId,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn. `verifyResponse` là thứ
    // khẳng định câu đó ngoài production: cast không được biên dịch viên kiểm.
    status: row.status as AttendanceStatus,
    markedAt: row.markedAt.toISOString(),
  } satisfies AttendanceRecord);
}
