import type { QueryKey } from "@tanstack/react-query";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { memberKeys } from "@/features/members/api/members-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";

/**
 * Mọi chủ đề dữ liệu mà một thao tác ghi có thể làm cũ đi.
 * Là nguồn duy nhất của tên chủ đề: `CacheTopic` sinh ra từ đây, nên thêm một
 * chủ đề mà quên khai phụ thuộc là lỗi biên dịch.
 */
export const CACHE_TOPICS = [
  "roster",
  "schedule",
  "attendance",
  "attendance-window",
  "formation",
] as const;

/** Loại dữ liệu có thể bị một thao tác ghi làm cũ đi. */
export type CacheTopic = (typeof CACHE_TOPICS)[number];

/**
 * Query key nào phải invalidate khi một chủ đề bị ghi. Đọc như một câu domain:
 * "đổi lịch đánh thì lịch, điểm danh và đội hình đều cũ".
 *
 * Đây là chỗ duy nhất trong app được import key factory của feature khác: quan
 * hệ "dữ liệu nào làm cũ dữ liệu nào" là kiến thức xuyên feature, không feature
 * nào sở hữu nó.
 *
 * Giá trị là thunk chứ không phải mảng dựng sẵn, để key factory chỉ chạy lúc
 * invalidate — thứ tự nạp module không ảnh hưởng gì.
 */
export const CACHE_DEPENDENTS: Record<CacheTopic, () => QueryKey[]> = {
  /**
   * Bảng điểm danh và trang Xếp team đều liệt kê nhân vật, thiếu chỗ nào là
   * các màn lệch nhau cho tới lần tải lại trang.
   */
  roster: () => [
    memberKeys.all,
    attendanceKeys.characters(),
    attendanceKeys.records(),
    teamBuilderKeys.all,
  ],
  /**
   * Bảng điểm danh đổi số cột và trang Xếp team đổi số tab, nên thiếu chỗ nào
   * là hai màn lệch nhau cho tới lần tải lại trang.
   */
  schedule: () => [
    settingsKeys.all,
    attendanceKeys.sessions(),
    attendanceKeys.records(),
    teamBuilderKeys.all,
  ],
  /** Điểm danh một ô chỉ đổi record; cột và danh sách nhân vật không đổi. */
  attendance: () => [attendanceKeys.records()],
  /**
   * Deadline trôi qua thì cột phải khoá lại: `isDeadlinePassed` do server tính
   * và đi kèm session, nên phải nạp lại cả trận lẫn record. Lịch đánh không
   * đổi, nên đây không phải `schedule`.
   */
  "attendance-window": () => [
    attendanceKeys.sessions(),
    attendanceKeys.records(),
  ],
  /** Lưu đội hình chỉ đụng dữ liệu của chính trang Xếp team. */
  formation: () => [teamBuilderKeys.all],
};
