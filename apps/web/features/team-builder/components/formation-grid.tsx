"use client";

import { useMemo } from "react";

import type { Character } from "@/features/attendance";
import { useFormationStore } from "../store/formation-store";
import type { Slot } from "../types/formation";
import { TeamColumn } from "./team-column";

interface FormationGridProps {
  /** Full roster indexed by character id */
  charactersById: Map<string, Character>;
}

/**
 * The whole formation: ten team columns laid out with CSS Grid, five per row on
 * large screens. Slots are stored flat and grouped by team here, so changing the
 * team count only means changing the mock builder.
 * @param charactersById - Full roster indexed by character id
 * @returns Grid of team columns
 */
export function FormationGrid({ charactersById }: FormationGridProps) {
  const formation = useFormationStore((state) => state.formation);
  const assignment = useFormationStore((state) => state.assignment);

  const teams = useMemo(() => {
    const grouped = new Map<number, Slot[]>();

    for (const slot of formation.slots) {
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
  }, [formation.slots]);

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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {teams.map(({ team, slots }) => (
        <TeamColumn key={team} team={team} slots={slots} occupants={occupants} />
      ))}
    </div>
  );
}
