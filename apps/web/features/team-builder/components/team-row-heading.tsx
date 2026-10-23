interface TeamRowHeadingProps {
  /** Header text naming the teams in the row, e.g. "Đội 1-5" */
  label: string;
  /** Slots of the row that hold someone */
  filled: number;
  /** Slots the row holds in total, the denominator of the count */
  total: number;
}

/**
 * The label of a row of teams that never folds (focus mode): the same text and count as the
 * header of `TeamRowGroup`, without the trigger. Hidden below `md` for the same reason - the grid
 * shows one team at a time there.
 * @param label - Header text naming the teams in the row
 * @param filled - Slots of the row that hold someone
 * @param total - Slots the row holds in total
 * @returns The row heading
 */
export function TeamRowHeading({ label, filled, total }: TeamRowHeadingProps) {
  return (
    <h3 className="hidden items-center gap-2 px-1 text-sm font-semibold md:flex">
      {label}
      <span className="font-normal tabular-nums text-muted-foreground">
        {filled}/{total}
      </span>
    </h3>
  );
}
