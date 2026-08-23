"use client";

import { useState } from "react";
import { AttendanceStatus } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { ErrorState } from "@/components/shared/error-state";
import { SessionLabel } from "@/components/shared/session-label";
import { TablePaginationBar } from "@/components/shared/table-pagination-bar";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { getSessionSubtitle } from "../lib/session-subtitle";
import {
  STICKY_ACTION_COLUMN,
  STICKY_NAME_COLUMN,
} from "../lib/sticky-columns";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useBattleSessions,
  useFilteredCharacters,
  useMarkAttendance,
  useMarkAttendanceAsAdmin,
} from "../hooks/use-attendance";
import { recordKey } from "../lib/record-key";
import { AttendanceRow, type AttendanceDraft } from "./attendance-row";

/** Số cột skeleton khi chưa biết có bao nhiêu ngày đánh: Thành viên + 3 ngày + Thao tác. */
const SKELETON_COLUMNS = 5;

interface AttendanceGridProps {
  /** Người đang xem là quản trị viên — không bị khóa theo deadline. */
  isAdmin: boolean;
}

/**
 * Lưới điểm danh: mỗi nhân vật một hàng, mặc định read-only.
 * Bấm nút chỉnh sửa ở cột cuối để sửa một dòng rồi xác nhận là lưu thẳng.
 * @param isAdmin - Người đang xem có phải quản trị viên hay không
 * @returns Card chứa bảng điểm danh
 */
export function AttendanceGrid({ isAdmin }: AttendanceGridProps) {
  const characters = useFilteredCharacters("attendance");
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark, error: markError } = useMarkAttendance();
  const { mutateAsync: markAsAdmin, error: adminError } =
    useMarkAttendanceAsAdmin();
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttendanceDraft>({});

  // Kết quả lọc (tìm kiếm/lưu phái) đổi thì về trang 1 để không kẹt ở trang trống.
  const pagination = useTablePagination({
    items: characters,
    resetKey: characters,
  });

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};
  // Quản trị viên đi qua Server Action, người thường gọi thẳng API — mỗi đường một mutation.
  const saveError = isAdmin ? adminError : markError;

  useDeadlineRefresh(battleSessions);

  // Ngày nào quá deadline thì khóa cột đó — dùng để hiển thị nhãn "Đã khóa" cho mọi người.
  const passedSessionIds = new Set(
    battleSessions.filter((s) => s.isDeadlinePassed).map((s) => s.id)
  );
  // Quản trị viên sửa được cả ngày đã quá hạn nên không khóa ô nào.
  const lockedSessionIds = isAdmin ? new Set<string>() : passedSessionIds;
  const allLocked =
    battleSessions.length > 0 &&
    lockedSessionIds.size === battleSessions.length;

  /**
   * Bắt đầu chỉnh sửa một dòng: khởi tạo nháp từ record hiện có.
   * Mở dòng khác sẽ tự thay dòng đang chỉnh (chỉ 1 dòng 1 lúc).
   * @param character - Nhân vật cần chỉnh
   */
  const handleStartEdit = (character: Character) => {
    const initial: AttendanceDraft = {};
    for (const session of battleSessions) {
      initial[session.id] = recordMap[recordKey(character.id, session.id)]?.status;
    }
    setDraft(initial);
    setEditingId(character.id);
  };

  /**
   * Đổi trạng thái nháp của một ô trong dòng đang chỉnh.
   * @param sessionId - ID buổi đánh
   * @param status - Trạng thái mới
   */
  const handleDraftChange = (sessionId: string, status: AttendanceStatus) => {
    setDraft((prev) => ({ ...prev, [sessionId]: status }));
  };

  /** Huỷ chỉnh sửa và reset nháp. */
  const handleCancel = () => {
    setEditingId(null);
    setDraft({});
  };

  /**
   * Lấy các ô đã thay đổi so với record hiện tại của một nhân vật.
   * @param character - Nhân vật đang chỉnh
   * @returns Mảng { sessionId, status } cần lưu
   */
  const getChangedCells = (character: Character) =>
    battleSessions.flatMap((session) => {
      if (lockedSessionIds.has(session.id)) return [];
      const next = draft[session.id];
      const current = recordMap[recordKey(character.id, session.id)]?.status;
      if (next === undefined || next === current) return [];
      return [{ sessionId: session.id, status: next }];
    });

  /**
   * Lưu các ô đã thay đổi của một nhân vật.
   * @param character - Nhân vật đang chỉnh
   * @returns Promise hoàn tất khi đã lưu xong hoặc đã hiển thị lỗi
   */
  const handleConfirm = async (character: Character) => {
    const changes = getChangedCells(character);
    if (changes.length === 0) {
      handleCancel();
      return;
    }

    // Lỗi hiển thị qua `saveError` của mutation nên nuốt ở đây, tránh promise văng ra ngoài.
    const saved = await Promise.all(
      changes.map(({ sessionId, status }) => {
        const input = { characterId: character.id, sessionId, status };
        return isAdmin ? markAsAdmin(input) : mark(input);
      })
    ).catch(() => null);

    if (saved) handleCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh theo ngày đánh</CardTitle>
      </CardHeader>
      <CardContent>
        {!isError && !isPending && battleSessions.length > 0 && (
          <p className="mb-2 text-xs text-muted-foreground md:hidden">
            Vuốt ngang để xem các ngày đánh khác — cột tên và cột thao tác luôn
            hiện.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={STICKY_NAME_COLUMN}>Thành viên</TableHead>
              {battleSessions.map((session) => {
                const subtitle = getSessionSubtitle(session);
                return (
                  <TableHead key={session.id} className="text-center">
                    <SessionLabel session={session} size="sm" />
                    <span className="block text-xs font-normal text-muted-foreground">
                      {subtitle}
                    </span>
                    {passedSessionIds.has(session.id) && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Đã khóa
                      </span>
                    )}
                  </TableHead>
                );
              })}
              <TableHead className={STICKY_ACTION_COLUMN}>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError && (
              <TableRow>
                <TableCell colSpan={SKELETON_COLUMNS}>
                  <ErrorState message={errorMessage} onRetry={refetch} />
                </TableCell>
              </TableRow>
            )}
            {!isError && isPending && (
              <TableSkeleton rows={5} columns={SKELETON_COLUMNS} />
            )}
            {!isError && !isPending && characters.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={battleSessions.length + 2}
                  className="py-8 text-center text-muted-foreground"
                >
                  Không tìm thấy thành viên phù hợp.
                </TableCell>
              </TableRow>
            )}
            {!isError &&
              !isPending &&
              pagination.pagedItems.map((character) => (
                <AttendanceRow
                  key={character.id}
                  character={character}
                  sessions={battleSessions}
                  recordMap={recordMap}
                  lockedSessionIds={lockedSessionIds}
                  allLocked={allLocked}
                  isEditing={editingId === character.id}
                  draft={editingId === character.id ? draft : {}}
                  onStartEdit={handleStartEdit}
                  onDraftChange={handleDraftChange}
                  onCancel={handleCancel}
                  onConfirm={handleConfirm}
                />
              ))}
          </TableBody>
        </Table>

        {saveError && (
          <p className="mt-4 text-center text-sm text-destructive">
            {saveError.message}
          </p>
        )}

        {!isError && !isPending && characters.length > 0 && (
          <div className="mt-4">
            <TablePaginationBar
              page={pagination.page}
              pageCount={pagination.pageCount}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              itemLabel="thành viên"
              pageSizeId="attendance-page-size"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
