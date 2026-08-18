"use client";

import { useMemo } from "react";

import type { Character } from "@shared/schemas";
import { createMockFormation } from "../lib/mock-formation";
import type { Assignment, Notes, Slot } from "../types/formation";
import { TeamColumn } from "./team-column";

/** Layout is static data, built once at module load. */
const FORMATION = createMockFormation();

interface FormationGridProps {
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
}

/**
 * The whole formation: ten team columns laid out with CSS Grid, five per row on
 * large screens — two rows of five, each column holding a slot and its note side
 * by side. Slots are stored flat and grouped by team here, so changing the team
 * count only means changing the layout builder.
 *
 * Takes the assignment as a prop rather than reading the store: what shows is
 * the draft when one exists and the saved copy otherwise, and that merge
 * belongs to the screen hook.
 * @param assignment - Assignment currently shown
 * @param charactersById - Full roster indexed by character id
 * @param readOnly - Render without drag handles
 * @param absentIds - Ids of placed members who dropped out
 * @param notes - Notes currently shown, keyed by slot id
 * @param onNoteChange - Called with the raw text when a slot's note changes
 * @returns Grid of team columns
 */
export function FormationGrid({
  assignment,
  charactersById,
  readOnly = false,
  absentIds,
  notes,
  onNoteChange,
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
      {teams.map(({ team, slots }) => (
        <TeamColumn
          key={team}
          team={team}
          slots={slots}
          occupants={occupants}
          readOnly={readOnly}
          absentIds={absentIds}
          notes={notes}
          onNoteChange={onNoteChange}
        />
      ))}
    </div>
  );
}
