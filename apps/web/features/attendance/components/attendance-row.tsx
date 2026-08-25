"use client";

import { Check, X } from "lucide-react";
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
              onClick={onCancel}
            />
            <RowActionButton
              label="Xác nhận điểm danh"
              icon={<Check className="size-4" />}
              variant="default"
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
 * @returns A two-button segmented control
 */
function AttendanceToggle({ value, onSelect }: AttendanceToggleProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border">
      <button
        type="button"
        aria-label="Không"
        aria-pressed={value === AttendanceStatus.ABSENT}
        onClick={() => onSelect(AttendanceStatus.ABSENT)}
        className={cn(
          "flex cursor-pointer items-center px-3 py-1.5 transition-colors",
          value === AttendanceStatus.ABSENT
            ? "bg-destructive text-white"
            : "text-destructive hover:bg-destructive/10"
        )}
      >
        <X className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Có"
        aria-pressed={value === AttendanceStatus.PRESENT}
        onClick={() => onSelect(AttendanceStatus.PRESENT)}
        className={cn(
          "flex cursor-pointer items-center border-l px-3 py-1.5 transition-colors",
          value === AttendanceStatus.PRESENT
            ? "bg-emerald-500 text-white"
            : "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
        )}
      >
        <Check className="size-4" />
      </button>
    </div>
  );
}
