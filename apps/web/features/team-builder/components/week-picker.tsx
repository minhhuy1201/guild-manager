"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormationWeek } from "../types/session-formation";

interface WeekPickerProps {
  /** Weeks that still hold data, newest first */
  weeks: FormationWeek[];
  /** Monday of the week on screen */
  value: string;
  /** Called with the week the user switched to */
  onChange: (weekStart: string) => void;
}

/**
 * Render a week as "20/07 – 26/07".
 * @param weekStart - Monday of the week (ISO string)
 * @returns Vietnamese date range covering Monday to Sunday
 */
function formatWeek(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const format = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${format.format(start)} – ${format.format(end)}`;
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
        <SelectValue>{() => `Tuần ${formatWeek(value)}`}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {weeks.map((week, index) => (
          <SelectItem key={week.weekStart} value={week.weekStart}>
            Tuần {formatWeek(week.weekStart)}
            {index === 0 ? " (hiện tại)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
