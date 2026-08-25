"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The page-size options offered to the user. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Default page size for tables. */
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

interface PageSizeSelectProps {
  /** Currently selected page size. */
  value: number;
  /** Called when the user changes the page size. */
  onValueChange: (pageSize: number) => void;
  /** Trigger id, for attaching an external label. */
  id?: string;
}

/**
 * The shared page-size picker for tables — controlled by the parent component.
 * @param value - Currently selected page size
 * @param onValueChange - Called when the user picks another size
 * @param id - Trigger id
 * @returns The page-size select
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
