"use client";

import type { ClassOutlookRow } from "@guild/shared/lib";

import { sortByAfter } from "../lib/sort-by-after";
import { OutlookBars } from "./outlook-bars";

interface BeforeAfterTabProps {
  /** One row per class */
  rows: ClassOutlookRow[];
  /** Whether a survey exists; without one the rows show the current head-count only */
  hasSurvey: boolean;
}

/**
 * The classes with their head-count before and after the update, the biggest "after" first. Without
 * a survey the order stays the display order and only the current head-count shows.
 * @param rows - One row per class
 * @param hasSurvey - Whether a survey exists
 * @returns The list of class rows
 */
export function BeforeAfterTab({ rows, hasSurvey }: BeforeAfterTabProps) {
  const ordered = hasSurvey ? sortByAfter(rows) : rows;
  const domainMax = Math.max(1, ...rows.map((row) => Math.max(row.before, row.after)));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {ordered.map((row) => (
          <OutlookBars key={row.guildClass} row={row} domainMax={domainMax} hasSurvey={hasSurvey} />
        ))}
      </ul>
      {hasSurvey && (
        <p className="text-xs text-muted-foreground">
          Thanh nhạt là hiện tại. Thanh sau: phần đặc là chắc chắn, phần sọc là đang cân nhắc.
        </p>
      )}
    </div>
  );
}
