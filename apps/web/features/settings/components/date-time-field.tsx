"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  joinLocalValue,
  maskDate,
  maskTime,
  splitLocalValue,
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
}

/**
 * Ô nhập ngày giờ dạng dd/MM/yyyy và HH:mm. Không dùng `<input
 * type="datetime-local">` vì trình duyệt hiển thị nó theo locale của máy, máy
 * tiếng Anh sẽ ra mm/dd/yyyy.
 * @param id - Id của ô ngày
 * @param label - Nhãn hiển thị
 * @param value - Giá trị dạng "YYYY-MM-DDTHH:mm"
 * @param onChange - Gọi với giá trị mới
 * @returns Cặp ô nhập ngày và giờ
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
}: DateTimeFieldProps) {
  const [parts, setParts] = useState(() => splitLocalValue(value));
  const [emitted, setEmitted] = useState(value);

  // Giá trị đến từ bên ngoài (mở lại form, hạn chót tự điền) thì nạp lại hai ô.
  // Còn giá trị do chính ô này vừa gửi đi thì giữ nguyên chữ người dùng đang gõ.
  if (value !== emitted) {
    setEmitted(value);
    setParts(splitLocalValue(value));
  }

  const isIncomplete = Boolean(parts.date && parts.time) && emitted === "";

  /**
   * Cập nhật một ô rồi báo giá trị ghép lại cho form.
   * @param next - Nội dung mới của hai ô
   */
  function update(next: { date: string; time: string }) {
    const joined = joinLocalValue(next.date, next.time);

    setParts(next);
    setEmitted(joined);
    onChange(joined);
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
      {isIncomplete && (
        <p className="text-sm text-destructive">
          Ngày giờ không hợp lệ. Nhập theo dạng dd/mm/yyyy và HH:mm.
        </p>
      )}
    </div>
  );
}
