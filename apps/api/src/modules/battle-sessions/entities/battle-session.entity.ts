/** Một trận đánh trả về cho client, thời gian ở dạng ISO string. */
export interface BattleSessionEntity {
  id: string;
  /** Nhãn hiển thị suy ra từ giờ đánh, ví dụ "Thứ 3 · 20:30". Không lưu trong database. */
  label: string;
  dateTime: string;
  /** Hạn chót điểm danh do quản trị viên đặt. */
  deadline: string;
  isGuildWar: boolean;
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ. */
  opponent: string | null;
  /** Mốc Thứ 2 00:00 của tuần chứa trận này. */
  weekStart: string;
  /** Số lượt điểm danh đã ghi — dialog xoá cần con số này. */
  attendanceCount: number;
  /** Trận này đã có đội hình xếp sẵn hay chưa. */
  hasFormation: boolean;
}

/** Một tuần điểm danh trả về cho client. */
export interface WeekEntity {
  /** Thứ 2 00:00 (ISO string) */
  weekStart: string;
  /** Thứ 7 23:59 (ISO string) */
  weekEnd: string;
  /** Có phải tuần đang mở không (phần tử còn lại là tuần kế tiếp) */
  isActive: boolean;
}
