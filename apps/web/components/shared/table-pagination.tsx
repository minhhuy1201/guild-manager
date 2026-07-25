"use client";

import type { MouseEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

/** Sentinel cho vị trí "..." trong dãy trang. */
const ELLIPSIS = "ellipsis" as const;

/**
 * Tính dãy trang hiển thị quanh trang hiện tại, chèn "..." khi quá nhiều trang.
 * Luôn giữ trang đầu/cuối và một cửa sổ quanh trang hiện tại.
 * @param page - Trang hiện tại (1-based)
 * @param pageCount - Tổng số trang
 * @param siblings - Số trang kề mỗi bên trang hiện tại
 * @returns Mảng số trang hoặc sentinel ELLIPSIS
 */
function getPageItems(
  page: number,
  pageCount: number,
  siblings = 1
): (number | typeof ELLIPSIS)[] {
  // Ít trang thì hiện hết cho gọn.
  const totalSlots = siblings * 2 + 5;
  if (pageCount <= totalSlots) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, pageCount - 1);
  const items: (number | typeof ELLIPSIS)[] = [1];

  if (left > 2) items.push(ELLIPSIS);
  for (let i = left; i <= right; i++) items.push(i);
  if (right < pageCount - 1) items.push(ELLIPSIS);

  items.push(pageCount);
  return items;
}

interface TablePaginationProps {
  /** Trang hiện tại (1-based). */
  page: number;
  /** Tổng số trang. */
  pageCount: number;
  /** Gọi khi người dùng chọn trang khác (đã kẹp trong [1, pageCount]). */
  onPageChange: (page: number) => void;
  /** Số trang kề mỗi bên trang hiện tại (mặc định 1). */
  siblings?: number;
}

/**
 * Điều hướng phân trang dùng chung cho các bảng — controlled qua state ở component cha.
 * Chỉ dùng icon (không chữ): về đầu, lùi, các số trang, tiến, về cuối.
 * Bọc shadcn Pagination: các link render là <a> nên bắt onClick và preventDefault
 * để đổi trang bằng state thay vì điều hướng URL.
 * @param props - page, pageCount, onPageChange, siblings
 * @returns Thanh phân trang, hoặc null khi chỉ có tối đa 1 trang
 */
export function TablePagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
}: TablePaginationProps) {
  if (pageCount <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  /**
   * Đổi sang trang chỉ định, kẹp trong khoảng hợp lệ và chặn điều hướng mặc định.
   * @param target - Trang muốn tới (1-based)
   * @param event - Sự kiện click trên <a>
   */
  const goTo = (target: number, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const next = Math.min(Math.max(target, 1), pageCount);
    if (next !== page) onPageChange(next);
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="Về trang đầu"
            aria-disabled={isFirst}
            className={cn(isFirst && "pointer-events-none opacity-50")}
            onClick={(e) => goTo(1, e)}
          >
            <ChevronsLeft />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="Trang trước"
            aria-disabled={isFirst}
            className={cn(isFirst && "pointer-events-none opacity-50")}
            onClick={(e) => goTo(page - 1, e)}
          >
            <ChevronLeft />
          </PaginationLink>
        </PaginationItem>

        {getPageItems(page, pageCount, siblings).map((item, index) =>
          item === ELLIPSIS ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === page}
                onClick={(e) => goTo(item, e)}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="Trang sau"
            aria-disabled={isLast}
            className={cn(isLast && "pointer-events-none opacity-50")}
            onClick={(e) => goTo(page + 1, e)}
          >
            <ChevronRight />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            href="#"
            aria-label="Về trang cuối"
            aria-disabled={isLast}
            className={cn(isLast && "pointer-events-none opacity-50")}
            onClick={(e) => goTo(pageCount, e)}
          >
            <ChevronsRight />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
