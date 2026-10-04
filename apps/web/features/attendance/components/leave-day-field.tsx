"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { vi } from "date-fns/locale";

import { FieldLabel } from "@/components/shared/field-label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fromDayKey, toDayKey } from "../lib/leave-date";

/** Shown on the trigger while no day has been picked. */
const DAY_PLACEHOLDER = "Chọn ngày";

/**
 * A day key as members read dates.
 * @param key - `YYYY-MM-DD`
 * @returns `dd/mm/yyyy`
 */
function displayDay(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

interface LeaveDayFieldProps {
  /** Id of the trigger, for its label */
  id: string;
  /** Label shown above */
  label: string;
  /** The day as `YYYY-MM-DD`, empty while none is picked */
  value: string;
  /** Called with the picked day */
  onChange: (day: string) => void;
  /** Earliest pickable day, `YYYY-MM-DD`; omitted means any day */
  minDay?: string;
}

/**
 * One day of a leave: a button that opens a calendar, the way the schedule form picks its day.
 * @param id - Id of the trigger
 * @param label - Label shown above
 * @param value - The picked day, empty when none
 * @param onChange - Called with the picked day
 * @param minDay - Earliest pickable day
 * @returns The labelled day picker
 */
export function LeaveDayField({
  id,
  label,
  value,
  onChange,
  minDay,
}: LeaveDayFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = value ? fromDayKey(value) : undefined;

  /**
   * Report the clicked day and close the calendar.
   * @param picked - Date the user clicked
   */
  function handlePick(picked: Date | undefined) {
    if (!picked) return;

    onChange(toDayKey(picked));
    setIsOpen(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <FieldLabel htmlFor={id} icon={<CalendarDays />}>
        {label}
      </FieldLabel>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="lg" id={id} />}
          className="justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? displayDay(value) : DAY_PLACEHOLDER}
          </span>
          <ChevronDown className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-hidden p-0">
          <Calendar
            mode="single"
            locale={vi}
            autoFocus
            defaultMonth={selected ?? (minDay ? fromDayKey(minDay) : undefined)}
            selected={selected}
            onSelect={handlePick}
            disabled={minDay ? { before: fromDayKey(minDay) } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
