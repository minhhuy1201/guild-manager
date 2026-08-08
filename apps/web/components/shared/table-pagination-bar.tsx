"use client";

import { PageSizeSelect } from "@/components/shared/page-size-select";
import { TablePagination } from "@/components/shared/table-pagination";

interface TablePaginationBarProps {
  /** Trang hiện tại (1-based). */
  page: number;
  /** Tổng số trang. */
  pageCount: number;
  /** Số hàng mỗi trang đang chọn. */
  pageSize: number;
  /** Tổng số phần tử trước khi cắt trang. */
  total: number;
  /** Gọi khi người dùng chọn trang khác. */
  onPageChange: (page: number) => void;
  /** Gọi khi người dùng đổi số hàng mỗi trang. */
  onPageSizeChange: (pageSize: number) => void;
  /** Danh từ đếm phần tử, ví dụ "thành viên". */
  itemLabel: string;
  /** ID cho select số hàng mỗi trang — cần duy nhất khi có nhiều bảng trên một trang. */
  pageSizeId?: string;
}

/**
 * Thanh chân bảng dùng chung: chọn số hàng mỗi trang, tóm tắt số lượng và điều hướng trang.
 * Đi cặp với `useTablePagination` — trải thẳng state của hook vào đây là xong.
 * @param props - page, pageCount, pageSize, total, callback và nhãn
 * @returns Thanh chân bảng
 */
export function TablePaginationBar({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel,
  pageSizeId,
}: TablePaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <PageSizeSelect
          id={pageSizeId}
          value={pageSize}
          onValueChange={onPageSizeChange}
        />
        <p className="text-sm text-muted-foreground">
          {total} {itemLabel} · trang {page}/{pageCount}
        </p>
      </div>
      <TablePagination
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
