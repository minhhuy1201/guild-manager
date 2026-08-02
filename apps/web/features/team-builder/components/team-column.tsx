import type { Character } from "@/features/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Slot } from "../types/formation";
import { SlotCell } from "./slot-cell";

interface TeamColumnProps {
  /** Team number shown in the header */
  team: number;
  /** The six slots of this team, already sorted by position */
  slots: Slot[];
  /** Occupant of each slot, keyed by slot id. A missing key means the slot is empty. */
  occupants: Map<string, Character>;
}

/**
 * One team of the formation: a single column of six slots stacked vertically.
 * Receives occupants already resolved by slot id — resolving them needs the
 * assignment, which only FormationGrid reads.
 * @param team - Team number shown in the header
 * @param slots - The six slots of this team, sorted by position
 * @param occupants - Occupant of each slot, keyed by slot id
 * @returns Card holding the team's slots
 */
export function TeamColumn({ team, slots, occupants }: TeamColumnProps) {
  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Team {team}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3">
        {slots.map((slot) => (
          <SlotCell key={slot.id} slot={slot} character={occupants.get(slot.id)} />
        ))}
      </CardContent>
    </Card>
  );
}
