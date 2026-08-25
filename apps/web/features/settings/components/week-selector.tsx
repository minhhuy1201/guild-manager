"use client";

import { CalendarCheck, CalendarClock } from "lucide-react";
import type { Week } from "@guild/shared/schemas";

import { DateRange } from "@/components/shared/date-range";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
  /** The two schedulable weeks: the open one and the next */
  weeks: Week[];
  /** Monday marker of the week being viewed */
  value: string;
  /** Called when the user switches week */
  onChange: (weekStart: string) => void;
}

/**
 * Pick the week to schedule. There are exactly two options, so two buttons instead of a select — one
 * interaction fewer, and both are visible at once.
 * @param weeks - The two schedulable weeks
 * @param value - Monday marker of the week being viewed
 * @param onChange - Called when the user switches week
 * @returns The week picker bar
 */
export function WeekSelector({ weeks, value, onChange }: WeekSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {weeks.map((week) => (
        <Button
          key={week.weekStart}
          variant={week.weekStart === value ? "secondary" : "ghost"}
          size="sm"
          aria-current={week.weekStart === value ? "true" : undefined}
          className={cn(week.weekStart !== value && "text-muted-foreground")}
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
