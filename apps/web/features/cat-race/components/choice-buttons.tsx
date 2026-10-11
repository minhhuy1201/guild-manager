"use client";

import { Button } from "@/components/ui/button";

interface ChoiceButtonsProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * A small row of mutually exclusive buttons - the selected one takes the primary surface.
 * @param label - Accessible name of the group
 * @param value - Selected option
 * @param options - The choices
 * @param onChange - Receives the picked value
 * @returns The button group
 */
export function ChoiceButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: ChoiceButtonsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === value ? "default" : "outline"}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
