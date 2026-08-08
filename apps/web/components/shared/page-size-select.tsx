"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Các mức số hàng mỗi trang cho người dùng chọn. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Số hàng mỗi trang mặc định cho các bảng. */
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

interface PageSizeSelectProps {
  /** Số hàng mỗi trang đang chọn. */
  value: number;
  /** Gọi khi người dùng đổi số hàng mỗi trang. */
  onValueChange: (pageSize: number) => void;
  /** ID cho trigger, dùng khi cần gắn label bên ngoài. */
  id?: string;
}

/**
 * Bộ chọn số hàng mỗi trang dùng chung cho các bảng — controlled từ component cha.
 * @param value - Số hàng mỗi trang đang chọn
 * @param onValueChange - Gọi khi người dùng đổi mức
 * @param id - ID cho trigger
 * @returns Select số hàng mỗi trang
 */
export function PageSizeSelect({
  value,
  onValueChange,
  id,
}: PageSizeSelectProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next))}
    >
      <SelectTrigger id={id} aria-label="Số hàng mỗi trang" className="w-32">
        <SelectValue>{value} / trang</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {PAGE_SIZE_OPTIONS.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option} / trang
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
