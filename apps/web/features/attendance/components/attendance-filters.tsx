"use client";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Card, CardContent } from "@/components/ui/card";
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
 * @param scope - The screen using the filters
 * @returns The filter card
 */
export function AttendanceFilters({ scope }: AttendanceFiltersProps) {
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);

  return (
    <Card>
      <CardContent>
        <RosterFilterBar
          idPrefix={scope}
          value={filter}
          onChange={(next) => setFilter(scope, next)}
        />
      </CardContent>
    </Card>
  );
}
