import type { ReactNode } from "react";

import { Table } from "@/components/ui/table";

/**
 * The table's own skin, kept here rather than in `components/ui/table.tsx`, which stays shadcn CLI output.
 * Rows are striped by position — the skeleton bands like the loaded rows — and both bands are opaque, so a
 * pinned column can take the row colour with `bg-inherit` and hide what scrolls underneath.
 * The header row sits on `secondary` (a navy tint) under a 2px navy rule, set apart from both the
 * card and the lightly mixed stripes (opaque, never an alpha), so the column names read as a band of their own in either theme.
 * The hover rule is marked important because it ties with the stripe rule on specificity.
 */
const TABLE_SKIN = [
  "[&_thead_th]:h-11 [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:tracking-wide [&_thead_th]:text-secondary-foreground",
  "[&_thead_tr]:bg-secondary [&_thead]:border-b-2 [&_thead]:border-primary/25",
  "[&_tbody_tr]:bg-card",
  "[&_tbody_tr:nth-child(even)]:bg-[color-mix(in_oklch,var(--card),var(--muted)_55%)]",
  "[&_tbody_tr:hover]:bg-foreground/5!",
].join(" ");

interface DataTableFrameProps {
  /** `<TableHeader>` and `<TableBody>` of the table. */
  children: ReactNode;
}

/**
 * The bordered, striped table without pagination: the skin every table of the app shares. A list that
 * is short by nature (the leaves) uses it directly; a paged list goes through `DataTable`.
 * @param children - The header and body sections
 * @returns The framed table
 */
export function DataTableFrame({ children }: DataTableFrameProps) {
  return (
    <div
      data-slot="data-table-frame"
      className="overflow-hidden rounded-inner border"
    >
      <Table className={TABLE_SKIN}>{children}</Table>
    </div>
  );
}
