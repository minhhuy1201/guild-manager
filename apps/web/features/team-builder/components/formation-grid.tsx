"use client";

import { useMemo } from "react";

import type { Character, TeamNames } from "@guild/shared/schemas";

import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";
import { createMockFormation } from "../lib/mock-formation";
import type { Assignment, Notes, Slot } from "../types/formation";
import { FormationBanner } from "./formation-banner";
import { TeamColumn } from "./team-column";

/** Layout is static data, built once at module load. */
const FORMATION = createMockFormation();

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
  /** Lay the columns out as a fixed five-wide grid, whatever the viewport is */
  fixedColumns?: boolean;
}

/**
 * The whole formation: ten team columns laid out with CSS Grid, five per row on
 * large screens — two rows of five, each column holding a slot and its note side
 * by side. Slots are stored flat and grouped by team here, so changing the team
 * count only means changing the layout builder.
 *
 * A banner spanning all five columns sits on top, naming the battle and the match.
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
 * @param fixedColumns - Lay the columns out five-wide whatever the viewport is
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
  fixedColumns = false,
}: FormationGridProps) {
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

  const occupants = useMemo(() => {
    const map = new Map<string, Character>();

    for (const [slotId, characterId] of Object.entries(assignment)) {
      if (characterId === null) continue;
      const character = charactersById.get(characterId);
      if (character) map.set(slotId, character);
    }

    return map;
  }, [assignment, charactersById]);

  return (
    <div className="relative">
      <div
        className={cn(
          "grid gap-3",
          fixedColumns
            ? "grid-cols-5"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-5"
        )}
      >
        <FormationBanner
          title={bannerTitle}
          isGuildWar={isGuildWar}
          locked={locked}
        />

        {teams.map(({ team, slots }) => (
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
          />
        ))}
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
