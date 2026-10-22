"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GrantChecklistProps<T extends string> {
  /** Heading of the group */
  legend: string;
  /** Prefix that keeps the checkbox ids unique within the page */
  idPrefix: string;
  /** Every option, in display order */
  options: readonly T[];
  /** Display label per option */
  labels: Record<T, string>;
  /** Options currently ticked */
  value: readonly T[];
  /** Called with the new ticked set, in display order */
  onChange: (next: T[]) => void;
  /** Set the labels in a monospace face, for slash commands */
  isMonospace?: boolean;
}

/**
 * A titled group of checkboxes for one kind of Grant.
 * @param props.legend - Heading of the group
 * @param props.idPrefix - Prefix that keeps the checkbox ids unique
 * @param props.options - Every option, in display order
 * @param props.labels - Display label per option
 * @param props.value - Options currently ticked
 * @param props.onChange - Called with the new ticked set
 * @param props.isMonospace - Whether to set the labels in a monospace face
 * @returns The fieldset
 */
export function GrantChecklist<T extends string>({
  legend,
  idPrefix,
  options,
  labels,
  value,
  onChange,
  isMonospace = false,
}: GrantChecklistProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1 rounded-inner border border-border bg-muted/30 px-3 pb-2 pt-1">
      <legend className="px-1 text-sm font-medium text-muted-foreground">
        {legend}
      </legend>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${idPrefix}-${option}`;

          return (
            <div key={option} className="flex min-h-10 items-center gap-2.5">
              <Checkbox
                id={id}
                checked={value.includes(option)}
                onCheckedChange={(checked) =>
                  onChange(
                    options.filter((other) =>
                      other === option ? checked : value.includes(other)
                    )
                  )
                }
              />
              <Label
                htmlFor={id}
                className={cn("flex-1 cursor-pointer", isMonospace && "font-mono")}
              >
                {labels[option]}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
