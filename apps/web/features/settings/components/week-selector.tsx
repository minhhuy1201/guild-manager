"use client";

import { CalendarCheck, CalendarClock } from "lucide-react";
import type { Week } from "@guild/shared/schemas";

import { DateRange } from "@/components/shared/date-range";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
  /** The two schedulable weeks: the open one and the next */
  weeks: Week[];
  /** Monday marker of the week being viewed; undefined when no week is open */
  value: string | undefined;
  /** Called when the user switches week */
  onChange: (weekStart: string) => void;
}

/**
 * Pick the week to schedule. There are exactly two options, so two buttons instead of a select — one
 * interaction fewer, and both are visible at once.
 * @param weeks - The two schedulable weeks
 * @param value - Monday marker of the week being viewed; undefined when no week is open
 * @param onChange - Called when the user switches week
 * @returns The week picker bar
 */
export function WeekSelector({ weeks, value, onChange }: WeekSelectorProps) {
  return (
    <div
      data-slot="week-selector"
      className="flex flex-wrap gap-1 max-sm:w-full max-sm:flex-col rounded-inner border border-border/60 bg-muted/60 p-1"
    >
      {weeks.map((week) => (
        <Button
          key={week.weekStart}
          variant="ghost"
          size="sm"
          aria-current={week.weekStart === value ? "true" : undefined}
          className={cn(
            "max-sm:justify-start",
            week.weekStart === value
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
              : "text-muted-foreground hover:bg-foreground/5"
          )}
          onClick={() => onChange(week.weekStart)}
        >
          {week.isActive ? <CalendarCheck /> : <CalendarClock />}
          {week.isActive ? "Tuần này" : "Tuần sau"}
          <DateRange
            start={week.weekStart}
            end={week.weekEnd}
            className="opacity-70"
          />
        </Button>
      ))}
    </div>
  );
}
