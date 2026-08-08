/** Đội hình trên dây: slotId → characterId. Ô trống không có khoá. */
export type WireAssignment = Record<string, string>;

/** Ghi chú trên dây: slotId → text. Ô không ghi gì không có khoá. */
export type WireNotes = Record<string, string>;

/** Một trận đúng như backend trả về: đội hình và ghi chú của nó. */
export interface WireMatch {
  /** slotId → characterId, ô trống không có khoá */
  slots: WireAssignment;
  /** slotId → ghi chú, ô không ghi gì không có khoá */
  notes: WireNotes;
}

/** Một trận kèm đội hình đã lưu, đúng như backend trả về. */
export interface SessionFormation {
  /** ID trận đánh */
  sessionId: string;
  /** Nhãn hiển thị, ví dụ "Thứ 7 · Guild War" */
  label: string;
  /** Thời điểm đánh (ISO string) */
  dateTime: string;
  /** Trận Guild War Thứ 7 */
  isGuildWar: boolean;
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: string | null;
  /** Trận đã đánh xong — không sửa được nữa */
  locked: boolean;
  /**
   * Từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì và cũng chưa ghi chú gì.
   */
  matches: WireMatch[];
}

/** Một tuần còn dữ liệu đội hình. */
export interface FormationWeek {
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: string;
  /**
   * Tuần điểm danh đang mở. Danh sách còn có cả tuần kế tiếp — tuần đầu mảng
   * KHÔNG phải tuần đang mở, nên phải đọc cờ này.
   */
  isActive: boolean;
}
