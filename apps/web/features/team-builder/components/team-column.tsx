import type { Character } from "@guild/shared/schemas";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTeamHeaderColor } from "../lib/team-colors";
import type { Notes, Slot } from "../types/formation";
import { SlotCell } from "./slot-cell";
import { TeamNameField } from "./team-name-field";

interface TeamColumnProps {
  /** Team number shown in the header */
  team: number;
  /** The team's name, empty string while it still shows its number */
  name: string;
  /** Called with the committed name when the header is edited */
  onNameChange: (team: number, name: string) => void;
  /** The six slots of this team, already sorted by position */
  slots: Slot[];
  /** Occupant of each slot, keyed by slot id. A missing key means the slot is empty. */
  occupants: Map<string, Character>;
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
 * One team of the formation: a single column of six slots stacked vertically.
 * Receives occupants already resolved by slot id — resolving them needs the
 * assignment, which only FormationGrid reads.
 * @param team - Team number shown in the header
 * @param name - The team's name, empty while it shows its number
 * @param onNameChange - Called with the committed name
 * @param slots - The six slots of this team, sorted by position
 * @param occupants - Occupant of each slot, keyed by slot id
 * @param readOnly - Render without drag handles
 * @param absentIds - Ids of placed members who dropped out
 * @param notes - Notes currently shown, keyed by slot id
 * @param onNoteChange - Called with the raw text when a slot's note changes
 * @returns Card holding the team's slots
 */
export function TeamColumn({
  team,
  name,
  onNameChange,
  slots,
  occupants,
  readOnly = false,
  absentIds,
  notes,
  onNoteChange,
}: TeamColumnProps) {
  return (
    <Card className="gap-2 overflow-hidden pt-0 pb-3">
      <CardHeader className={cn("px-3 py-2", getTeamHeaderColor(team))}>
        <TeamNameField
          team={team}
          value={name}
          readOnly={readOnly}
          onCommit={onNameChange}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3">
        {slots.map((slot) => {
          const character = occupants.get(slot.id);

          return (
            <SlotCell
              key={slot.id}
              slot={slot}
              character={character}
              readOnly={readOnly}
              note={notes[slot.id] ?? ""}
              onNoteChange={onNoteChange}
              absentReason={
                character && absentIds.has(character.id)
                  ? "Đã báo nghỉ trận này"
                  : undefined
              }
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
