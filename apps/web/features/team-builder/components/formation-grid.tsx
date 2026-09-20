"use client";

import { useMemo } from "react";

import type { Character, TeamNames } from "@guild/shared/schemas";

import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";
import { createMockFormation, SLOTS_PER_TEAM } from "../lib/mock-formation";
import { teamLabel } from "../lib/team-label";
import { useTeamViewStore } from "../store/team-view-store";
import type {
  Assignment,
  FormationLayout,
  Notes,
  Slot,
} from "../types/formation";
import { FormationBanner } from "./formation-banner";
import { TeamColumn } from "./team-column";
import { TeamRowGroup } from "./team-row-group";
import { TeamSwitcher, type TeamChip } from "./team-switcher";

/** Layout is static data, built once at module load. */
const FORMATION = createMockFormation();

/** Teams in one row of the grid, and so in one foldable group. */
const TEAMS_PER_ROW = 5;

interface FormationGridProps {
  /** Banner headline shown above the columns */
  bannerTitle: string;
  /** Whether the battle on screen is the Guild War — the banner marks it */
  isGuildWar: boolean;
  /** Whether the battle on screen is already played — the banner says so */
  locked: boolean;
  /** Assignment currently shown — a draft, or the saved copy */
  assignment: Assignment;
  /** Full roster indexed by character id */
  charactersById: Map<string, Character>;
  /** Render without drag handles */
  readOnly?: boolean;
  /** Ids of members who are placed but marked absent for this battle */
  absentIds: Set<string>;
  /** Notes currently shown, keyed by slot id */
  notes: Notes;
  /** Called with the raw text when a slot's note changes */
  onNoteChange: (slotId: string, text: string) => void;
  /** Team names, keyed by team number. A team with no key shows its number. */
  names: TeamNames;
  /** Called with the committed name when a team header is edited */
  onNameChange: (team: number, name: string) => void;
  /** True while a save is in flight — the grid is covered and frozen */
  saving?: boolean;
  /** Where the grid is drawn: the admin's screen, or the Discord image */
  layout?: FormationLayout;
}

/**
 * The whole formation: ten team columns laid out with CSS Grid, five per row on
 * large screens — two rows of five, each column holding a slot and its note side
 * by side. Slots are stored flat and grouped by team here, so changing the team
 * count only means changing the layout builder.
 *
 * Each row is its own grid inside a `TeamRowGroup`, which folds it away on the admin's screen;
 * rows carry the same gap as the columns, so two grids read as the one grid they replace.
 *
 * A banner as wide as the rows sits on top, naming the battle and the match.
 *
 * `layout` gathers what the Discord image does differently from the screen, both for one reason -
 * the image is read on its own, without the tabs and the controls around it: five columns whatever
 * the window, and the tall banner as its only headline. The screen keeps the banner to one line,
 * since the day tab right above it already names the battle.
 *
 * Takes the assignment as a prop rather than reading the store: what shows is
 * the draft when one exists and the saved copy otherwise, and that merge
 * belongs to the screen hook.
 * @param bannerTitle - Banner headline shown above the columns
 * @param isGuildWar - Whether the battle on screen is the Guild War
 * @param locked - Whether the battle on screen is already played
 * @param assignment - Assignment currently shown
 * @param charactersById - Full roster indexed by character id
 * @param readOnly - Render without drag handles
 * @param absentIds - Ids of placed members who dropped out
 * @param notes - Notes currently shown, keyed by slot id
 * @param onNoteChange - Called with the raw text when a slot's note changes
 * @param names - Team names, keyed by team number
 * @param onNameChange - Called with the committed name of a team
 * @param saving - True while a save is in flight
 * @param layout - Where the grid is drawn, the screen by default
 * @returns Grid of team columns
 */
