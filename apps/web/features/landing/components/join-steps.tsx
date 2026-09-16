import { OrnamentDivider } from "@/components/shared/ornament-divider";

import { JOIN_STEPS } from "../lib/guild-info";

/** Ties the section to its heading, so the region carries a name. */
const JOIN_HEADING_ID = "vao-bang-tieu-de";

/**
 * What joining looks like from the outside, in three moves.
 *
 * Each move is named by its verb rather than by a number: "Stage 1" tells a reader nothing that
 * "Nhắn cho ban chỉ huy" does not already tell them. The mark sits in the same square jade frame as
 * the guild's seal, so the three steps read as part of the same house.
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
        <OrnamentDivider />
      </div>

      <ol className="flex flex-col gap-7">
        {JOIN_STEPS.map((step) => {
          const StepIcon = step.icon;

          return (
            <li key={step.title} className="flex items-start gap-4 sm:gap-5">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-md border border-jade/50 bg-jade/10 text-jade"
              >
                <StepIcon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5 pt-1">
                <h3 className="text-base font-semibold">{step.title}</h3>
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
