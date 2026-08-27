"use client";

import { CalendarCheck, CalendarDays } from "lucide-react";
import type { FormationWeek } from "@guild/shared/schemas";

import { DateRange } from "@/components/shared/date-range";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeekPickerProps {
  /** Weeks that still hold data, newest first */
  weeks: FormationWeek[];
  /** Monday of the week on screen */
  value: string;
  /** Called with the week the user switched to */
  onChange: (weekStart: string) => void;
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
  const selected = weeks.find((week) => week.weekStart === value);

  return (
    <Select value={value} onValueChange={(next) => onChange(String(next))}>
      <SelectTrigger id="formation-week" className="w-52">
        <SelectValue>
          {() => (
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                selected?.isActive && "text-primary"
              )}
            >
              {selected?.isActive ? <CalendarCheck /> : <CalendarDays />}
              Tuần{" "}
              {selected ? (
                <DateRange start={selected.weekStart} end={selected.weekEnd} />
              ) : null}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {weeks.map((week) => (
          <SelectItem key={week.weekStart} value={week.weekStart}>
            {/* The current week keeps its colour even while highlighted: the
                declaration sits on this span, not on the item. */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                week.isActive && "font-medium text-primary"
              )}
            >
              {week.isActive ? <CalendarCheck /> : <CalendarDays />}
              Tuần{" "}
              <DateRange start={week.weekStart} end={week.weekEnd} />
              {week.isActive ? " (hiện tại)" : ""}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
