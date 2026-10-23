"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown } from "lucide-react";
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
const RANGE_PLACEHOLDER = "Chọn ngày nghỉ";

/**
 * A day key as members read dates.
 * @param key - `YYYY-MM-DD`
 * @returns `dd/mm/yyyy`
 */
function displayDay(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

interface LeaveRangeFieldProps {
  /** Id of the trigger, for its label */
  id: string;
  /** Label shown above */
  label: string;
  /** First day as `YYYY-MM-DD`, empty while none is picked */
  start: string;
  /** Last day as `YYYY-MM-DD`; equals `start` for a one-day leave, empty while none is picked */
  end: string;
  /** Called with the new first and last day */
  onChange: (start: string, end: string) => void;
  /** Earliest pickable day, `YYYY-MM-DD` */
  minDay: string;
}

/**
 * The days of a leave: one button that opens a range calendar.
 *
 * The first click is already a complete one-day leave, so `onChange` fires with `start === end` at
 * once and the calendar stays open for a second click that stretches it. A second click before the
 * first moves the start instead of ending the range backwards. Closing the calendar without a
 * second click therefore keeps the one-day leave. Every visit starts a fresh pick.
 * @param id - Id of the trigger
 * @param label - Label shown above
 * @param start - The first day, empty when none
 * @param end - The last day, empty when none
 * @param onChange - Called with the new first and last day
 * @param minDay - Earliest pickable day
 * @returns The labelled range picker
 */
export function LeaveRangeField({
  id,
  label,
  start,
  end,
  onChange,
  minDay,
}: LeaveRangeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPickingEnd, setIsPickingEnd] = useState(false);
  const selected = start
    ? { from: fromDayKey(start), to: fromDayKey(end) }
    : undefined;

  /**
   * Open or close the calendar; opening always begins a new pick.
   * @param open - Whether the calendar is now open
   */
  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    setIsPickingEnd(false);
  }

  /**
   * Apply a clicked day to the range being picked.
   * @param clicked - Date the user clicked
   */
  function handleDayClick(clicked: Date) {
    const day = toDayKey(clicked);

    if (!isPickingEnd || day < start) {
      onChange(day, day);
      setIsPickingEnd(true);
      return;
    }

    onChange(start, day);
    handleOpenChange(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <FieldLabel htmlFor={id} icon={<CalendarDays />}>
        {label}
      </FieldLabel>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="lg" id={id} />}
          className="justify-between font-normal"
        >
          <span
            className={cn("inline-flex items-center gap-1", !start && "text-muted-foreground")}
          >
            {start ? displayDay(start) : RANGE_PLACEHOLDER}
            {start && end !== start && (
              <>
                <ArrowRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span className="sr-only">đến</span>
                {displayDay(end)}
              </>
            )}
          </span>
          <ChevronDown className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-hidden p-0">
          <Calendar
            mode="range"
            locale={vi}
            autoFocus
            defaultMonth={selected?.from ?? fromDayKey(minDay)}
            selected={selected}
            onDayClick={handleDayClick}
            disabled={{ before: fromDayKey(minDay) }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
