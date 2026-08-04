"use client";

import { Button } from "@/components/ui/button";
import type { Week } from "@/features/attendance";
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
  /** Hai tuần thiết lập được: tuần đang mở và tuần kế tiếp */
  weeks: Week[];
  /** Mốc Thứ 2 của tuần đang xem */
  value: string;
  /** Gọi khi người dùng đổi tuần */
  onChange: (weekStart: string) => void;
}

/**
 * Hiển thị một tuần dạng "20/07 – 25/07".
 * @param week - Tuần cần hiển thị
 * @returns Khoảng ngày tiếng Việt
 */
function formatRange(week: Week): string {
  const format = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${format.format(new Date(week.weekStart))} – ${format.format(
    new Date(week.weekEnd)
  )}`;
}

/**
 * Chọn tuần cần thiết lập. Chỉ có đúng hai lựa chọn nên dùng hai nút thay vì
 * select — nhanh hơn một thao tác và nhìn thấy ngay cả hai.
 * @param weeks - Hai tuần thiết lập được
 * @param value - Mốc Thứ 2 của tuần đang xem
 * @param onChange - Gọi khi người dùng đổi tuần
 * @returns Thanh chọn tuần
 */
export function WeekSelector({ weeks, value, onChange }: WeekSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {weeks.map((week) => (
        <Button
          key={week.weekStart}
          variant={week.weekStart === value ? "secondary" : "ghost"}
          size="sm"
          aria-current={week.weekStart === value ? "true" : undefined}
          className={cn(week.weekStart !== value && "text-muted-foreground")}
          onClick={() => onChange(week.weekStart)}
        >
          {week.isActive ? "Tuần này" : "Tuần sau"}
          <span className="opacity-70">{formatRange(week)}</span>
        </Button>
      ))}
    </div>
  );
}
