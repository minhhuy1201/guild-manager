"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  joinLocalValue,
  maskDate,
  maskTime,
  parseDisplayDate,
  splitLocalValue,
  toDisplayDate,
} from "../lib/date-parts";

interface DateTimeFieldProps {
  /** Id of the date input, for its label */
  id: string;
  /** Label shown above */
  label: string;
  /** Value as "YYYY-MM-DDTHH:mm", empty when unset */
  value: string;
  /** Called with the new value; empty when the date/time is not yet valid */
  onChange: (value: string) => void;
  /** Time prefilled when there is no value, as HH:mm */
  defaultTime?: string;
  /** Small hint under the field, e.g. the value's constraint */
  description?: string;
}

/**
 * A date/time field as dd/MM/yyyy plus HH:mm, editable by typing or through the calendar.
 * Not `<input type="datetime-local">`, because browsers render that in the machine's locale and an
 * English machine shows mm/dd/yyyy.
 * @param id - Id of the date input
 * @param label - Label shown above
 * @param value - Value as "YYYY-MM-DDTHH:mm"
 * @param onChange - Called with the new value
 * @param defaultTime - Time prefilled when there is no value
 * @param description - Small hint under the field
 * @returns The date/time inputs with the calendar button
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
  defaultTime,
  description,
}: DateTimeFieldProps) {
  const [parts, setParts] = useState(() => splitLocalValue(value, defaultTime));
  const [emitted, setEmitted] = useState(value);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // A value arriving from outside (reopening the form, an auto-filled deadline) reloads both inputs.
  // A value this field just emitted is left alone, so what the user is typing is preserved.
  if (value !== emitted) {
    setEmitted(value);
    setParts(splitLocalValue(value, defaultTime));
  }

  const isIncomplete = Boolean(parts.date && parts.time) && emitted === "";

  /**
   * Update both inputs, then report the combined value to the form.
   * @param next - New contents of the two inputs
   */
  function update(next: { date: string; time: string }) {
    const joined = joinLocalValue(next.date, next.time);

    setParts(next);
    setEmitted(joined);
    onChange(joined);
  }

  /**
   * Fill in the date picked on the calendar, keeping the current time.
   * @param picked - Date the user clicked in the calendar
   */
  function handlePick(picked: Date | undefined) {
    if (!picked) return;

    update({ ...parts, date: toDisplayDate(picked) });
    setCalendarOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          aria-invalid={isIncomplete || undefined}
          value={parts.date}
          onChange={(event) =>
            update({ ...parts, date: maskDate(event.target.value) })
          }
        />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`${label} — chọn trên lịch`}
              />
            }
          >
            <CalendarDays />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={vi}
              autoFocus
              defaultMonth={parseDisplayDate(parts.date)}
              selected={parseDisplayDate(parts.date)}
              onSelect={handlePick}
            />
          </PopoverContent>
        </Popover>
        <Input
          id={`${id}-time`}
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:mm"
          maxLength={5}
          aria-label={`${label} — giờ`}
          aria-invalid={isIncomplete || undefined}
          className="w-24"
          value={parts.time}
          onChange={(event) =>
            update({ ...parts, time: maskTime(event.target.value) })
          }
        />
      </div>
      {isIncomplete ? (
        <p className="text-sm text-destructive">
          Ngày giờ không hợp lệ. Nhập theo dạng dd/mm/yyyy và HH:mm.
        </p>
      ) : (
        description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )
      )}
    </div>
  );
}
