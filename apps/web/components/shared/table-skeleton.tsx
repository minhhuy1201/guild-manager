import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  /** Number of placeholder rows to render. */
  rows: number;
  /** Number of placeholder cells per row — must match the table header. */
  columns: number;
  /**
   * Extra classes per column index, so the skeleton can mirror header columns
   * that are hidden at some breakpoints.
   */
  columnClassNames?: readonly (string | undefined)[];
}

/**
 * Placeholder rows shown while a table's data is still loading.
 * Renders bare `<TableRow>` elements, so it must be placed inside `<TableBody>`.
 * @param rows - Number of placeholder rows
 * @param columns - Number of placeholder cells per row
 * @param columnClassNames - Extra classes applied per column index
 * @returns Fragment of skeleton table rows
 */
export function TableSkeleton({
  rows,
  columns,
  columnClassNames,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
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
