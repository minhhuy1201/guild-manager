import { AttendanceStatus, GuildClass } from "@shared/enums";
import {
  recordKey,
  type AttendanceRecord,
  type BattleSession,
  type Character,
  type Week,
} from "../types/attendance";

/**
 * DỮ LIỆU HARDCODE — đóng vai "backend stub" bất đồng bộ (dựng UI trước, map với BE sau).
 * `attendance-api.ts` đọc/ghi dữ liệu ở đây; component không import trực tiếp module này.
 */

/**
 * LUẬT THỜI GIAN — xem `docs/attendance-time-rules.md`. Tóm tắt:
 * - Tuần mở lúc 22:00 Thứ 7 (mở cho tuần có Guild War kế tiếp).
 * - Trận trước Thứ 5 (Thứ 2/3/4): hạn = 10:00 sáng cùng ngày đánh.
 * - Chốt sổ cả tuần lúc 17:00 Thứ 5 → trần cứng cho MỌI trận, gồm cả Guild War Thứ 7.
 * Vì trần 17h Thứ 5 được nướng sẵn vào `deadline` từng trận nên `isDeadlinePassed`
 * sẵn có tự khóa đúng, không cần sửa component.
 */

/** Ngày trong tuần theo `Date.getDay()`: 0=CN, 1=T2, ..., 6=T7. */
const SATURDAY = 6;

/** Giờ chốt sổ cả tuần (17:00 Thứ 5) và giờ mở tuần mới (22:00 Thứ 7). */
const WEEK_CUTOFF_HOUR = 17; // Thứ 5
const WEEK_OPEN_HOUR = 22; // Thứ 7

/**
 * Tạo Date từ một mốc gốc, cộng thêm số ngày và đặt giờ/phút cụ thể (giây = 0).
 * @param base - Mốc gốc
 * @param deltaDays - Số ngày cộng thêm (âm = lùi về trước)
 * @param hour - Giờ đặt (0-23)
 * @param minute - Phút đặt (0-59)
 * @returns Date mới tại mốc yêu cầu
 */
