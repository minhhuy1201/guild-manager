/** Một trận kèm đội hình đã lưu của nó, trả về cho client. */
export interface SessionFormationEntity {
  /** ID trận đánh */
  sessionId: string;
  /** Nhãn hiển thị của trận, ví dụ "Thứ 7 · Guild War" */
  label: string;
  /** Thời điểm đánh (ISO string) */
  dateTime: string;
  /** Trận Guild War Thứ 7 */
  isGuildWar: boolean;
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: string | null;
  /** Trận đã đánh xong — không cho sửa đội hình nữa */
  locked: boolean;
  /**
   * Đội hình từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mỗi phần tử là slotId → characterId, ô trống không có khoá.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì.
   */
  matches: Record<string, string>[];
}

/** Một tuần còn dữ liệu đội hình. */
export interface FormationWeekEntity {
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: string;
}
