import type { Character } from "@guild/shared/schemas";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  NO_CHOSEN_COLORS,
  resolveTeamColor,
  TEAM_COLOR_STYLES,
} from "@/lib/team-color";
import { cn } from "@/lib/utils";
import {
  TEAM_CAPTURE_MATCH_ATTRIBUTE,
  TEAM_CAPTURE_MEMBERS_ATTRIBUTE,
  TEAM_CAPTURE_TEAM_ATTRIBUTE,
} from "../lib/team-capture-attributes";
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
  /** Extra classes for the card, e.g. hiding it on a phone while another team is shown */
  className?: string;
  /** Stored match number (1-based). Set, a card with someone in it is marked for the Team notice image. */
  captureMatchIndex?: number;
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
 * @param className - Extra classes for the card
 * @param captureMatchIndex - Match number that marks this card for capture
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
  className,
  captureMatchIndex,
}: TeamColumnProps) {
  const colors = TEAM_COLOR_STYLES[resolveTeamColor(team, NO_CHOSEN_COLORS)];
  const memberIds = [
    ...new Set(
      slots.flatMap((slot) => occupants.get(slot.id)?.id ?? [])
    ),
  ];
  const captureMarks =
    captureMatchIndex !== undefined && memberIds.length > 0
      ? {
          [TEAM_CAPTURE_MATCH_ATTRIBUTE]: String(captureMatchIndex),
          [TEAM_CAPTURE_TEAM_ATTRIBUTE]: String(team),
          [TEAM_CAPTURE_MEMBERS_ATTRIBUTE]: memberIds.join(" "),
        }
      : undefined;

  return (
    <Card
      {...captureMarks}
      className={cn(
        "gap-2 overflow-hidden pt-0 pb-3",
        "bg-card",
        className
      )}
    >
      <CardHeader
        className={cn("border-b border-border/60 px-3 py-2.5", colors.header)}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            data-slot="team-marker"
            className={cn("size-2.5 shrink-0 rounded-full", colors.marker)}
          />
          <div className="min-w-0 flex-1">
            <TeamNameField
              team={team}
              value={name}
              readOnly={readOnly}
              onCommit={onNameChange}
            />
          </div>
        </div>
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