export function FormationGrid({
  bannerTitle,
  isGuildWar,
  locked,
  assignment,
  charactersById,
  readOnly = false,
  absentIds,
  notes,
  onNoteChange,
  names,
  onNameChange,
  saving = false,
  layout = "screen",
}: FormationGridProps) {
  const isCapture = layout === "capture";

  const teams = useMemo(() => {
    const grouped = new Map<number, Slot[]>();

    for (const slot of FORMATION.slots) {
      const slots = grouped.get(slot.team) ?? [];
      slots.push(slot);
      grouped.set(slot.team, slots);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([team, slots]) => ({
        team,
        slots: [...slots].sort((a, b) => a.position - b.position),
      }));
  }, []);

  /** The teams cut into the rows the grid draws them in, five per row. */
  const rows = useMemo(() => {
    const chunks: (typeof teams)[] = [];

    for (let i = 0; i < teams.length; i += TEAMS_PER_ROW) {
      chunks.push(teams.slice(i, i + TEAMS_PER_ROW));
    }

    return chunks;
  }, [teams]);

  const occupants = useMemo(() => {
    const map = new Map<string, Character>();

    for (const [slotId, characterId] of Object.entries(assignment)) {
      if (characterId === null) continue;
      const character = charactersById.get(characterId);
      if (character) map.set(slotId, character);
    }

    return map;
  }, [assignment, charactersById]);

  /**
   * Count the slots of a team that hold someone.
   * @param slots - Slots to count
   * @returns How many of them are taken
   */
  const countFilled = (slots: Slot[]) =>
    slots.filter((slot) => occupants.has(slot.id)).length;

  const selectedTeam = useTeamViewStore((s) => s.selectedTeam);
  const selectTeam = useTeamViewStore((s) => s.selectTeam);
  const chips: TeamChip[] = teams.map(({ team, slots }) => ({
    team,
    label: teamLabel(team, names[String(team)] ?? ""),
    filled: countFilled(slots),
  }));

  return (
    <div className="relative">
      <div className="flex flex-col gap-3">
        <FormationBanner
          title={bannerTitle}
          isGuildWar={isGuildWar}
          locked={locked}
          size={isCapture ? "tall" : "compact"}
        />

        {/* Below `md` the screen shows one team at a time: ten teams stacked made the page almost
            6,000px tall on a phone. The capture always holds all ten, whatever the window. */}
        {isCapture ? null : (
          <TeamSwitcher
            teams={chips}
            slotsPerTeam={SLOTS_PER_TEAM}
            selectedTeam={selectedTeam}
            onSelect={selectTeam}
          />
        )}

        {rows.map((row) => {
          const grid = (
            <div
              className={cn(
                "grid gap-3",
                isCapture
                  ? "grid-cols-5"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-5"
              )}
            >
              {row.map(({ team, slots }) => (
                <TeamColumn
                  key={team}
                  team={team}
                  name={names[String(team)] ?? ""}
                  onNameChange={onNameChange}
                  slots={slots}
                  occupants={occupants}
                  readOnly={readOnly}
                  absentIds={absentIds}
                  notes={notes}
                  onNoteChange={onNoteChange}
                  // Hidden with CSS, not left out of the tree: no screen size to read in JS (so no
                  // hydration mismatch), and every slot stays registered with dnd-kit from `md` up.
                  className={
                    !isCapture && team !== selectedTeam
                      ? "max-md:hidden"
                      : undefined
                  }
                />
              ))}
            </div>
          );

          const first = row[0].team;
          const last = row[row.length - 1].team;
          const filled = row.reduce(
            (count, { slots }) => count + countFilled(slots),
            0
          );

          // The image sent to Discord is read on its own, so it never folds: all ten teams, no headers.
          return isCapture ? (
            <div key={first}>{grid}</div>
          ) : (
            <TeamRowGroup
              key={first}
              label={`Đội ${first}-${last}`}
              filled={filled}
              total={row.length * SLOTS_PER_TEAM}
            >
              {grid}
            </TeamRowGroup>
          );
        })}
      </div>

      {/* Covers the grid rather than only spinning inside the toolbar button:
          the eyes are down here, and the cover also keeps a drag or a keystroke
          from landing on a formation already on its way to the server. */}
      {saving ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/60 text-sm font-medium backdrop-blur-[1px]">
          <Spinner />
          Đang lưu đội hình...
        </div>
      ) : null}
    </div>
  );
}
