import { ArrowRight } from "lucide-react";

import { formatDate, formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DateRangeProps {
  /** Chuỗi ISO ngày bắt đầu */
  start: string;
  /** Chuỗi ISO ngày kết thúc */
  end: string;
  /** Hiện năm (dd/MM/yyyy) thay vì chỉ ngày/tháng */
  withYear?: boolean;
  /** Class bổ sung, merge sau class mặc định */
  className?: string;
}

/**
 * PATTERN CHUNG: mọi khoảng ngày trong giao diện hiển thị dạng
 * "03/08 →(icon) 08/08" — mũi tên là icon để cân thị giác thay vì dấu "->",
 * kèm chữ "đến" cho screen-reader vì icon không đọc được.
 * @param start - Chuỗi ISO ngày bắt đầu
 * @param end - Chuỗi ISO ngày kết thúc
 * @param withYear - Hiện năm nếu cần phân biệt các năm khác nhau
 * @param className - Class bổ sung
 * @returns Khoảng ngày đã định dạng
 */
export function DateRange({
  start,
  end,
  withYear = false,
  className,
}: DateRangeProps) {
  const format = withYear ? formatDate : formatDayMonth;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {format(start)}
      <ArrowRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span className="sr-only">đến</span>
      {format(end)}
    </span>
  );
}
