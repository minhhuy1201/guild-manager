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

/** Sentinel marking a "..." position in the page list. */
const ELLIPSIS = "ellipsis" as const;

/**
 * Compute the page numbers shown around the current page, inserting "..." when there are too many.
 * The first and last page are always kept, plus a window around the current one.
 * @param page - Current page (1-based)
 * @param pageCount - Total number of pages
 * @param siblings - Pages kept on each side of the current one
 * @returns Page numbers, or the ELLIPSIS sentinel
 */
function getPageItems(
  page: number,
  pageCount: number,
  siblings = 1
): (number | typeof ELLIPSIS)[] {
  // Few enough pages to just show them all.
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
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called when the user picks another page (already clamped to [1, pageCount]). */
  onPageChange: (page: number) => void;
  /** Pages kept on each side of the current one (default 1). */
  siblings?: number;
}

/**
 * The shared table pagination — controlled by state in the parent component.
 * Icons only (no text): first, previous, the page numbers, next, last.
 * Wraps shadcn Pagination: its links render as <a>, so onClick is intercepted and default-prevented to
 * change page through state instead of navigating.
 * @param props - page, pageCount, onPageChange, siblings
 * @returns The pagination bar, or null when there is at most one page
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
   * Go to a page, clamped to the valid range, preventing the default navigation.
   * @param target - Target page (1-based)
   * @param event - Click event on the <a>
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
