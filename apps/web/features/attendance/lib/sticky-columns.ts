/**
 * Lớp CSS ghim hai cột ngoài cùng của bảng điểm danh khi cuộn ngang trên màn
 * hình hẹp: cột tên bám trái, cột thao tác bám phải. Nền `bg-card` phải đục để
 * nội dung cuộn không lộ ra phía dưới cột ghim.
 */

/** Cột "Thành viên" — ghim mép trái vùng cuộn. */
export const STICKY_NAME_COLUMN = "sticky left-0 z-10 border-r bg-card";

/** Cột "Thao tác" — ghim mép phải vùng cuộn. */
export const STICKY_ACTION_COLUMN =
  "sticky right-0 z-10 w-28 border-l bg-card text-right";
