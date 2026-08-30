"use client";

import { Check, Swords, X } from "lucide-react";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import {
  EditAction,
  RowActionButton,
  RowActions,
} from "@/components/shared/action-buttons";
import { Spinner } from "@/components/shared/spinner";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { recordKey } from "../lib/record-key";
import {
  STICKY_ACTION_COLUMN,
  STICKY_NAME_COLUMN,
} from "../lib/sticky-columns";
import { AttendanceStatusIcon } from "./attendance-status-icon";
import { CharacterName } from "./character-name";

/** Draft state of a row being edited: sessionId → answer (undefined = not marked yet). */
export type AttendanceDraft = Record<string, boolean | undefined>;

interface AttendanceRowProps {
  /** Character of this row */
  character: Character;
  /** Battle sessions (the columns) */
  sessions: BattleSession[];
  /** Current records keyed by (characterId__sessionId) */
  recordMap: Record<string, AttendanceRecord>;
  /** Ids of days past their deadline (their columns are locked) */
  lockedSessionIds: Set<string>;
  /** Every day is locked — disable the edit button */
  allLocked: boolean;
  /** Whether this row is in editing mode */
  isEditing: boolean;
  /** This row's attendance write is in flight — show a spinner instead of the tick */
  isSaving: boolean;
  /** Draft state (only used while isEditing) */
  draft: AttendanceDraft;
  /** Start editing this row */
  onStartEdit: (character: Character) => void;
  /** Change one cell's draft answer */
  onDraftChange: (sessionId: string, isPresent: boolean) => void;
  /** Cancel editing and reset */
  onCancel: () => void;
  /** Confirm and save the changes */
  onConfirm: (character: Character) => void;
}

/**
 * One attendance row: read-only by default, switchable to editing.
 * The last column holds the actions (a pencil when read-only, Cancel/Confirm while editing).
 * @returns The character's attendance row
 */
export function AttendanceRow({
  character,
  sessions,
  recordMap,
  lockedSessionIds,
  allLocked,
  isEditing,
  isSaving,
  draft,
  onStartEdit,
  onDraftChange,
  onCancel,
  onConfirm,
}: AttendanceRowProps) {
  return (
    <TableRow>
      <TableCell className={STICKY_NAME_COLUMN}>
        <CharacterName character={character} />
      </TableCell>

      {sessions.map((session) => {
        const currentIsPresent =
          recordMap[recordKey(character.id, session.id)]?.isPresent;
        const sessionLocked = lockedSessionIds.has(session.id);
        // A locked column always renders read-only, even while the row is being edited.
        const showToggle = isEditing && !sessionLocked;
        return (
          <TableCell key={session.id} className="text-center">
            {showToggle ? (
              <AttendanceToggle
                value={draft[session.id]}
                onSelect={(isPresent) => onDraftChange(session.id, isPresent)}
              />
            ) : (
              <StatusBadge isPresent={currentIsPresent} />
            )}
          </TableCell>
        );
      })}

      <TableCell className={STICKY_ACTION_COLUMN}>
        {isEditing ? (
          <RowActions className="gap-1.5">
            <RowActionButton
              label="Huỷ"
              icon={<X className="size-4" />}
              disabled={isSaving}
              onClick={onCancel}
            />
            <RowActionButton
              label="Xác nhận điểm danh"
              icon={isSaving ? <Spinner size="sm" /> : <Check className="size-4" />}
              variant="default"
              disabled={isSaving}
              onClick={() => onConfirm(character)}
            />
          </RowActions>
        ) : (
          <EditAction
            label="Điểm danh"
            disabled={allLocked}
            onClick={() => onStartEdit(character)}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

interface StatusBadgeProps {
  /** Current answer (when already marked) */
  isPresent?: boolean;
}

/**
 * Read-only attendance badge, shown as a coloured icon.
 * @returns An emerald swords (yes) / red cross (no) icon, or "—" when unmarked
 */
function StatusBadge({ isPresent }: StatusBadgeProps) {
  // `false` is a real answer, so the unmarked branch must test undefined explicitly.
  if (isPresent === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <AttendanceStatusIcon isPresent={isPresent} />;
}

interface AttendanceToggleProps {
  /** Current answer (when already picked) */
  value?: boolean;
  onSelect: (isPresent: boolean) => void;
}

/**
 * The yes/no button pair for one attendance cell (editing mode only).
 *
 * Unlike the read-only `StatusBadge`, this one spells out "Có"/"Không": it is a control the user is
 * about to press, and the swords icon marks "đi đánh" the same way `SessionLabel` marks a battle.
 * Each button rests as a neutral icon and only on hover widens and takes its own colour — red for
 * "Không", emerald for "Có" — so a week with many sessions still fits across the grid. The picked
 * side stays filled, which is the only thing that says what was chosen once the pointer leaves.
 * @returns A two-button segmented control
 */
function AttendanceToggle({ value, onSelect }: AttendanceToggleProps) {
  return (
    // A fixed-width slot: the buttons grow inside it, so the column keeps its width on hover.
    // Without it the whole table shifts every time the pointer crosses a cell.
    <div className="mx-auto flex w-32 justify-center">
      <div className="inline-flex overflow-hidden rounded-lg border">
        <button
          type="button"
          aria-pressed={value === false}
          onClick={() => onSelect(false)}
          className={cn(
            "group/no flex w-9 cursor-pointer items-center justify-start gap-2 overflow-hidden px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-[var(--duration-base)] ease-out-soft hover:w-22",
            value === false
              ? "bg-destructive text-white"
              : "text-foreground hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <X className="size-4 shrink-0" />
          {/* Hidden outright at rest: clipping with overflow alone still leaks a sliver of the word. */}
          <span className="opacity-0 transition-opacity duration-[var(--duration-base)] group-hover/no:opacity-100">
            Không
          </span>
        </button>
        <button
          type="button"
          aria-pressed={value === true}
          onClick={() => onSelect(true)}
          className={cn(
            "group/yes flex w-9 cursor-pointer items-center justify-end gap-2 overflow-hidden border-l px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-[var(--duration-base)] ease-out-soft hover:w-18",
            value === true
              ? "bg-emerald-500 text-white"
              : "text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
          )}
        >
          <span className="opacity-0 transition-opacity duration-[var(--duration-base)] group-hover/yes:opacity-100">
            Có
          </span>
          <Swords className="size-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
