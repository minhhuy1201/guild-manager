"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { AttendanceStatus } from "@shared/enums";

import { ErrorState } from "@/components/shared/error-state";
import { TablePagination } from "@/components/shared/table-pagination";
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
import { cn } from "@/lib/utils";
import { isDeadlinePassed } from "../api/attendance-api";
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
import {
  useAttendanceRecords,
  useBattleSessions,
  useFilteredCharacters,
  useMarkAttendance,
} from "../hooks/use-attendance";
import type { Character } from "../types/attendance";
import { recordKey } from "../types/attendance";
import { AttendancePasswordDialog } from "./attendance-password-dialog";
import { AttendanceRow, type AttendanceDraft } from "./attendance-row";

/** Số nhân vật hiển thị mỗi trang. */
const PAGE_SIZE = 10;

/** Số cột skeleton khi chưa biết có bao nhiêu ngày đánh: Thành viên + 3 ngày + Thao tác. */
const SKELETON_COLUMNS = 5;

/**
 * Lưới điểm danh: mỗi nhân vật một hàng, mặc định read-only.
 * Bấm nút chỉnh sửa ở cột cuối để sửa một dòng; xác nhận sẽ yêu cầu nhập
 * mật khẩu riêng của nhân vật đó qua modal.
 * @returns Card chứa bảng điểm danh
 */
export function AttendanceGrid() {
  const characters = useFilteredCharacters();
  const { data: sessions } = useBattleSessions();
  const { data: records } = useAttendanceRecords();
  const { mutateAsync: mark } = useMarkAttendance();
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AttendanceDraft>({});
  const [pendingCharacter, setPendingCharacter] = useState<Character | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [prevCharacters, setPrevCharacters] = useState(characters);

  const battleSessions = sessions ?? [];
  const recordMap = records ?? {};

  useDeadlineRefresh(battleSessions);

  // Về trang 1 mỗi khi kết quả lọc đổi (tìm kiếm/lưu phái) để không kẹt ở trang trống.
  // Điều chỉnh state ngay trong render thay vì useEffect (tránh cascading render).
  if (characters !== prevCharacters) {
    setPrevCharacters(characters);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(characters.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedCharacters = characters.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Khóa theo từng ngày: ngày nào quá deadline thì khóa cột đó.
  const lockedSessionIds = new Set(
    battleSessions.filter((s) => isDeadlinePassed(s.deadline)).map((s) => s.id)
  );
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
   * Xác nhận thay đổi: nếu có ô thay đổi thì mở modal mật khẩu, không thì thoát.
   * @param character - Nhân vật đang chỉnh
   */
  const handleConfirm = (character: Character) => {
    if (getChangedCells(character).length === 0) {
      handleCancel();
      return;
    }
    setPendingCharacter(character);
    setDialogOpen(true);
  };

  /**
   * Gửi mật khẩu để lưu tất cả ô đã thay đổi của nhân vật đang chỉnh.
   * Ném lỗi (để modal hiển thị) nếu sai mật khẩu hoặc quá hạn.
   * @param password - Mật khẩu nhân vật
   */
  const handleSubmitPassword = async (password: string) => {
    if (!pendingCharacter) return;
    const changes = getChangedCells(pendingCharacter);
    await Promise.all(
      changes.map(({ sessionId, status }) =>
        mark({ characterId: pendingCharacter.id, sessionId, status, password })
      )
    );
    setDialogOpen(false);
    setPendingCharacter(null);
    handleCancel();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Điểm danh theo ngày đánh</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card">Thành viên</TableHead>
              {battleSessions.map((session) => (
                <TableHead
                  key={session.id}
                  className={cn(
                    "text-center",
                    session.isGuildWar && "text-primary"
                  )}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    {session.isGuildWar && <Swords className="size-3.5" />}
                    {session.label}
                  </span>
                  {lockedSessionIds.has(session.id) && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Đã khóa
                    </span>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-28 text-right">Thao tác</TableHead>
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
              pagedCharacters.map((character) => (
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

        {!isError && !isPending && pageCount > 1 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {characters.length} thành viên · trang {safePage}/{pageCount}
            </p>
            <TablePagination
              page={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </CardContent>

      <AttendancePasswordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        character={pendingCharacter}
        onSubmit={handleSubmitPassword}
      />
    </Card>
  );
}
