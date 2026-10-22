import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** The two steps of the create form, in order. */
export type CreateRaceStep = "prizes" | "roster";

const STEPS: readonly { id: CreateRaceStep; label: string }[] = [
  { id: "prizes", label: "Giải thưởng" },
  { id: "roster", label: "Người tham gia" },
];

interface CreateRaceStepIndicatorProps {
  current: CreateRaceStep;
}

/**
 * Two labelled dots joined by a bar; the current step is filled, a finished one shows a tick.
 * @param current - Step on screen
 * @returns The indicator
 */
export function CreateRaceStepIndicator({ current }: CreateRaceStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Các bước tạo đợt đua">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step.id}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              index > 0 && "flex-1",
              isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn("h-px flex-1", isDone || isCurrent ? "bg-primary" : "bg-border")}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                (isCurrent || isDone) && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {isDone ? <Check className="size-3.5" /> : index + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
