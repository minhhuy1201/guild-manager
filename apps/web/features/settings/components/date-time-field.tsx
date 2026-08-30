"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import { vi } from "date-fns/locale";

import { FieldLabel } from "@/components/shared/field-label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  joinLocalValue,
  maskTime,
  parseDisplayDate,
  splitLocalValue,
  toDisplayDate,
} from "../lib/date-parts";

/** Shown on the trigger while no day has been picked. */
const DATE_PLACEHOLDER = "Chọn ngày";

/** Room for the icon in front plus "20:30", with air to spare. */
const TIME_INPUT_CLASS = "w-32 pl-9";

interface DateTimeFieldProps {
  /** Id of the date trigger, for its label */
  id: string;
  /** Label shown above */
  label: string;
  /** Icon shown in front of the label */
  icon: ReactNode;
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
 * A date/time field: the day is picked on a calendar popover, the time typed as 24h HH:mm.
 * The time is a masked text input rather than `<input type="time">`, which an English browser draws
 * with an AM/PM field — its format follows the browser's locale and cannot be forced to 24h.
 * Not `<input type="datetime-local">`, because browsers render that in the machine's locale and an
 * English machine shows mm/dd/yyyy.
 * @param id - Id of the date trigger
 * @param label - Label shown above
 * @param icon - Icon shown in front of the label
 * @param value - Value as "YYYY-MM-DDTHH:mm"
 * @param onChange - Called with the new value
 * @param defaultTime - Time prefilled when there is no value
 * @param description - Small hint under the field
 * @returns The date trigger with its calendar popover, beside the time input
 */
export function DateTimeField({
  id,
  label,
  icon,
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

  // The day comes from the calendar and is always valid, so only the typed time can be wrong.
  const isTimeInvalid = Boolean(parts.date && parts.time) && emitted === "";

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
      <FieldLabel htmlFor={id} icon={icon}>
        {label}
      </FieldLabel>
      <div className="flex gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          {/* `lg` is the button size matching the input's height and text size, beside which it sits. */}
          <PopoverTrigger
            render={
              <Button type="button" variant="outline" size="lg" id={id} />
            }
            className="flex-1 justify-between font-normal"
          >
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              <span className={cn(!parts.date && "text-muted-foreground")}>
                {parts.date || DATE_PLACEHOLDER}
              </span>
            </span>
            <ChevronDown className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto overflow-hidden p-0">
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
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Clock className="size-4" />
          </div>
          <Input
            id={`${id}-time`}
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            maxLength={5}
            aria-label={`${label} — giờ`}
            aria-invalid={isTimeInvalid || undefined}
            className={TIME_INPUT_CLASS}
            value={parts.time}
            onChange={(event) =>
              update({ ...parts, time: maskTime(event.target.value) })
            }
          />
        </div>
      </div>
      {isTimeInvalid ? (
        <p className="text-sm text-destructive">
          Giờ không hợp lệ. Nhập theo dạng 24h HH:mm.
        </p>
      ) : (
        description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )
      )}
    </div>
  );
}
