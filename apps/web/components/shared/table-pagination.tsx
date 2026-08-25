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

/** Sentinel marking a blank filler cell, so the strip keeps a constant width. */
const BLANK = "blank" as const;

/** One cell of the page strip: a page number, an ellipsis, or a blank filler. */
export type PageSlot = number | typeof ELLIPSIS | typeof BLANK;

/**
 * Insert blank fillers at one position so the strip reaches its fixed length.
 * @param slots - The slots built so far
 * @param totalSlots - The length every strip must have
 * @param at - Index the fillers are inserted at
 * @returns A new array padded to `totalSlots`
 */
function padSlots(
  slots: readonly PageSlot[],
  totalSlots: number,
  at: number
): PageSlot[] {
  const missing = totalSlots - slots.length;
  if (missing <= 0) return [...slots];

  return [
    ...slots.slice(0, at),
    ...Array.from({ length: missing }, () => BLANK),
    ...slots.slice(at),
  ];
}

/**
 * The cells of the page strip. Always returns exactly `siblings * 2 + 5` items —
 * whatever is missing is padded with BLANK — so the strip's width does not depend
 * on the current page and the button pairs on both ends stay put.
 * Padding goes on the side that is short, right next to the ellipsis that is there,
 * which keeps every page number and every ellipsis at a stable index too.
 * @param page - Current page (1-based)
 * @param pageCount - Total number of pages
 * @param siblings - Pages kept on each side of the current one
 * @returns Exactly `siblings * 2 + 5` slots
 */
export function getPageSlots(
  page: number,
  pageCount: number,
  siblings = 1
): PageSlot[] {
  const totalSlots = siblings * 2 + 5;
  // A table with nothing in it still shows page 1 of 1.
  const safeCount = Math.max(1, pageCount);

  // Few enough pages to just show them all, left-aligned.
  if (safeCount <= totalSlots) {
    const pages: PageSlot[] = Array.from(
      { length: safeCount },
      (_, index) => index + 1
    );
    return padSlots(pages, totalSlots, pages.length);
  }

  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, safeCount - 1);
  const hasLeadingGap = left > 2;

  const slots: PageSlot[] = [1];
  if (hasLeadingGap) slots.push(ELLIPSIS);
  for (let i = left; i <= right; i++) slots.push(i);
  if (right < safeCount - 1) slots.push(ELLIPSIS);
  slots.push(safeCount);

  // Short on the left → pad just after the leading ellipsis (index 1).
  // Short on the right → pad just before the trailing ellipsis (last index - 1).
  const at = hasLeadingGap ? 2 : slots.length - 2;
  return padSlots(slots, totalSlots, at);
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
 * @returns The pagination bar — always rendered, so filtering down to one page moves nothing
 */
export function TablePagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
}: TablePaginationProps) {
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

        {getPageSlots(page, pageCount, siblings).map((slot, index) => {
          switch (slot) {
            case ELLIPSIS:
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            case BLANK:
              // Same footprint as a page cell, no content and no tab stop:
              // this is what keeps the strip's width constant.
              return (
                <PaginationItem key={`blank-${index}`}>
                  <span className="block size-8" aria-hidden />
                </PaginationItem>
              );
            default:
              return (
                <PaginationItem key={slot}>
                  <PaginationLink
                    href="#"
                    isActive={slot === page}
                    onClick={(e) => goTo(slot, e)}
                  >
                    {slot}
                  </PaginationLink>
                </PaginationItem>
              );
          }
        })}

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
