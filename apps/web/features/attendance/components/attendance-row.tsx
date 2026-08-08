"use client";

import { Check, X } from "lucide-react";
import { AttendanceStatus } from "@shared/enums";

import {
  EditAction,
  RowActionButton,
  RowActions,
} from "@/components/shared/action-buttons";
import { StatusIcon } from "@/components/shared/status-icon";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "../types/attendance";
import { recordKey } from "../types/attendance";
import { CharacterName } from "./character-name";

/** Trạng thái nháp của một dòng khi chỉnh sửa: map sessionId → trạng thái. */
export type AttendanceDraft = Record<string, AttendanceStatus | undefined>;

interface AttendanceRowProps {
  /** Nhân vật của dòng này */
  character: Character;
  /** Danh sách buổi đánh (cột) */
  sessions: BattleSession[];
  /** Map record hiện tại theo khóa (characterId__sessionId) */
  recordMap: Record<string, AttendanceRecord>;
  /** Tập id các ngày đã quá deadline (khóa cột tương ứng) */
  lockedSessionIds: Set<string>;
  /** Mọi ngày đều đã khóa — disable nút chỉnh sửa */
  allLocked: boolean;
  /** Dòng này có đang ở chế độ chỉnh sửa không */
  isEditing: boolean;
  /** Trạng thái nháp (chỉ dùng khi isEditing) */
  draft: AttendanceDraft;
  /** Bắt đầu chỉnh sửa dòng này */
  onStartEdit: (character: Character) => void;
  /** Đổi trạng thái nháp của một ô */
  onDraftChange: (sessionId: string, status: AttendanceStatus) => void;
  /** Huỷ chỉnh sửa, reset dữ liệu */
  onCancel: () => void;
  /** Xác nhận thay đổi (mở modal mật khẩu) */
  onConfirm: (character: Character) => void;
}

/**
 * Một dòng điểm danh: mặc định read-only, có thể chuyển sang chỉnh sửa.
 * Cột cuối là thao tác (bút chì ở read-only, Huỷ/Xác nhận ở edit).
 * @returns Hàng bảng điểm danh của một nhân vật
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
      <TableCell className="sticky left-0 bg-card">
        <CharacterName character={character} />
      </TableCell>

      {sessions.map((session) => {
        const currentStatus =
          recordMap[recordKey(character.id, session.id)]?.status;
        const sessionLocked = lockedSessionIds.has(session.id);
        // Cột đã khóa luôn hiển thị read-only, kể cả khi dòng đang chỉnh sửa.
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

      <TableCell className="w-28 text-right">
        {isEditing ? (
          <RowActions className="gap-1.5">
            <RowActionButton
              label="Huỷ"
              icon={<X className="size-4" />}
              onClick={onCancel}
            />
            <RowActionButton
              label="Xác nhận"
              icon={<Check className="size-4" />}
              variant="default"
              onClick={() => onConfirm(character)}
            />
          </RowActions>
        ) : (
          <EditAction
            label="Chỉnh sửa"
            disabled={allLocked}
            onClick={() => onStartEdit(character)}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

interface StatusBadgeProps {
  /** Trạng thái hiện tại (nếu đã điểm danh) */
  status?: AttendanceStatus;
}

/**
 * Badge hiển thị trạng thái điểm danh ở chế độ read-only bằng icon + màu.
 * @returns Icon xanh (Có) / đỏ (Không) / "—" (chưa điểm danh)
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
  /** Trạng thái hiện tại (nếu đã chọn) */
  value?: AttendanceStatus;
  onSelect: (status: AttendanceStatus) => void;
}

/**
 * Cặp nút Có/Không cho một ô điểm danh (chỉ dùng khi đang chỉnh sửa).
 * @returns Segmented control 2 nút
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
