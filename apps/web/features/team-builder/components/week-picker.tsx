"use client";

import { DateRange } from "@/components/shared/date-range";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormationWeek } from "@shared/schemas";

interface WeekPickerProps {
  /** Weeks that still hold data, newest first */
  weeks: FormationWeek[];
  /** Monday of the week on screen */
  value: string;
  /** Called with the week the user switched to */
  onChange: (weekStart: string) => void;
}

const DAYS_IN_WEEK_SPAN_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Sunday closing the week — the API only hands back the Monday.
 * @param weekStart - Monday of the week (ISO string)
 * @returns Sunday of the same week (ISO string)
 */
function weekEnd(weekStart: string): string {
  return new Date(
    new Date(weekStart).getTime() + DAYS_IN_WEEK_SPAN_MS
  ).toISOString();
}

/**
 * Week selector. Older weeks are read-only, which the screen enforces — this
 * component only reports which week the user wants to look at.
 * @param weeks - Weeks that still hold data
 * @param value - Monday of the week on screen
 * @param onChange - Called with the week the user switched to
 * @returns The week selector
 */
export function WeekPicker({ weeks, value, onChange }: WeekPickerProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(String(next))}>
      <SelectTrigger id="formation-week" className="w-52">
        <SelectValue>
          {() => (
            <span className="inline-flex items-center gap-1">
              Tuần <DateRange start={value} end={weekEnd(value)} />
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {weeks.map((week) => (
          <SelectItem key={week.weekStart} value={week.weekStart}>
            <span className="inline-flex items-center gap-1">
              Tuần{" "}
              <DateRange
                start={week.weekStart}
                end={weekEnd(week.weekStart)}
              />
              {week.isActive ? " (hiện tại)" : ""}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
