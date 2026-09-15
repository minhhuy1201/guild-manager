import { cn } from "@/lib/utils";

/** One team as its chip shows it. */
export interface TeamChip {
  /** Team number */
  team: number;
  /** The team's name, or its number while it has none */
  label: string;
  /** Slots of the team that hold someone */
  filled: number;
}

interface TeamSwitcherProps {
  /** Every team of the formation, in order */
  teams: TeamChip[];
  /** Slots in one team, the denominator of each count */
  slotsPerTeam: number;
  /** Team currently shown */
  selectedTeam: number;
  /** Show another team */
  onSelect: (team: number) => void;
}

/**
 * The phone's way between teams: below `md` the grid shows one team at a time, and this grid of chips
 * picks which. Each chip names its team and counts who is placed, so a glance shows which teams are
 * still short without opening each. Five columns, two rows: fixed, so it never widens the page.
 * Not sticky - a team is six slots, so the chips stay close to it, and pinned they would take two
 * more rows of an already crowded screen.
 * @param teams - Every team, in order
 * @param slotsPerTeam - Slots in one team
 * @param selectedTeam - Team currently shown
 * @param onSelect - Show another team
 * @returns The chip grid, hidden from `md` up
 */
export function TeamSwitcher({
  teams,
  slotsPerTeam,
  selectedTeam,
  onSelect,
}: TeamSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Chọn đội để xem"
      className="col-span-full grid grid-cols-5 gap-1.5 md:hidden"
    >
      {teams.map(({ team, label, filled }) => {
        const isSelected = team === selectedTeam;
        return (
          <button
            key={team}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(team)}
            // The selected chip is an in-page selection, so it takes the primary surface (frontend.md §6).
            className={cn(
              "flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md border px-1 py-1 text-xs leading-tight outline-none",
              "transition-colors duration-[var(--duration-fast)] focus-visible:ring-3 focus-visible:ring-ring/50",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-foreground/5"
            )}
          >
            <span className="w-full truncate text-center font-semibold">
              {label}
            </span>
            <span className="tabular-nums opacity-80">
              {filled}/{slotsPerTeam}
            </span>
          </button>
        );
      })}
    </div>
  );
}
