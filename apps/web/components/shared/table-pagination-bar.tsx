"use client";

import { PageSizeSelect } from "@/components/shared/page-size-select";
import { TablePagination } from "@/components/shared/table-pagination";

interface TablePaginationBarProps {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Currently selected page size. */
  pageSize: number;
  /** Total items before paging. */
  total: number;
  /** Called when the user picks another page. */
  onPageChange: (page: number) => void;
  /** Called when the user changes the page size. */
  onPageSizeChange: (pageSize: number) => void;
  /** Noun counting the items, e.g. "thành viên". */
  itemLabel: string;
  /** Id for the page-size select — must be unique when a page holds several tables. */
  pageSizeId?: string;
}

/**
 * The shared table footer: page size, a count summary and page navigation.
 * Pairs with `useTablePagination` — spread the hook's state straight in.
 * @param props - page, pageCount, pageSize, total, callbacks and labels
 * @returns The table footer bar
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
