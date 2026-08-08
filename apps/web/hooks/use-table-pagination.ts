"use client";

import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/shared/page-size-select";

interface UseTablePaginationOptions<TItem> {
  /** Toàn bộ danh sách đã lọc, chưa cắt trang. */
  items: TItem[];
  /**
   * Giá trị mô tả bộ lọc hiện tại (từ khoá, lưu phái, mảng đã lọc...).
   * Đổi giá trị này sẽ đưa về trang 1 để không kẹt ở trang trống.
   */
  resetKey?: unknown;
  /** Số hàng mỗi trang lúc đầu (mặc định DEFAULT_PAGE_SIZE). */
  initialPageSize?: number;
}

interface TablePaginationState<TItem> {
  /** Trang đang xem, đã kẹp trong [1, pageCount]. */
  page: number;
  /** Tổng số trang (tối thiểu 1). */
  pageCount: number;
  /** Số hàng mỗi trang đang chọn. */
  pageSize: number;
  /** Tổng số phần tử trước khi cắt trang. */
  total: number;
  /** Phần tử của trang hiện tại. */
  pagedItems: TItem[];
  /** Chuyển sang trang khác. */
  setPage: (page: number) => void;
  /** Đổi số hàng mỗi trang, tự đưa về trang 1. */
  setPageSize: (pageSize: number) => void;
}

/**
 * State phân trang phía client dùng chung cho các bảng.
 * Tự đưa về trang 1 khi bộ lọc đổi và luôn kẹp trang trong khoảng hợp lệ,
 * nên xoá bớt phần tử ở trang cuối cũng không rơi vào trang trống.
 * @param options - items, resetKey, initialPageSize
 * @returns State và phần tử đã cắt theo trang
 */
export function useTablePagination<TItem>({
  items,
  resetKey,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: UseTablePaginationOptions<TItem>): TablePaginationState<TItem> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  // Điều chỉnh state ngay trong render thay vì useEffect (tránh cascading render).
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);

  /**
   * Đổi số hàng mỗi trang và quay về trang đầu cho khỏi lệch ngữ cảnh.
   * @param next - Số hàng mỗi trang mới
   */
  const setPageSize = (next: number) => {
    setPageSizeState(next);
    setPage(1);
  };

  return {
    page: safePage,
    pageCount,
    pageSize,
    total: items.length,
    pagedItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    setPage,
    setPageSize,
  };
}
