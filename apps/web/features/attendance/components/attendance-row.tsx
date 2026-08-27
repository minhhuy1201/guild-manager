"use client";

import { Check, Swords, X } from "lucide-react";
import { AttendanceStatus } from "@guild/shared/enums";
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
import { StatusIcon } from "@/components/shared/status-icon";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { recordKey } from "../lib/record-key";
import {
  STICKY_ACTION_COLUMN,
  STICKY_NAME_COLUMN,
} from "../lib/sticky-columns";
import { CharacterName } from "./character-name";

/** Draft state of a row being edited: sessionId → status. */
export type AttendanceDraft = Record<string, AttendanceStatus | undefined>;

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
  /** Change one cell's draft status */
  onDraftChange: (sessionId: string, status: AttendanceStatus) => void;
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
        const currentStatus =
          recordMap[recordKey(character.id, session.id)]?.status;
        const sessionLocked = lockedSessionIds.has(session.id);
        // A locked column always renders read-only, even while the row is being edited.
        const showToggle = isEditing && !sessionLocked;
        return (
          <TableCell key={session.id} className="text-center">
            {showToggle ? (
              <AttendanceToggle
                value={draft[session.id]}
                onSelect={(status) => onDraftChange(session.id, status)}
              />
            ) : (
              <StatusBadge status={currentStatus} />
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
  /** Current status (when already marked) */
  status?: AttendanceStatus;
}

/**
 * Read-only attendance status badge, shown as a coloured icon.
 * @returns A green (yes) / red (no) icon, or "—" when unmarked
 */
function StatusBadge({ status }: StatusBadgeProps) {
  if (status === AttendanceStatus.PRESENT) {
    return <StatusIcon tone="success" label="Có" />;
  }
  if (status === AttendanceStatus.ABSENT) {
    return <StatusIcon tone="danger" label="Không" />;
  }
  return <span className="text-muted-foreground">—</span>;
}

interface AttendanceToggleProps {
  /** Current status (when already picked) */
  value?: AttendanceStatus;
  onSelect: (status: AttendanceStatus) => void;
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
          aria-pressed={value === AttendanceStatus.ABSENT}
          onClick={() => onSelect(AttendanceStatus.ABSENT)}
          className={cn(
            "group/no flex w-9 cursor-pointer items-center justify-start gap-2 overflow-hidden px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-[var(--duration-base)] ease-out-soft hover:w-22",
            value === AttendanceStatus.ABSENT
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
          aria-pressed={value === AttendanceStatus.PRESENT}
          onClick={() => onSelect(AttendanceStatus.PRESENT)}
          className={cn(
            "group/yes flex w-9 cursor-pointer items-center justify-end gap-2 overflow-hidden border-l px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-[var(--duration-base)] ease-out-soft hover:w-18",
            value === AttendanceStatus.PRESENT
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
