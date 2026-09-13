"use client";

import { CalendarDays, CalendarRange } from "lucide-react";

import { ClearableSelectTrigger } from "@/components/shared/clearable-select-trigger";
import { FilterAllIcon } from "@/components/shared/filter-all-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useHistoryWeek, useSessionFilter } from "../hooks/use-attendance";

/** The scope these pickers write; the History screen is the only caller. */
const SCOPE = "history";

/** Sentinel value of the "Tất cả" session row. Not a session id - never stored. */
const ALL_SESSIONS = "all";

/** Icon size in the select, matching the shared "Tất cả" icon. */
const OPTION_ICON = "size-5";

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
 * The History screen's page-wide pickers: which week, and which battle day of it. They choose the
 * data the whole page reads, the chart and the table alike, so they stand above both. The filters
 * that only narrow the table's rows (search, class, answer) sit in the table's own header instead,
 * where the chart below them cannot be mistaken for ignoring them.
 * @returns The week and session picker card
 */
export function AttendanceHistoryScope() {
  const {
    options: weeks,
    selected: selectedWeek,
    weekStart,
    setWeekStart,
  } = useHistoryWeek();
  const { sessions, selectedSession, setSessionId } =
    useSessionFilter(weekStart);

  // The open week is the default, so the picker shows it whenever nothing else is chosen.
  const shownWeek = selectedWeek ?? weeks[0] ?? null;

  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  <WeekOption label={week.label} isCurrent={week.isCurrent} />
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
      </CardContent>
    </Card>
  );
}
