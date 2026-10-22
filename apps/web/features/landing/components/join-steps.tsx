import { OrnamentDivider } from "@/components/shared/ornament-divider";

import { JOIN_STEPS } from "../lib/guild-info";

/** Ties the section to its heading, so the region carries a name. */
const JOIN_HEADING_ID = "vao-bang-tieu-de";

/**
 * What joining looks like from the outside, in three moves.
 *
 * Each move is named by its verb, and a numbered square plus a connecting rule makes the three
 * read as one path. The square borrows the guild seal's jade edge, so the steps belong to the same
 * house; the icon stays beside the title as a cue.
 * @returns The joining block
 */
export function JoinSteps() {
  return (
    <section aria-labelledby={JOIN_HEADING_ID} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2
          id={JOIN_HEADING_ID}
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          Vào bang thế nào
        </h2>
        <OrnamentDivider stroke="brush" />
      </div>

      <ol role="list" className="flex flex-col">
        {JOIN_STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isLast = index === JOIN_STEPS.length - 1;

          return (
            <li
              key={step.title}
              className="relative flex items-start gap-4 pb-8 last:pb-0 sm:gap-5"
            >
              {/* The path: a rule from under this step's number to the next one. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute top-12 bottom-1 left-5.5 w-px -translate-x-1/2 bg-linear-to-b from-jade/50 to-jade/15"
                />
              )}
              <span
                aria-hidden
                className="relative flex size-11 shrink-0 items-center justify-center rounded-md border border-jade/50 bg-card font-sans text-lg font-semibold text-jade lining-nums tabular-nums shadow-[inset_0_1px_0_var(--card-highlight)]"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5 pt-1">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <StepIcon aria-hidden className="size-4.5 shrink-0 text-jade" />
                  {step.title}
                </h3>
                <p className="max-w-prose text-sm text-pretty text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
