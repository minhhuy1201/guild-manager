"use client";

import { useState } from "react";
import { TeamColor } from "@guild/shared/enums";
import type { TeamColors } from "@guild/shared/schemas";
import { Check } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  NO_CHOSEN_COLORS,
  resolveTeamColor,
  TEAM_COLOR_STYLES,
} from "@/lib/team-color";
import { cn } from "@/lib/utils";

interface TeamStyleButtonProps {
  /** Team number, as shown in the header */
  team: number;
  /** Colours Managers picked, keyed by team number. A team with no key is on its default colour. */
  colors: TeamColors;
  /** Render a static dot - a past week or a battle already fought */
  readOnly?: boolean;
  /** Called with the picked colour; `null` puts the team back on its default colour */
  onColorChange: (team: number, color: TeamColor | null) => void;
}

/** Shared look of a swatch cell: a round, label-under-dot target at least 44px tall on a phone. */
const CELL_CLASS = cn(
  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-inner px-1 py-1.5 text-sm",
  "transition-colors duration-[var(--duration-fast)] outline-none",
  "hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50",
  "aria-pressed:bg-foreground/10 aria-pressed:font-semibold"
);

/**
 * The dot before a team's name. Editable, it is a button opening a grid of the eight team colours,
 * "Mặc định" first; read-only, it is the dot alone.
 *
 * Picking writes to the draft, not to the server - the screen's Save button is what reaches the API,
 * the same as renaming the team.
 * @param team - Team number
 * @param colors - Chosen colours, keyed by team number
 * @param readOnly - Render the dot without a button
 * @param onColorChange - Called with the picked colour, `null` for "Mặc định"
 * @returns The static dot, or the button with its popover
 */
export function TeamStyleButton({
  team,
  colors,
  readOnly = false,
  onColorChange,
}: TeamStyleButtonProps) {
  const [open, setOpen] = useState(false);

  const current = resolveTeamColor(team, colors);
  const defaultColor = resolveTeamColor(team, NO_CHOSEN_COLORS);
  const isDefault = colors[String(team)] === undefined;

  const dot = (
    <span
      aria-hidden
      data-slot="team-marker"
      className={cn(
        "size-3.5 shrink-0 rounded-full",
        TEAM_COLOR_STYLES[current].marker
      )}
    />
  );

  if (readOnly) return <span className="grid size-6 place-items-center">{dot}</span>;

  /**
   * Hand the pick to the draft and close the popover.
   * @param color - The picked colour, `null` for the default
   */
  function pick(color: TeamColor | null) {
    onColorChange(team, color);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Màu đội ${team}: ${TEAM_COLOR_STYLES[current].label}${isDefault ? " (mặc định)" : ""}. Nhấn để đổi màu.`}
        className={cn(
          // 44px square on a phone (frontend display rules); a snug target beside the name above it.
          "grid size-8 shrink-0 place-items-center rounded-full max-sm:size-11",
          "transition-colors duration-[var(--duration-fast)] outline-none",
          "hover:bg-foreground/5 aria-expanded:bg-foreground/10",
          "focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        {dot}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2">
        <PopoverTitle className="px-1 text-sm font-medium text-muted-foreground">
          Màu đội {team}
        </PopoverTitle>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            aria-pressed={isDefault}
            onClick={() => pick(null)}
            className={CELL_CLASS}
          >
            <span
              aria-hidden
              className={cn(
                // Dashed ring: "the colour you would get anyway", not a colour of its own.
                "grid size-7 place-items-center rounded-full border border-dashed border-foreground/40"
              )}
            >
              <span
                className={cn(
                  "size-3.5 rounded-full",
                  TEAM_COLOR_STYLES[defaultColor].marker
                )}
              />
            </span>
            Mặc định
          </button>
          {Object.values(TeamColor).map((color) => (
            <button
              key={color}
              type="button"
              aria-pressed={!isDefault && current === color}
              aria-label={TEAM_COLOR_STYLES[color].label}
              onClick={() => pick(color)}
              className={CELL_CLASS}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-7 place-items-center rounded-full text-background",
                  TEAM_COLOR_STYLES[color].marker
                )}
              >
                {!isDefault && current === color ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : null}
              </span>
              <span aria-hidden>{TEAM_COLOR_STYLES[color].label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
