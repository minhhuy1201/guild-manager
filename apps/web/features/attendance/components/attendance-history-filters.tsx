"use client";

import { FilterX } from "lucide-react";

import { ClearableSelectTrigger } from "@/components/shared/clearable-select-trigger";
import { FilterAllIcon } from "@/components/shared/filter-all-icon";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { isRosterFilterActive } from "@/lib/roster-filter";
import { useHistoryWeek, useSessionFilter } from "../hooks/use-attendance";
import {
  PRESENCE_FILTER_LABEL,
  PRESENCE_FILTER_OPTIONS,
  type AttendancePresenceFilter,
} from "../lib/presence-filter";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";
import { AttendanceStatusIcon } from "./attendance-status-icon";

/** The scope this bar owns; the History screen is the only caller. */
const SCOPE = "history";

/** Badge size in the select — smaller than the table's, matching the shared "Tất cả" icon. */
const OPTION_ICON = "size-5";

interface PresenceOptionProps {
  /** The option being rendered, in the trigger or in the list. */
  option: AttendancePresenceFilter;
}

/**
 * One presence option: its mark plus its label.
 * "Có" and "Không" carry the very marks the table's status column shows, so the filter and the rows
 * read as the same thing; "Tất cả" is not an answer and gets the shared neutral funnel instead.
 * @param option - The option being rendered
 * @returns The icon and label pair
 */
function PresenceOption({ option }: PresenceOptionProps) {
  return (
    <span className="flex items-center gap-2">
      {option === "all" ? (
        <FilterAllIcon />
      ) : (
        <AttendanceStatusIcon
          isPresent={option === "present"}
          className={OPTION_ICON}
        />
      )}
      {PRESENCE_FILTER_LABEL[option]}
    </span>
  );
}

/**
 * The history table's own filter bar, set in the table card's header: the shared roster filter, a
 * presence picker, and one "Xoá bộ lọc" at the end of the same row. These narrow the table's rows
 * and nothing else - the chart above counts the whole guild - which is why they live with the table
 * and not above the chart. The week and the battle day, which choose the data of the whole page,
 * are `AttendanceHistoryScope`'s.
 *
 * "Xoá bộ lọc" still clears all five in one store write, the week and the battle day included: it
 * is the page's way back to the default view, wherever it sits.
 * @returns The filter row
 */
export function AttendanceHistoryFilters() {
  const filter = useAttendanceFilterStore((s) => s.filters[SCOPE]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);
  const presence = useAttendanceFilterStore((s) => s.presence);
  const setPresence = useAttendanceFilterStore((s) => s.setPresence);
  const resetFilters = useAttendanceFilterStore((s) => s.resetHistoryFilters);
  const { selected: selectedWeek, weekStart } = useHistoryWeek();
  const { selectedSession } = useSessionFilter(weekStart);

  // `selectedSession`, not the raw `sessionId`: a stored id whose session was deleted shows as
  // "Tất cả ngày đánh" and filters nothing, so there is nothing for the button to clear either.
  const isFiltered =
    isRosterFilterActive(filter) ||
    presence !== "all" ||
    selectedSession !== null ||
    (selectedWeek !== null && !selectedWeek.isCurrent);

  return (
    // Four columns from `lg`: the roster filter spans two and splits them in two, the presence
    // picker takes the third, the clear button the fourth - one row, as the table's header.
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <RosterFilterBar
        idPrefix={SCOPE}
        value={filter}
        onChange={(next) => setFilter(SCOPE, next)}
        className="sm:col-span-2"
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${SCOPE}-presence`}>Trạng thái</Label>
        <Select
          value={presence}
          onValueChange={(next) =>
            setPresence(next as AttendancePresenceFilter)
          }
        >
          <ClearableSelectTrigger
            id={`${SCOPE}-presence`}
            isActive={presence !== "all"}
            clearLabel="Xoá lọc trạng thái"
            onClear={() => setPresence("all")}
          >
            <SelectValue>
              <PresenceOption option={presence} />
            </SelectValue>
          </ClearableSelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {PRESENCE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                <PresenceOption option={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Always rendered and disabled when nothing is set: a button that appears and disappears
          would shift the row every time the first filter is typed. */}
      <div className="flex sm:items-end sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={resetFilters}
          disabled={!isFiltered}
        >
          <FilterX />
          Xoá bộ lọc
        </Button>
      </div>
    </div>
  );
}
