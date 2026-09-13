"use client";

import { attendanceLabel } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GridDraft } from "../lib/grid-draft";
import { recordKey } from "../lib/record-key";
import { STICKY_NAME_COLUMN } from "../lib/sticky-columns";
import { AttendanceStatusIcon } from "./attendance-status-icon";
import { CharacterName } from "./character-name";

/** How an unanswered cell is named to a screen reader. */
const UNANSWERED_LABEL = "Chưa điểm danh";

interface AttendanceRowProps {
  /** Character of this row */
  character: Character;
  /** Battle sessions (the columns) */
  sessions: BattleSession[];
  /** Current records keyed by (characterId__sessionId) */
  recordMap: Record<string, AttendanceRecord>;
  /** The viewer may change answers - an admin; a member only reads the grid */
  canEdit: boolean;
  /** A save is in flight, so no cell may be pressed */
  disabled: boolean;
  /** The grid's unsaved answers */
  draft: GridDraft;
  /** Press one cell */
  onCellClick: (character: Character, session: BattleSession) => void;
}

/**
 * One attendance row: the character, then one cell per battle day.
 *
 * For an admin every cell is a button - pressing it moves the answer on (the grid owns the cycle
 * and the draft). The cell always shows its answer as the status icon, so it reads the same on a
 * touch screen, where nothing ever hovers. A changed cell shows the draft's answer inside a
 * `primary` ring until it is saved or discarded.
 * @param character - Character of this row
 * @param sessions - Battle sessions, one cell each
 * @param recordMap - Current records
 * @param canEdit - Whether the viewer may change answers
 * @param disabled - Whether a save is in flight
 * @param draft - The grid's unsaved answers
 * @param onCellClick - Press one cell
 * @returns The character's attendance row
 */
export function AttendanceRow({
  character,
  sessions,
  recordMap,
  canEdit,
  disabled,
  draft,
  onCellClick,
}: AttendanceRowProps) {
  return (
    <TableRow>
      <TableCell className={STICKY_NAME_COLUMN}>
        <CharacterName character={character} />
      </TableCell>

      {sessions.map((session) => {
        const key = recordKey(character.id, session.id);
        const record = recordMap[key];
        const change = draft[key];
        const shown = change?.isPresent ?? record?.isPresent;
        const isChanged = change !== undefined;
        const answerLabel =
          shown === undefined ? UNANSWERED_LABEL : attendanceLabel(shown);

        return (
          <TableCell key={session.id} className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              {canEdit ? (
                <button
                  type="button"
                  aria-label={`${character.name}, ${session.label}: ${answerLabel}. Bấm để đổi.`}
                  data-changed={isChanged}
                  disabled={disabled}
                  onClick={() => onCellClick(character, session)}
                  className={cn(
                    "flex size-9 cursor-pointer items-center justify-center rounded-full outline-none",
                    "transition-colors duration-[var(--duration-fast)] hover:bg-foreground/5",
                    "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-60",
                    isChanged && "ring-2 ring-primary"
                  )}
                >
                  <AnswerMark isPresent={shown} />
                </button>
              ) : (
                <AnswerMark isPresent={shown} />
              )}
              {/* Read-only on purpose: the reason is the absent member's own words. It belongs to the
                  stored answer, so it steps aside while the cell holds a different one. */}
              {!isChanged && record?.reason && (
                <span
                  className="block max-w-32 truncate text-xs text-muted-foreground"
                  title={record.reason}
                >
                  {record.reason}
                </span>
              )}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
}

interface AnswerMarkProps {
  /** The answer shown, undefined when there is none */
  isPresent?: boolean;
}

/**
 * One cell's answer, as the coloured status icon every screen uses for it.
 * @param isPresent - The answer shown
 * @returns An emerald swords (yes) / red cross (no) icon, or "—" when unanswered
 */
function AnswerMark({ isPresent }: AnswerMarkProps) {
  // `false` is a real answer, so the unanswered branch must test undefined explicitly.
  if (isPresent === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <AttendanceStatusIcon isPresent={isPresent} />;
}
