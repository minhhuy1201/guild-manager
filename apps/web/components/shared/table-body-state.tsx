"use client";

import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import type { QueryGroupState } from "@/lib/query-group";

/** Placeholder rows shown while a table's first load is running. */
const DEFAULT_SKELETON_ROWS = 5;

/**
 * Opacity-only transition for the three special rows. No geometry: the whole point
 * of this module is that the table's shape does not move between branches.
 */
const FADE_IN =
  "animate-in fade-in duration-[var(--duration-slow)] ease-out-soft";

interface TableBodyStateProps<TItem> {
  /** Combined state of the query group, from `combineQueries`. */
  state: QueryGroupState;
  /** Header column count — drives both colSpan and the skeleton cell count. */
  columns: number;
  /** Per-column classes, for a column hidden at some breakpoint. */
  columnClassNames?: readonly (string | undefined)[];
  /** Rows of the current page. */
  rows: readonly TItem[];
  /** Draw one row. The caller says what a row looks like, never which branch wins. */
  renderRow: (item: TItem) => ReactNode;
  /** Sentence shown when there is no row at all. */
  emptyMessage: string;
  /** Number of skeleton rows, 5 by default. */
  skeletonRows?: number;
}

/**
 * The four-branch table body — failure, loading, empty, data — said once.
 * Branch order is fixed, error before loading, matching `QueryBoundary`: a group
 * where one query failed while another is still running must show the failure
 * rather than a skeleton that would never finish.
 *
 * Renders bare `<TableRow>` elements, so it must be placed inside `<TableBody>`.
 * @param props - state, columns, columnClassNames, rows, renderRow, emptyMessage, skeletonRows
 * @returns The rows of whichever branch wins
 */
export function TableBodyState<TItem>({
  state,
  columns,
  columnClassNames,
  rows,
  renderRow,
  emptyMessage,
  skeletonRows = DEFAULT_SKELETON_ROWS,
}: TableBodyStateProps<TItem>) {
  if (state.isError) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className={FADE_IN}>
          <ErrorState message={state.errorMessage} onRetry={state.refetch} />
        </TableCell>
      </TableRow>
    );
  }

  if (state.isPending) {
    return (
      <>
        {Array.from({ length: skeletonRows }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <TableCell
                key={columnIndex}
                className={columnClassNames?.[columnIndex]}
              >
                <Skeleton className="h-5 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className={FADE_IN}>
          <EmptyState message={emptyMessage} />
        </TableCell>
      </TableRow>
    );
  }

  return <>{rows.map((item) => renderRow(item))}</>;
}
