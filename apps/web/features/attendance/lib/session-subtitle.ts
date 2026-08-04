import { formatTime } from "@/lib/format";

/** Các trường của một trận cần để dựng dòng phụ. */
interface SessionSubtitleInput {
  /** Trận Guild War — không có đối thủ */
  isGuildWar: boolean;
  /** Thời điểm đánh (ISO string) */
  dateTime: string;
  /** Tên bang đối thủ, null nếu chưa chốt */
  opponent: string | null;
}

/**
 * Dòng phụ hiển thị dưới nhãn ngày đánh.
 * Guild War chỉ hiện giờ đánh; trận thường hiện tên bang đối thủ, và nếu chưa có
 * thì nói thẳng là chưa có để quản trị viên biết còn thiếu thông tin.
 * @param session - Trận cần hiển thị
 * @returns Dòng phụ đã dựng
 */
export function getSessionSubtitle(session: SessionSubtitleInput): string {
  if (session.isGuildWar) return formatTime(session.dateTime);

  return session.opponent ? `VS: ${session.opponent}` : "Chưa có đối thủ";
}
