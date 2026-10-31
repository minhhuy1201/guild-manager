import type { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { Character, TeamColors, TeamIcons } from "@guild/shared/schemas";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { resolveTeamColor, TEAM_COLOR_STYLES } from "@/lib/team-color";
import { cn } from "@/lib/utils";
import {
  TEAM_CAPTURE_MATCH_ATTRIBUTE,
  TEAM_CAPTURE_MEMBERS_ATTRIBUTE,
  TEAM_CAPTURE_TEAM_ATTRIBUTE,
} from "../lib/team-capture-attributes";
import type { Notes, Slot } from "../types/formation";
import { SlotCell } from "./slot-cell";
import { TeamNameField } from "./team-name-field";
import { TeamStyleButton } from "./team-style-button";

interface TeamColumnProps {
  /** Team number shown in the header */
  team: number;
  /** The team's name, empty string while it still shows its number */
  name: string;
  /** Called with the committed name when the header is edited */
  onNameChange: (team: number, name: string) => void;
  /** Colours Managers picked, keyed by team number. A team with no key shows its default colour. */
  colors: TeamColors;
  /** Called with the picked colour when the header's colour button is used; `null` for the default */
  onColorChange: (team: number, color: TeamColor | null) => void;
  /** Icons Managers picked, keyed by team number. A team with no key shows its colour dot. */
  icons: TeamIcons;
  /** Called with the picked icon when the header's style button is used; `null` for no icon */
  onIconChange: (team: number, icon: TeamIcon | null) => void;
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
 * @param colors - Chosen team colours, keyed by team number
 * @param onColorChange - Called with the picked colour
 * @param icons - Chosen team icons, keyed by team number
 * @param onIconChange - Called with the picked icon
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
  colors,
  onColorChange,
  icons,
  onIconChange,
  slots,
  occupants,
  readOnly = false,
  absentIds,
  notes,
  onNoteChange,
  className,
  captureMatchIndex,
}: TeamColumnProps) {
  const style = TEAM_COLOR_STYLES[resolveTeamColor(team, colors)];
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
        className={cn("border-b border-border/60 px-3 py-2.5", style.header)}
      >
        <div className="flex items-center gap-2">
          <TeamStyleButton
            team={team}
            colors={colors}
            readOnly={readOnly}
            icons={icons}
            onColorChange={onColorChange}
            onIconChange={onIconChange}
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
