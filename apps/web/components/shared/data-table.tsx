"use client";

import type { ReactNode } from "react";

import { DataTableFrame } from "@/components/shared/data-table-frame";
import { TableBodyState } from "@/components/shared/table-body-state";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { TableBody, TableHeader } from "@/components/ui/table";
import type { TablePaginationState } from "@/hooks/use-table-pagination";
import type { QueryGroupState } from "@/lib/query-group";

interface DataTableProps<TItem> {
  /** The header rows — one or more `<TableRow>` holding `<TableHead>` cells. */
  header: ReactNode;
  /** Pagination state from `useTablePagination`; its `pagedItems` are the rows drawn. */
  pagination: TablePaginationState<TItem>;
  /** Combined state of the query group, from `combineQueries`. */
  state: QueryGroupState;
  /** Header column count — drives both colSpan and the skeleton cell count. */
  columns: number;
  /** Per-column classes, for a column hidden at some breakpoint. */
  columnClassNames?: readonly (string | undefined)[];
  /** Draw one row of the current page. */
  renderRow: (item: TItem) => ReactNode;
  /** Sentence shown when there is no row at all. */
  emptyMessage: string;
  /** Number of skeleton rows during the first load. */
  skeletonRows?: number;
  /** Noun counting the items in the footer, e.g. "thành viên". */
  itemLabel: string;
  /** Id for the page-size select — must be unique when a page holds several tables. */
  pageSizeId?: string;
  /** Optional block between the table and the pagination bar, e.g. an error message. */
  footer?: ReactNode;
}

/**
 * The shared paginated table: the bordered, striped table and its pagination bar as one unit.
 * The caller owns the header cells and the shape of a row; everything else — the four body
 * branches, the footer layout, the page size — is the same everywhere.
 * @param props - header, pagination, state, columns, renderRow, labels and the optional footer
 * @returns The table with its pagination bar underneath
 */
export function DataTable<TItem>({
  header,
  pagination,
  state,
  columns,
  columnClassNames,
  renderRow,
  emptyMessage,
  skeletonRows,
  itemLabel,
  pageSizeId,
  footer,
}: DataTableProps<TItem>) {
  return (
    <div className="w-full space-y-4">
      <DataTableFrame>
        <TableHeader>{header}</TableHeader>
        <TableBody>
          <TableBodyState
            state={state}
            columns={columns}
            columnClassNames={columnClassNames}
            rows={pagination.pagedItems}
            renderRow={renderRow}
            emptyMessage={emptyMessage}
            skeletonRows={skeletonRows}
          />
        </TableBody>
      </DataTableFrame>

      {footer}

      <TablePaginationBar
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel={itemLabel}
        pageSizeId={pageSizeId}
      />
    </div>
  );
}
