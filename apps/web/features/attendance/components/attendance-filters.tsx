"use client";

import { History, Hourglass } from "lucide-react";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

/** A filter that is on takes the selected surface (frontend.md §6), hover included. */
const PRESSED_CLASS =
  "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground";

/** On a phone the two quick filters share one row and split it evenly. */
const QUICK_FILTER_CLASS = "max-sm:flex-1";

interface AttendanceFiltersProps {
  /** The screen using the filters — each screen keeps its own state. */
  scope: AttendanceFilterScope;
  /**
   * Attendance screen only: how many fought battles the grid is hiding. Zero or absent means there
   * is nothing to bring back, so the toggle stays off the screen.
   */
  foughtCount?: number;
}

/**
 * The filter bar: search by character name and pick classes.
 * Reads and writes the store slice for `scope`, so two screens never share filter values.
 *
 * The Attendance screen adds two quick filters beside them. "Chưa điểm danh": the question an admin
 * asks the grid most, a day or two before a battle, is who has not answered yet. "Đã đánh": the
 * grid opens on the battles still to come, and this brings the fought ones' columns back.
 *
 * Bare, without a card of its own: it sits in the header of the card of the table it filters, so
 * the page has one block fewer and nobody wonders what the filters act on.
 * @param scope - The screen using the filters
 * @param foughtCount - Fought battles the grid is hiding
 * @returns The filter row
 */
export function AttendanceFilters({
  scope,
  foughtCount = 0,
}: AttendanceFiltersProps) {
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);
  const unansweredOnly = useAttendanceFilterStore((s) => s.unansweredOnly);
  const setUnansweredOnly = useAttendanceFilterStore(
    (s) => s.setUnansweredOnly
  );
  const showFought = useAttendanceFilterStore((s) => s.showFought);
  const setShowFought = useAttendanceFilterStore((s) => s.setShowFought);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <RosterFilterBar
        idPrefix={scope}
        value={filter}
        onChange={(next) => setFilter(scope, next)}
        className="flex-1"
      />
      {scope === "attendance" ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-pressed={unansweredOnly}
            onClick={() => setUnansweredOnly(!unansweredOnly)}
            className={cn(QUICK_FILTER_CLASS, unansweredOnly && PRESSED_CLASS)}
          >
            <Hourglass />
            Chưa điểm danh
          </Button>
          {foughtCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              aria-pressed={showFought}
              onClick={() => setShowFought(!showFought)}
              className={cn(QUICK_FILTER_CLASS, showFought && PRESSED_CLASS)}
            >
              <History />
              Đã đánh ({foughtCount})
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
