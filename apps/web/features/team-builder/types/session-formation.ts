/** Đội hình trên dây: slotId → characterId. Ô trống không có khoá. */
export type WireAssignment = Record<string, string>;

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
  /** Đội hình đã lưu. Rỗng nghĩa là chưa xếp. */
  assignment: WireAssignment;
}

/** Một tuần còn dữ liệu đội hình. */
export interface FormationWeek {
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: string;
}
