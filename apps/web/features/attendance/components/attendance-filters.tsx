"use client";

import { Hourglass } from "lucide-react";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

interface AttendanceFiltersProps {
  /** The screen using the filters — each screen keeps its own state. */
  scope: AttendanceFilterScope;
}

/**
 * The filter bar: search by character name and pick classes.
 * Reads and writes the store slice for `scope`, so two screens never share filter values.
 *
 * The Attendance screen adds one quick filter beside them, "Chưa điểm danh": the question an admin
 * asks the grid most, a day or two before a battle, is who has not answered yet.
 * @param scope - The screen using the filters
 * @returns The filter card
 */
export function AttendanceFilters({ scope }: AttendanceFiltersProps) {
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);
  const unansweredOnly = useAttendanceFilterStore((s) => s.unansweredOnly);
  const setUnansweredOnly = useAttendanceFilterStore(
    (s) => s.setUnansweredOnly
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <RosterFilterBar
          idPrefix={scope}
          value={filter}
          onChange={(next) => setFilter(scope, next)}
          className="flex-1"
        />
        {scope === "attendance" ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-pressed={unansweredOnly}
            onClick={() => setUnansweredOnly(!unansweredOnly)}
            // A filter that is on takes the selected surface (frontend.md §6), hover included.
            className={cn(
              unansweredOnly &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
          >
            <Hourglass />
            Chưa điểm danh
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
