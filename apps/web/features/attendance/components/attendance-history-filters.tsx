"use client";

import { CalendarDays, CalendarRange, FilterX } from "lucide-react";

import { ClearableSelectTrigger } from "@/components/shared/clearable-select-trigger";
import { FilterAllIcon } from "@/components/shared/filter-all-icon";
import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

/** Sentinel value of the "Tất cả" session row. Not a session id — never stored. */
const ALL_SESSIONS = "all";

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

interface SessionOptionProps {
  /** Label of the session, or null for the "Tất cả" row. */
  label: string | null;
  /** Text of the "Tất cả" row; the trigger spells out what is unfiltered. */
  allLabel?: string;
}

/**
 * One session option: a calendar mark plus the session label, or the neutral funnel for "Tất cả".
 * @param label - Session label, null for the "Tất cả" row
 * @param allLabel - Text of the "Tất cả" row
 * @returns The icon and label pair
 */
function SessionOption({ label, allLabel = "Tất cả" }: SessionOptionProps) {
  return (
    <span className="flex items-center gap-2">
      {label === null ? (
        <FilterAllIcon />
      ) : (
        <CalendarDays className={`${OPTION_ICON} text-muted-foreground`} />
      )}
      {label ?? allLabel}
    </span>
  );
}

interface WeekOptionProps {
  /** The week as "07/09 - 12/09" */
  label: string;
  /** Whether this is the week currently open for marking */
  isCurrent: boolean;
}

/**
 * One week option: a calendar mark, the date range, and a note on the open week.
 * The open week is named rather than left to be inferred - "07/09 - 12/09" alone does not tell a
 * member whether the row they are looking at is the one they can still answer.
 * @param label - The week as a date range
 * @param isCurrent - Whether this is the open week
 * @returns The icon and label pair
 */
function WeekOption({ label, isCurrent }: WeekOptionProps) {
  return (
    <span className="flex items-center gap-2">
      <CalendarRange className={`${OPTION_ICON} text-muted-foreground`} />
      {isCurrent ? `Tuần này · ${label}` : label}
    </span>
  );
}

/**
 * The History screen's filter bar: the shared roster filter plus a week, a session and a presence
 * picker. Those three live here rather than in `RosterFilterBar` because only this screen lists
 * recorded answers — the Attendance grid already shows every session and both answers at once.
 *
 * The week picker is not a filter like the other two: it chooses which week is fetched, while they
 * narrow what came back. It sits with them because to the person using the screen there is no
 * difference.
 * @returns The filter card
 */
export function AttendanceHistoryFilters() {
  const filter = useAttendanceFilterStore((s) => s.filters[SCOPE]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);
  const presence = useAttendanceFilterStore((s) => s.presence);
  const setPresence = useAttendanceFilterStore((s) => s.setPresence);
  const resetFilters = useAttendanceFilterStore((s) => s.resetHistoryFilters);
  const { options: weeks, selected: selectedWeek, setWeekStart } =
    useHistoryWeek();
  const { sessions, selectedSession, setSessionId } = useSessionFilter();

  // The open week is the default, so the picker shows it whenever nothing else is chosen.
  const shownWeek = selectedWeek ?? weeks[0] ?? null;

  // `selectedSession`, not the raw `sessionId`: a stored id whose session was deleted shows as
  // "Tất cả ngày đánh" and filters nothing, so there is nothing for the button to clear either.
  const isFiltered =
    isRosterFilterActive(filter) ||
    presence !== "all" ||
    selectedSession !== null ||
    (selectedWeek !== null && !selectedWeek.isCurrent);

  return (
    <Card>
      <CardContent>
        {/*
          Five equal columns: the roster filter spans two of them and splits that span in two with
          the same gap, so all five controls end up exactly the same width.
        */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <RosterFilterBar
            idPrefix={SCOPE}
            value={filter}
            onChange={(next) => setFilter(SCOPE, next)}
            className="sm:col-span-2"
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${SCOPE}-week`}>Tuần</Label>
            <Select
              value={shownWeek?.weekStart ?? ""}
              onValueChange={(next) => setWeekStart(String(next))}
            >
              <ClearableSelectTrigger
                id={`${SCOPE}-week`}
                isActive={shownWeek !== null && !shownWeek.isCurrent}
                clearLabel="Về tuần này"
                onClear={() => setWeekStart(null)}
              >
                <SelectValue>
                  {shownWeek ? (
                    <WeekOption
                      label={shownWeek.label}
                      isCurrent={shownWeek.isCurrent}
                    />
                  ) : null}
                </SelectValue>
              </ClearableSelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {weeks.map((week) => (
                  <SelectItem key={week.weekStart} value={week.weekStart}>
                    <WeekOption
                      label={week.label}
                      isCurrent={week.isCurrent}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${SCOPE}-session`}>Ngày đánh</Label>
            <Select
              value={selectedSession?.id ?? ALL_SESSIONS}
              onValueChange={(next) =>
                setSessionId(next === ALL_SESSIONS ? null : next)
              }
            >
              <ClearableSelectTrigger
                id={`${SCOPE}-session`}
                isActive={selectedSession !== null}
                clearLabel="Xoá lọc ngày đánh"
                onClear={() => setSessionId(null)}
              >
                <SelectValue>
                  <SessionOption
                    label={selectedSession?.label ?? null}
                    allLabel="Tất cả ngày đánh"
                  />
                </SelectValue>
              </ClearableSelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={ALL_SESSIONS}>
                  <SessionOption label={null} />
                </SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    <SessionOption label={session.label} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        </div>

        {/*
          Always rendered and disabled when nothing is set, the way `formation-toolbar` holds its
          "Đặt lại": a button that appears and disappears makes the card change height every time
          the first filter is typed.
        */}
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!isFiltered}
          >
            <FilterX />
            Xoá bộ lọc
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
