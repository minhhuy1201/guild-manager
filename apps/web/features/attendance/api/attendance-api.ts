import type { AttendanceStatus } from "@shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
  Week,
} from "../types/attendance";
import {
  CHARACTERS,
  getBattleSessions,
  getCurrentWeek,
  getRecordsSnapshot,
  upsertRecord,
} from "./mock-data";

/**
 * Query key factory cho domain điểm danh.
 * Dùng chung cho mọi useQuery/invalidateQueries của feature này.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  characters: () => [...attendanceKeys.all, "characters"] as const,
  sessions: () => [...attendanceKeys.all, "sessions"] as const,
  week: () => [...attendanceKeys.all, "week"] as const,
  records: () => [...attendanceKeys.all, "records"] as const,
};

/**
 * Kiểm tra đã quá hạn điểm danh (deadline) hay chưa.
 * @param deadline - Hạn chót cần kiểm tra (ISO string)
 * @returns true nếu hiện tại đã quá deadline
 */
export function isDeadlinePassed(deadline: string): boolean {
  return Date.now() > new Date(deadline).getTime();
}

/**
 * Lấy danh sách nhân vật trong bang.
 * @returns Promise trả về mảng nhân vật
 */
export async function fetchCharacters(): Promise<Character[]> {
  return CHARACTERS;
}

/**
 * Lấy danh sách buổi đánh trong tuần.
 * @returns Promise trả về mảng buổi đánh
 */
export async function fetchBattleSessions(): Promise<BattleSession[]> {
  return getBattleSessions();
}

/**
 * Lấy thông tin tuần điểm danh hiện tại.
 * @returns Promise trả về tuần hiện tại
 */
export async function fetchCurrentWeek(): Promise<Week> {
  return getCurrentWeek();
}

/**
 * Lấy toàn bộ record điểm danh hiện có.
 * @returns Promise trả về map record theo khóa
 */
export async function fetchAttendanceRecords(): Promise<
  Record<string, AttendanceRecord>
> {
  return getRecordsSnapshot();
}

/** Tham số điểm danh cho một nhân vật ở một buổi đánh. */
export interface MarkAttendanceInput {
  /** ID nhân vật */
  characterId: string;
  /** ID buổi đánh */
  sessionId: string;
  /** Trạng thái Có/Không */
  status: AttendanceStatus;
  /** Mật khẩu điểm danh */
  password: string;
}

/**
 * Điểm danh cho một nhân vật ở một buổi đánh (validation phía "server").
 * Ném lỗi nếu sai mật khẩu hoặc đã quá hạn.
 * @param input - Thông tin điểm danh
 * @returns Promise trả về record vừa ghi
 */
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<AttendanceRecord> {
  const { characterId, sessionId, status, password } = input;

  // Early throw: không tìm thấy nhân vật.
  const character = CHARACTERS.find((c) => c.id === characterId);
  if (!character) {
    throw new Error("Không tìm thấy thành viên.");
  }

  // Early throw: sai mật khẩu của chính nhân vật này.
  if (password.trim() !== character.password) {
    throw new Error("Sai mật khẩu thành viên.");
  }

  // Early throw: không tìm thấy ngày đánh.
  const session = getBattleSessions().find((s) => s.id === sessionId);
  if (!session) {
    throw new Error("Không tìm thấy ngày đánh.");
  }

  // Early throw: quá hạn điểm danh của chính ngày này.
  if (isDeadlinePassed(session.deadline)) {
    throw new Error("Đã quá hạn điểm danh ngày này.");
  }

  const record: AttendanceRecord = {
    characterId,
    sessionId,
    status,
    markedAt: new Date().toISOString(),
  };
  upsertRecord(record);
  return record;
}
