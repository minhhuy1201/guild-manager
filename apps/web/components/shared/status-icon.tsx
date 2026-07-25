import { Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Semantic tone of a status icon. */
export type StatusIconTone = "success" | "danger";

/**
 * PATTERN CHUNG: trạng thái nhị phân (Có/Không, Đạt/Không đạt, Bật/Tắt...) hiển thị
 * bằng icon tròn có màu thay vì chữ — success = tick xanh, danger = X đỏ.
 * Dùng component này ở mọi bảng/thẻ có cột trạng thái để đồng nhất toàn hệ thống.
 */
const TONE: Record<StatusIconTone, { className: string; Icon: LucideIcon }> = {
  success: { className: "bg-emerald-500 text-white dark:bg-emerald-600", Icon: Check },
  danger: { className: "bg-destructive text-white", Icon: X },
};

interface StatusIconProps {
  /** Màu ngữ nghĩa: success (tick xanh) / danger (X đỏ). */
  tone: StatusIconTone;
  /** Nhãn cho screen-reader (bắt buộc — icon không có chữ hiển thị). */
  label: string;
  /** Class bổ sung (ví dụ đổi kích thước). */
  className?: string;
}

/**
 * Icon tròn biểu diễn một trạng thái nhị phân, thay cho text.
 * @param tone - Màu ngữ nghĩa (success/danger)
 * @param label - Text đọc bởi screen-reader
 * @param className - Class bổ sung, merge sau class mặc định
 * @returns Icon trạng thái có màu
 */
export function StatusIcon({ tone, label, className }: StatusIconProps) {
  const { className: toneClass, Icon } = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full",
        toneClass,
        className
      )}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
