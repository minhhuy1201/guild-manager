"use client";

import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/shared/page-size-select";

interface UseTablePaginationOptions<TItem> {
  /** The whole filtered list, before paging. */
  items: TItem[];
  /**
   * A value describing the current filter (search text, classes, the filtered array…).
   * Changing it resets to page 1 so the table cannot get stuck on an empty page.
   */
  resetKey?: unknown;
  /** Initial page size (defaults to DEFAULT_PAGE_SIZE). */
  initialPageSize?: number;
}

export interface TablePaginationState<TItem> {
  /** Current page, clamped to [1, pageCount]. */
  page: number;
  /** Total number of pages (at least 1). */
  pageCount: number;
  /** Currently selected page size. */
  pageSize: number;
  /** Total items before paging. */
  total: number;
  /** Items on the current page. */
  pagedItems: TItem[];
  /** Go to another page. */
  setPage: (page: number) => void;
  /** Change the page size, resetting to page 1. */
  setPageSize: (pageSize: number) => void;
}

/**
 * The shared client-side pagination state for tables.
 * It resets to page 1 when the filter changes and always clamps the page to a valid range, so deleting
 * the last page's items never lands on an empty page.
 * @param options - items, resetKey, initialPageSize
 * @returns The state and the current page's items
 */
export function useTablePagination<TItem>({
  items,
  resetKey,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: UseTablePaginationOptions<TItem>): TablePaginationState<TItem> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  // Adjusted during render rather than in a useEffect (avoids a cascading render).
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);

  /**
   * Change the page size and return to the first page, so the context does not jump.
   * @param next - The new page size
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