function shiftDate(base: Date, deltaDays: number, hour: number, minute: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + deltaDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Xác định Thứ 7 (Guild War) của TUẦN ĐIỂM DANH đang mở tại thời điểm `now`.
 * Quy tắc: tuần mở lúc 22:00 Thứ 7 và mở cho Guild War của Thứ 7 KẾ TIẾP.
 * → Guild War đang mở = (Thứ 7 gần nhất có mốc 22:00 ≤ now) + 7 ngày.
 * @param now - Thời điểm hiện tại
 * @returns Date đặt tại 00:00 của Thứ 7 (Guild War) tuần đang mở
 */
function activeGuildWarSaturday(now: Date): Date {
  // Thứ 7 của tuần hiện tại (theo lịch), đặt tại mốc mở 22:00.
  const daysSinceSaturday = (now.getDay() - SATURDAY + 7) % 7;
  let anchorOpen = shiftDate(now, -daysSinceSaturday, WEEK_OPEN_HOUR, 0);
  // Nếu mốc 22:00 Thứ 7 đó còn ở tương lai (đang là Thứ 7 trước 22h, hoặc
  // ngày thường mà Thứ 7 tính ra rơi vào tương lai) thì lùi về Thứ 7 tuần trước.
  if (anchorOpen.getTime() > now.getTime()) {
    anchorOpen = shiftDate(anchorOpen, -7, WEEK_OPEN_HOUR, 0);
  }
  // Guild War đang mở là Thứ 7 kế tiếp mốc mở đó.
  return shiftDate(anchorOpen, 7, 0, 0);
}

/**
 * Mẫu cấu hình một trận: lệch bao nhiêu ngày so với Thứ 7 (Guild War) + giờ đánh.
 * `dayOffsetFromSaturday`: 0=Thứ 7, -2=Thứ 5, -4=Thứ 3... (âm = sớm hơn trong tuần).
 */
interface SessionTemplate {
  id: string;
  label: string;
  dayOffsetFromSaturday: number;
  hour: number;
  minute: number;
  isGuildWar: boolean;
}

/** Các trận trong tuần (ngày đánh linh hoạt — chỉnh ở đây). */
const SESSION_TEMPLATES: SessionTemplate[] = [
  { id: "s1", label: "Thứ 3 · 20:30", dayOffsetFromSaturday: -4, hour: 20, minute: 30, isGuildWar: false },
  { id: "s2", label: "Thứ 5 · 20:30", dayOffsetFromSaturday: -2, hour: 20, minute: 30, isGuildWar: false },
  { id: "s3", label: "Thứ 7 · Guild War", dayOffsetFromSaturday: 0, hour: 20, minute: 0, isGuildWar: true },
];

/** Lệch ngày của Thứ 5 so với Thứ 7 (dùng để tính trần chốt sổ 17h Thứ 5). */
const THURSDAY_OFFSET_FROM_SATURDAY = -2;

/**
 * Tính danh sách trận + deadline cho tuần đang mở tại thời điểm `now`.
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns Mảng buổi đánh với `dateTime`/`deadline` đã tính theo luật
 */
export function getBattleSessions(now: Date = new Date()): BattleSession[] {
  const guildWarSaturday = activeGuildWarSaturday(now);
  // Trần cứng: chốt sổ toàn tuần lúc 17:00 Thứ 5.
  const weekCutoff = shiftDate(
    guildWarSaturday,
    THURSDAY_OFFSET_FROM_SATURDAY,
    WEEK_CUTOFF_HOUR,
    0
  );

  return SESSION_TEMPLATES.map((template) => {
    const dateTime = shiftDate(
      guildWarSaturday,
      template.dayOffsetFromSaturday,
      template.hour,
      template.minute
    );

    // Trận trước Thứ 5 → hạn 10:00 sáng cùng ngày; còn lại dùng thẳng trần chốt sổ.
    const isBeforeThursday =
      template.dayOffsetFromSaturday < THURSDAY_OFFSET_FROM_SATURDAY;
    const ownDeadline = isBeforeThursday
      ? shiftDate(guildWarSaturday, template.dayOffsetFromSaturday, 10, 0)
      : weekCutoff;
    // Không bao giờ muộn hơn trần chốt sổ cả tuần.
    const deadline =
      ownDeadline.getTime() < weekCutoff.getTime() ? ownDeadline : weekCutoff;

    return {
      id: template.id,
      label: template.label,
      dateTime: dateTime.toISOString(),
      deadline: deadline.toISOString(),
      isGuildWar: template.isGuildWar,
    };
  });
}

/**
 * Tính tuần điểm danh đang mở (Thứ 2 → Thứ 7 của tuần chứa Guild War).
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns Khoảng thời gian tuần để hiển thị timeline
 */
export function getCurrentWeek(now: Date = new Date()): Week {
  const guildWarSaturday = activeGuildWarSaturday(now);
  return {
    fromDate: shiftDate(guildWarSaturday, -5, 0, 0).toISOString(), // Thứ 2 00:00
    toDate: shiftDate(guildWarSaturday, 0, 23, 59).toISOString(), // Thứ 7 23:59
  };
}

/**
 * Danh sách nhân vật trong bang.
 * `password` là mật khẩu điểm danh riêng (mock) — dùng dạng `pass{gameId}` cho dễ test.
 */
export const CHARACTERS: Character[] = [
  { id: "c1", name: "Mèo Béo", gameId: "10001", guildClass: GuildClass.CUU_LINH, password: "pass10001" },
  { id: "c2", name: "Tiểu Long Nữ", gameId: "10002", guildClass: GuildClass.THAN_TUONG, password: "pass10002" },
  { id: "c3", name: "Cẩu Tạp Chủng", gameId: "10003", guildClass: GuildClass.HUYET_HA, password: "pass10003" },
  { id: "c4", name: "Trương Tam Phong", gameId: "10004", guildClass: GuildClass.LONG_NGAM, password: "pass10004" },
  { id: "c5", name: "Hắc Miêu", gameId: "10005", guildClass: GuildClass.THIET_Y, password: "pass10005" },
  { id: "c6", name: "Kim Mao Sư", gameId: "10006", guildClass: GuildClass.TOAI_MONG, password: "pass10006" },
  { id: "c7", name: "Chu Chỉ Nhược", gameId: "10007", guildClass: GuildClass.TO_VAN, password: "pass10007" },
  { id: "c8", name: "Hồng Thất Công", gameId: "10008", guildClass: GuildClass.HUYET_HA, password: "pass10008" },
  { id: "c9", name: "Du Thản Chi", gameId: "10009", guildClass: GuildClass.LONG_NGAM, password: "pass10009" },
  { id: "c10", name: "Mèo Mướp", gameId: "10010", guildClass: GuildClass.THIET_Y, password: "pass10010" },
  { id: "c11", name: "Lệnh Hồ Xung", gameId: "10011", guildClass: GuildClass.CUU_LINH, password: "pass10011" },
  { id: "c12", name: "Nhậm Doanh Doanh", gameId: "10012", guildClass: GuildClass.THAN_TUONG, password: "pass10012" },
  { id: "c13", name: "Nhạc Bất Quần", gameId: "10013", guildClass: GuildClass.HUYET_HA, password: "pass10013" },
  { id: "c14", name: "Nhạc Linh San", gameId: "10014", guildClass: GuildClass.TO_VAN, password: "pass10014" },
  { id: "c15", name: "Lâm Bình Chi", gameId: "10015", guildClass: GuildClass.LONG_NGAM, password: "pass10015" },
  { id: "c16", name: "Điền Bá Quang", gameId: "10016", guildClass: GuildClass.THIET_Y, password: "pass10016" },
  { id: "c17", name: "Nghi Lâm", gameId: "10017", guildClass: GuildClass.TOAI_MONG, password: "pass10017" },
  { id: "c18", name: "Lam Phượng Hoàng", gameId: "10018", guildClass: GuildClass.THAN_TUONG, password: "pass10018" },
  { id: "c19", name: "Đông Phương Bất Bại", gameId: "10019", guildClass: GuildClass.CUU_LINH, password: "pass10019" },
  { id: "c20", name: "Hướng Vấn Thiên", gameId: "10020", guildClass: GuildClass.HUYET_HA, password: "pass10020" },
  { id: "c21", name: "Mạc Đại", gameId: "10021", guildClass: GuildClass.LONG_NGAM, password: "pass10021" },
  { id: "c22", name: "Lưu Chính Phong", gameId: "10022", guildClass: GuildClass.TO_VAN, password: "pass10022" },
  { id: "c23", name: "Định Dật", gameId: "10023", guildClass: GuildClass.THIET_Y, password: "pass10023" },
  { id: "c24", name: "Phương Chứng", gameId: "10024", guildClass: GuildClass.TOAI_MONG, password: "pass10024" },
  { id: "c25", name: "Xung Hư", gameId: "10025", guildClass: GuildClass.CUU_LINH, password: "pass10025" },
];

/** Một vài lượt điểm danh có sẵn (để bảng lịch sử không trống). */
const INITIAL_RECORDS: AttendanceRecord[] = [
  {
    characterId: "c1",
    sessionId: "s1",
    status: AttendanceStatus.PRESENT,
    markedAt: "2026-07-06T18:12:00",
  },
  {
    characterId: "c1",
    sessionId: "s2",
    status: AttendanceStatus.PRESENT,
    markedAt: "2026-07-06T18:12:00",
  },
  {
    characterId: "c3",
    sessionId: "s1",
    status: AttendanceStatus.ABSENT,
    markedAt: "2026-07-06T19:40:00",
  },
  {
    characterId: "c5",
    sessionId: "s3",
    status: AttendanceStatus.PRESENT,
    markedAt: "2026-07-08T20:05:00",
  },
];

/**
 * Chuyển mảng record ban đầu thành map theo khóa.
 * @param records - Danh sách record ban đầu
 * @returns Map record theo khóa duy nhất
 */
function buildInitialRecords(
  records: AttendanceRecord[]
): Record<string, AttendanceRecord> {
  const map: Record<string, AttendanceRecord> = {};
  for (const record of records) {
    map[recordKey(record.characterId, record.sessionId)] = record;
  }
  return map;
}

/**
 * Kho record trong bộ nhớ — mô phỏng backend giữ trạng thái giữa các lần "gọi API".
 * Không export trực tiếp; truy cập qua getter/setter bên dưới.
 */
let recordsStore: Record<string, AttendanceRecord> =
  buildInitialRecords(INITIAL_RECORDS);

/**
 * Lấy snapshot hiện tại của kho record (bản sao để không lộ tham chiếu nội bộ).
 * @returns Map record theo khóa
 */
export function getRecordsSnapshot(): Record<string, AttendanceRecord> {
  return { ...recordsStore };
}

/**
 * Ghi/ghi đè một record vào kho.
 * @param record - Record cần lưu
 */
export function upsertRecord(record: AttendanceRecord): void {
  recordsStore = {
    ...recordsStore,
    [recordKey(record.characterId, record.sessionId)]: record,
  };
}
