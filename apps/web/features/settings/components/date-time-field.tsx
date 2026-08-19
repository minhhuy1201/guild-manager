"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  joinLocalValue,
  maskDate,
  maskTime,
  parseDisplayDate,
  splitLocalValue,
  toDisplayDate,
} from "../lib/date-parts";

interface DateTimeFieldProps {
  /** Id của ô ngày, dùng cho label */
  id: string;
  /** Nhãn hiển thị phía trên */
  label: string;
  /** Giá trị dạng "YYYY-MM-DDTHH:mm", rỗng nếu chưa chọn */
  value: string;
  /** Gọi với giá trị mới; rỗng khi ngày giờ chưa hợp lệ */
  onChange: (value: string) => void;
  /** Giờ điền sẵn khi chưa có giá trị, dạng HH:mm */
  defaultTime?: string;
  /** Dòng chú thích nhỏ dưới ô, ví dụ luật giới hạn giá trị */
  description?: string;
}

/**
 * Ô nhập ngày giờ dạng dd/MM/yyyy và HH:mm, gõ tay hoặc chọn trên lịch đều được.
 * Không dùng `<input type="datetime-local">` vì trình duyệt hiển thị nó theo
 * locale của máy, máy tiếng Anh sẽ ra mm/dd/yyyy.
 * @param id - Id của ô ngày
 * @param label - Nhãn hiển thị
 * @param value - Giá trị dạng "YYYY-MM-DDTHH:mm"
 * @param onChange - Gọi với giá trị mới
 * @param defaultTime - Giờ điền sẵn khi chưa có giá trị
 * @param description - Dòng chú thích nhỏ dưới ô
 * @returns Cặp ô nhập ngày giờ kèm nút mở lịch
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
  defaultTime,
  description,
}: DateTimeFieldProps) {
  const [parts, setParts] = useState(() => splitLocalValue(value, defaultTime));
  const [emitted, setEmitted] = useState(value);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Giá trị đến từ bên ngoài (mở lại form, hạn chót tự điền) thì nạp lại hai ô.
  // Còn giá trị do chính ô này vừa gửi đi thì giữ nguyên chữ người dùng đang gõ.
  if (value !== emitted) {
    setEmitted(value);
    setParts(splitLocalValue(value, defaultTime));
  }

  const isIncomplete = Boolean(parts.date && parts.time) && emitted === "";

  /**
   * Cập nhật hai ô rồi báo giá trị ghép lại cho form.
   * @param next - Nội dung mới của hai ô
   */
  function update(next: { date: string; time: string }) {
    const joined = joinLocalValue(next.date, next.time);

    setParts(next);
    setEmitted(joined);
    onChange(joined);
  }

  /**
   * Điền ngày vừa chọn trên lịch, giữ nguyên giờ đang có.
   * @param picked - Ngày người dùng bấm trên lịch
   */
  function handlePick(picked: Date | undefined) {
    if (!picked) return;

    update({ ...parts, date: toDisplayDate(picked) });
    setCalendarOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          aria-invalid={isIncomplete || undefined}
          value={parts.date}
          onChange={(event) =>
            update({ ...parts, date: maskDate(event.target.value) })
          }
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`${label} — chọn trên lịch`}
              />
            }
          >
            <CalendarDays />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={vi}
              autoFocus
              defaultMonth={parseDisplayDate(parts.date)}
              selected={parseDisplayDate(parts.date)}
              onSelect={handlePick}
            />
          </PopoverContent>
        </Popover>
        <Input
          id={`${id}-time`}
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:mm"
          maxLength={5}
          aria-label={`${label} — giờ`}
          aria-invalid={isIncomplete || undefined}
          className="w-24"
          value={parts.time}
          onChange={(event) =>
            update({ ...parts, time: maskTime(event.target.value) })
          }
        />
      </div>
      {isIncomplete ? (
        <p className="text-sm text-destructive">
          Ngày giờ không hợp lệ. Nhập theo dạng dd/mm/yyyy và HH:mm.
        </p>
      ) : (
        description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )
      )}
    </div>
  );
}
