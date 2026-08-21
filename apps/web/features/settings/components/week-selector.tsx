"use client";

import { CalendarCheck, CalendarClock } from "lucide-react";
import type { Week } from "@guild/shared/schemas";

import { DateRange } from "@/components/shared/date-range";
import { Button } from "@/components/ui/button";
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
          {week.isActive ? <CalendarCheck /> : <CalendarClock />}
          {week.isActive ? "Tuần này" : "Tuần sau"}
          <DateRange
            start={week.weekStart}
            end={week.weekEnd}
            className="opacity-70"
          />
        </Button>
      ))}
    </div>
  );
}
