# Attendance UX Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung trạng thái loading, xử lý lỗi có nút thử lại, bộ lọc cho màn Lịch sử, và tự khoá cột khi qua deadline cho luồng điểm danh ở `apps/web`.

**Architecture:** Toàn bộ thay đổi nằm ở tầng presentation của `features/attendance` cộng hai component dùng chung mới trong `components/shared/`. Trạng thái của 4 query điểm danh được gộp vào một hook `useAttendanceBoard()` để hai màn không lặp logic; việc tự khoá cột dùng một `setTimeout` hẹn tới deadline gần nhất rồi `invalidateQueries`, không poll mạng.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query 5, Zustand 5, Tailwind 4, shadcn/ui biến thể Base UI (`base-nova`), TypeScript strict, pnpm workspace, Vitest.

## Global Constraints

- Spec nguồn: `docs/superpowers/specs/2026-08-02-attendance-ux-hardening-design.md`.
- Không đụng `apps/api`, `packages/shared`, `schema.prisma`. Chỉ sửa `apps/web`.
- **Không tạo file test mới** (quy ước của chủ dự án). Suite Vitest hiện có phải tiếp tục xanh.
- Mọi text hiển thị cho người dùng viết **tiếng Việt**; code/comment/JSDoc viết **tiếng Anh** — trừ khi file đang sửa đã dùng comment tiếng Việt thì giữ nguyên giọng của file đó.
- Mọi function/component phải có doc comment nêu mục đích, từng param và giá trị trả về.
- Component trong `components/ui/` **chỉ được sinh từ shadcn CLI** (`style: "base-nova"`), không viết tay, không dùng `@radix-ui/*`. Biến thể riêng thì compose ở `components/shared/`.
- Class có điều kiện dùng `cn()` từ `@/lib/utils`; dùng theme token (`text-destructive`, `text-muted-foreground`...), không hardcode màu.
- Import qua alias `@/`; **không** import trực tiếp file nội bộ của feature khác — chỉ qua `features/<feature>/index.ts`.
- Early return / guard clause thay vì lồng điều kiện sâu.
- Không `await` trong vòng lặp; gom việc song song bằng `Promise.all`.
- Lệnh verify chạy từ **gốc repo**: `pnpm --filter web lint`, `pnpm --filter web build`, `pnpm --filter web test`.
- **Gate commit:** repo đang ở nhánh `main`. Quy ước của chủ dự án cấm commit thẳng vào `main`. Trước khi chạy bất kỳ bước Commit nào, kiểm tra `git rev-parse --abbrev-ref HEAD`; nếu là `main` thì **dừng và hỏi chủ dự án** (tạo nhánh `feat/attendance-ux-hardening`, hoặc chủ dự án gõ `override rule 33`). Không tự ý commit.
- Commit message theo Conventional Commits, tiếng Anh, không có dòng `Co-Authored-By`.

---

## File Structure

Tạo mới:

| File | Trách nhiệm |
| --- | --- |
| `apps/web/components/ui/skeleton.tsx` | Primitive skeleton do shadcn CLI sinh ra. Không sửa tay. |
| `apps/web/components/shared/table-skeleton.tsx` | Render N hàng × M ô skeleton bên trong `<TableBody>`. Thuần trình bày. |
| `apps/web/components/shared/error-state.tsx` | Khối báo lỗi + nút "Thử lại". Thuần trình bày, nhận `onRetry` từ ngoài. |
| `apps/web/features/attendance/hooks/use-attendance-board.ts` | Gộp trạng thái 4 query điểm danh thành `{ isPending, isError, errorMessage, refetch }`. |
| `apps/web/features/attendance/hooks/use-deadline-refresh.ts` | Hẹn giờ tới deadline gần nhất rồi invalidate `sessions` + `records`. |

Sửa:

| File | Thay đổi |
| --- | --- |
| `apps/web/features/attendance/components/attendance-grid.tsx` | Nhánh error/pending trong `<TableBody>`; gọi `useDeadlineRefresh`. |
| `apps/web/features/attendance/components/attendance-log-table.tsx` | Nhánh error/pending; lọc rows theo bộ lọc; hai empty state khác nhau. |
| `apps/web/features/attendance/components/week-timeline.tsx` | Nhánh error/skeleton thay cho `return null`; gọi `useDeadlineRefresh`. |
| `apps/web/features/attendance/index.ts` | Export thêm `AttendanceFilters`. |
| `apps/web/app/lich-su-diem-danh/page.tsx` | Compose thêm `<AttendanceFilters />` phía trên bảng. |

**Thứ tự task:** Task 1 (skeleton primitive) → Task 2 (hai component shared) → Task 3 (hook board) → Task 4 (hook deadline) → Task 5–7 (ráp vào 3 component) → Task 8 (bộ lọc màn Lịch sử). Task 1–4 tạo ra thứ Task 5–8 tiêu thụ.

---

### Task 1: Skeleton primitive từ shadcn CLI

**Files:**
- Create: `apps/web/components/ui/skeleton.tsx` (do CLI sinh)

**Interfaces:**
- Consumes: không.
- Produces: `Skeleton` — component nhận `className?: string` và mọi prop của `div`, dùng ở Task 2 và Task 7.

- [ ] **Step 1: Xác nhận file chưa tồn tại**

Run từ gốc repo:

```bash
ls apps/web/components/ui/skeleton.tsx
```

Expected: `No such file or directory`. Nếu file đã có thì bỏ qua Task 1, sang Task 2.

- [ ] **Step 2: Sinh component bằng shadcn CLI**

Run từ thư mục `apps/web`:

```bash
cd apps/web && pnpm dlx shadcn@latest add skeleton
```

Expected: CLI ghi ra `components/ui/skeleton.tsx`, dùng `style: "base-nova"` đọc từ `components.json`.

Nếu CLI hỏi ghi đè file khác thì chọn **không** ghi đè — chỉ nhận `skeleton.tsx`.

- [ ] **Step 3: Kiểm tra nội dung file**

Run:

```bash
cat apps/web/components/ui/skeleton.tsx
```

Expected: một component `Skeleton` dựng từ `div` + `cn()`, **không** import `@radix-ui/*`.

Nếu CLI thất bại (registry không có `skeleton` cho `base-nova`), **dừng lại và báo chủ dự án** — quy ước cấm viết tay file trong `components/ui/`.

- [ ] **Step 4: Verify lint**

Run:

```bash
pnpm --filter web lint
```

Expected: không lỗi.

- [ ] **Step 5: Commit** (kiểm tra gate commit ở Global Constraints trước)

```bash
git add apps/web/components/ui/skeleton.tsx
git commit -m "build(ui): add shadcn skeleton primitive"
```

---

### Task 2: Component dùng chung `TableSkeleton` và `ErrorState`

**Files:**
- Create: `apps/web/components/shared/table-skeleton.tsx`
- Create: `apps/web/components/shared/error-state.tsx`

**Interfaces:**
- Consumes: `Skeleton` từ `@/components/ui/skeleton` (Task 1).
- Produces:
  - `TableSkeleton({ rows, columns }: { rows: number; columns: number })` — render fragment chứa `rows` phần tử `<TableRow>`, **phải đặt bên trong `<TableBody>`**.
  - `ErrorState({ message, onRetry }: { message: string; onRetry: () => void })` — khối lỗi căn giữa, dùng được cả trong `<CardContent>` lẫn trong `<TableCell colSpan>`.

- [ ] **Step 1: Tạo `table-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  /** Number of placeholder rows to render. */
  rows: number;
  /** Number of placeholder cells per row — must match the table header. */
  columns: number;
}

/**
 * Placeholder rows shown while a table's data is still loading.
 * Renders bare `<TableRow>` elements, so it must be placed inside `<TableBody>`.
 * @param rows - Number of placeholder rows
 * @param columns - Number of placeholder cells per row
 * @returns Fragment of skeleton table rows
 */
export function TableSkeleton({ rows, columns }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Tạo `error-state.tsx`**

```tsx
"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  /** Message to show — pass the backend's Vietnamese `ApiError.message` straight through. */
  message: string;
  /** Called when the user asks to load the data again. */
  onRetry: () => void;
}

/**
 * Error block with a retry action, shown in place of a card's or table's content
 * when its queries fail. Presentational only — the caller owns the retry logic.
 * @param message - Error message to display
 * @param onRetry - Handler invoked when the retry button is pressed
 * @returns Centered error block with a retry button
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Xác nhận `Button` có variant `outline` và size `sm`**

Run:

```bash
grep -n "outline\|sm:" apps/web/components/ui/button.tsx
```

Expected: thấy key `outline` trong `variant` và key `sm` trong `size`. Nếu không có, đổi sang variant/size thực sự tồn tại trong file đó và ghi chú lại.

- [ ] **Step 4: Verify lint + build**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build
```

Expected: cả hai lệnh thành công (component chưa được dùng ở đâu nên chỉ cần compile sạch).

- [ ] **Step 5: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/components/shared/table-skeleton.tsx apps/web/components/shared/error-state.tsx
git commit -m "feat(ui): add shared table skeleton and error state"
```

---

### Task 3: Hook `useAttendanceBoard`

**Files:**
- Create: `apps/web/features/attendance/hooks/use-attendance-board.ts`

**Interfaces:**
- Consumes: `useCharacters`, `useBattleSessions`, `useAttendanceRecords`, `useCurrentWeek` từ `./use-attendance`; `ApiError` từ `@/lib/api-client`.
- Produces: `useAttendanceBoard(): AttendanceBoardState` với
  `AttendanceBoardState = { isPending: boolean; isError: boolean; errorMessage: string; refetch: () => void }`.
  Task 5, 6, 7 dùng đúng bốn field này.

**Ghi chú thiết kế:** hook gộp cả `week` để cả hai màn dùng chung một trạng thái duy nhất. Hệ quả: màn Lịch sử fetch thêm `/attendance/week` dù không hiển thị dữ liệu tuần — chấp nhận được vì đó là một request nhỏ, `staleTime` 60s, đổi lại không phải nhân đôi logic gộp trạng thái.

- [ ] **Step 1: Tạo file hook**

```ts
"use client";

import { ApiError } from "@/lib/api-client";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useCurrentWeek,
} from "./use-attendance";

/** Shown when a query fails with something other than an `ApiError`. */
const FALLBACK_ERROR_MESSAGE = "Không tải được dữ liệu điểm danh.";

/** Combined loading/error state of every query the attendance screens depend on. */
export interface AttendanceBoardState {
  /** True while any of the queries has not resolved yet. */
  isPending: boolean;
  /** True as soon as one query fails. */
  isError: boolean;
  /** Message of the first failing query — empty string when there is no error. */
  errorMessage: string;
  /** Refetches every query at once. */
  refetch: () => void;
}

/**
 * Aggregates the four attendance queries (characters, sessions, records, week)
 * into a single loading/error state, so both the attendance screen and the
 * history screen branch on the same values instead of duplicating the logic.
 * @returns Combined pending/error state plus a refetch-all callback
 */
export function useAttendanceBoard(): AttendanceBoardState {
  const characters = useCharacters();
  const sessions = useBattleSessions();
  const records = useAttendanceRecords();
  const week = useCurrentWeek();

  const queries = [characters, sessions, records, week];
  const firstError = queries.find((query) => query.isError)?.error ?? null;

  return {
    isPending: queries.some((query) => query.isPending),
    isError: firstError !== null,
    errorMessage: readErrorMessage(firstError),
    // Refetch tất cả cùng lúc — không await tuần tự từng query.
    refetch: () => {
      void Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

/**
 * Reads a display message out of a failing query's error.
 * @param error - Error of the first failing query, or null when nothing failed
 * @returns Backend message for an `ApiError`, the fallback otherwise, "" when no error
 */
function readErrorMessage(error: unknown): string {
  if (error === null) return "";

  return error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE;
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build
```

Expected: thành công. Nếu TypeScript than mảng `queries` là union type không gọi được `.refetch()`, sửa bằng cách khai báo `const queries = [characters, sessions, records, week] as const;` rồi map — **không** dùng `any`.

- [ ] **Step 3: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/features/attendance/hooks/use-attendance-board.ts
git commit -m "feat(ui): add aggregated attendance query state hook"
```

---

### Task 4: Hook `useDeadlineRefresh`

**Files:**
- Create: `apps/web/features/attendance/hooks/use-deadline-refresh.ts`

**Interfaces:**
- Consumes: `attendanceKeys` từ `../api/attendance-api`; type `BattleSession` từ `../types/attendance`.
- Produces: `useDeadlineRefresh(sessions: BattleSession[]): void` — dùng ở Task 5 và Task 7.

**Vì sao dùng timer:** `isDeadlinePassed()` tính lúc render từ data đã cache, không có gì làm component render lại khi đồng hồ vượt mốc. Hẹn đúng một `setTimeout` tới deadline gần nhất rồi invalidate sẽ chính xác tuyệt đối và chỉ bắn đúng số lần bằng số deadline trong tuần, thay vì poll mỗi phút như `refetchInterval`.

**Cơ chế tự nối tiếp:** timer nổ → invalidate → query refetch → `sessions` là mảng object mới → component render lại → `nextDeadline` tính lại ra mốc kế → `useEffect` chạy lại và hẹn timer mới.

- [ ] **Step 1: Tạo file hook**

```ts
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { attendanceKeys } from "../api/attendance-api";
import type { BattleSession } from "../types/attendance";

/**
 * Schedules a refresh exactly when the next attendance deadline passes, so the
 * grid locks its columns without the user reloading the page.
 * Deadlines are evaluated at render time from cached data, so without this the
 * UI keeps offering a column the server has already closed.
 * @param sessions - Sessions of the open week (empty array while loading)
 * @returns Nothing — the hook only schedules a cache invalidation
 */
export function useDeadlineRefresh(sessions: BattleSession[]): void {
  const queryClient = useQueryClient();
  const nextDeadline = findNextDeadline(sessions);

  useEffect(() => {
    if (nextDeadline === null) return;

    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: attendanceKeys.sessions(),
      });
      void queryClient.invalidateQueries({
        queryKey: attendanceKeys.records(),
      });
    }, nextDeadline - Date.now());

    return () => clearTimeout(timer);
  }, [nextDeadline, queryClient]);
}

/**
 * Finds the soonest deadline that is still in the future.
 * @param sessions - Sessions of the open week
 * @returns Timestamp in milliseconds, or null when every deadline has passed
 */
function findNextDeadline(sessions: BattleSession[]): number | null {
  const now = Date.now();
  const upcoming = sessions
    .map((session) => new Date(session.deadline).getTime())
    .filter((deadline) => deadline > now);

  return upcoming.length === 0 ? null : Math.min(...upcoming);
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build
```

Expected: thành công.

- [ ] **Step 3: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/features/attendance/hooks/use-deadline-refresh.ts
git commit -m "feat(ui): refresh attendance data when a deadline passes"
```

---

### Task 5: Ráp loading/error/deadline vào `AttendanceGrid`

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`

**Interfaces:**
- Consumes: `useAttendanceBoard` (Task 3), `useDeadlineRefresh` (Task 4), `TableSkeleton` + `ErrorState` (Task 2).
- Produces: không có API mới.

**Cách ráp:** giữ nguyên một `return` duy nhất và chỉ đổi phần thân `<TableBody>`. Không dùng early return ở cấp component vì file này gọi nhiều `useState` và có một lần set-state-trong-render (`if (characters !== prevCharacters)`) — early return sẽ dễ làm sai thứ tự hook. Giữ được header bảng cũng làm khung nhìn ổn định hơn.

- [ ] **Step 1: Thêm import và hằng số**

Thêm vào khối import (đúng thứ tự: thư viện ngoài → `@/...` → tương đối):

```tsx
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
```

và trong nhóm import tương đối:

```tsx
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
```

Ngay dưới `const PAGE_SIZE = 10;` thêm:

```tsx
/** Số cột skeleton khi chưa biết có bao nhiêu ngày đánh: Thành viên + 3 ngày + Thao tác. */
const SKELETON_COLUMNS = 5;
```

- [ ] **Step 2: Gọi hai hook mới trong component**

Ngay sau dòng `const { mutateAsync: mark } = useMarkAttendance();` thêm:

```tsx
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();
```

Và ngay sau dòng `const recordMap = records ?? {};` thêm:

```tsx
  useDeadlineRefresh(battleSessions);
```

- [ ] **Step 3: Đổi thân `<TableBody>`**

Thay khối hiện tại:

```tsx
            {characters.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={battleSessions.length + 2}
                  className="py-8 text-center text-muted-foreground"
                >
                  Không tìm thấy thành viên phù hợp.
                </TableCell>
              </TableRow>
            )}
            {pagedCharacters.map((character) => (
```

thành:

```tsx
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
            {!isError && !isPending && pagedCharacters.map((character) => (
```

Phần còn lại của `.map(...)` giữ nguyên không đổi.

- [ ] **Step 4: Ẩn phân trang khi chưa có dữ liệu**

Đổi điều kiện phân trang từ:

```tsx
        {pageCount > 1 && (
```

thành:

```tsx
        {!isError && !isPending && pageCount > 1 && (
```

- [ ] **Step 5: Verify lint + build + suite hiện có**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build && pnpm --filter web test
```

Expected: cả ba lệnh thành công.

- [ ] **Step 6: Kiểm tra bằng mắt**

Run `pnpm --filter web dev`, mở `http://localhost:3000`, và xác nhận:
1. Lúc mới tải trang thấy 5 hàng skeleton, **không** thấy chữ "Không tìm thấy thành viên phù hợp." nhấp nháy.
2. Tắt backend rồi tải lại → thấy khối lỗi + nút "Thử lại"; bật backend lên, bấm "Thử lại" → bảng hiện ra.

- [ ] **Step 7: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/features/attendance/components/attendance-grid.tsx
git commit -m "feat(ui): add loading and error states to attendance grid"
```

---

### Task 6: Ráp loading/error vào `AttendanceLogTable`

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-log-table.tsx`

**Interfaces:**
- Consumes: `useAttendanceBoard` (Task 3), `TableSkeleton` + `ErrorState` (Task 2).
- Produces: không có API mới. Task 8 sẽ sửa tiếp file này để thêm lọc.

- [ ] **Step 1: Thêm import**

```tsx
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
```

và trong nhóm tương đối:

```tsx
import { useAttendanceBoard } from "../hooks/use-attendance-board";
```

- [ ] **Step 2: Gọi hook trong component**

Ngay sau `const { data: sessions } = useBattleSessions();` thêm:

```tsx
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();
```

- [ ] **Step 3: Đổi thân `<TableBody>`**

Thay khối:

```tsx
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Chưa có ai điểm danh.
                </TableCell>
              </TableRow>
            )}
            {rows.map((record) => {
```

thành:

```tsx
            {isError && (
              <TableRow>
                <TableCell colSpan={4}>
                  <ErrorState message={errorMessage} onRetry={refetch} />
                </TableCell>
              </TableRow>
            )}
            {!isError && isPending && <TableSkeleton rows={5} columns={4} />}
            {!isError && !isPending && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Chưa có ai điểm danh.
                </TableCell>
              </TableRow>
            )}
            {!isError && !isPending && rows.map((record) => {
```

Phần thân `.map(...)` giữ nguyên.

- [ ] **Step 4: Giấu số đếm ở tiêu đề khi chưa có dữ liệu**

Đổi:

```tsx
        <CardTitle>Lịch sử điểm danh ({rows.length})</CardTitle>
```

thành:

```tsx
        <CardTitle>
          Lịch sử điểm danh{!isPending && !isError && ` (${rows.length})`}
        </CardTitle>
```

Lý do: hiện "(0)" trong lúc đang tải là thông tin sai.

- [ ] **Step 5: Verify lint + build + suite hiện có**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build && pnpm --filter web test
```

Expected: cả ba lệnh thành công.

- [ ] **Step 6: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/features/attendance/components/attendance-log-table.tsx
git commit -m "feat(ui): add loading and error states to attendance history"
```

---

### Task 7: Skeleton, error và deadline cho `WeekTimeline`

**Files:**
- Modify: `apps/web/features/attendance/components/week-timeline.tsx`

**Interfaces:**
- Consumes: `useAttendanceBoard` (Task 3), `useDeadlineRefresh` (Task 4), `ErrorState` (Task 2), `Skeleton` (Task 1).
- Produces: không có API mới.

**Vấn đề đang sửa:** `if (!week) return null;` làm cả Card biến mất lúc đang tải, gây nhảy layout, và nuốt luôn lỗi.

- [ ] **Step 1: Thêm import**

```tsx
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
```

và trong nhóm tương đối:

```tsx
import { useAttendanceBoard } from "../hooks/use-attendance-board";
import { useDeadlineRefresh } from "../hooks/use-deadline-refresh";
```

- [ ] **Step 2: Gọi hook và thay guard `!week`**

Thay:

```tsx
export function WeekTimeline() {
  const { data: week } = useCurrentWeek();
  const { data: sessions } = useBattleSessions();

  if (!week) {
    return null;
  }

  const battleSessions = sessions ?? [];
```

bằng:

```tsx
export function WeekTimeline() {
  const { data: week } = useCurrentWeek();
  const { data: sessions } = useBattleSessions();
  const { isPending, isError, errorMessage, refetch } = useAttendanceBoard();

  const battleSessions = sessions ?? [];

  useDeadlineRefresh(battleSessions);

  if (isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState message={errorMessage} onRetry={refetch} />
        </CardContent>
      </Card>
    );
  }

  if (isPending || !week) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
```

Lưu ý thứ tự: mọi hook (`useCurrentWeek`, `useBattleSessions`, `useAttendanceBoard`, `useDeadlineRefresh`) phải nằm **trên** mọi câu lệnh `return` — đúng như đoạn trên.

- [ ] **Step 3: Cập nhật doc comment của component**

Đổi dòng `@returns Card timeline tuần (rỗng khi chưa tải xong tuần)` thành:

```
 * @returns Card timeline tuần, hoặc skeleton/khối lỗi khi query chưa xong hoặc thất bại
```

- [ ] **Step 4: Verify lint + build + suite hiện có**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build && pnpm --filter web test
```

Expected: cả ba lệnh thành công.

- [ ] **Step 5: Kiểm tra cơ chế khoá theo deadline**

Không chờ deadline thật. Cách kiểm nhanh: trong `apps/web/features/attendance/hooks/use-deadline-refresh.ts`, tạm đổi

```ts
    }, nextDeadline - Date.now());
```

thành

```ts
    }, 5000);
```

rồi chạy `pnpm --filter web dev`, mở tab Network và xác nhận sau 5 giây có request tới `/attendance/sessions` và `/attendance/records`.

**Trả lại nguyên trạng ngay sau khi kiểm xong** — xác nhận bằng `git diff apps/web/features/attendance/hooks/use-deadline-refresh.ts` phải rỗng.

- [ ] **Step 6: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/features/attendance/components/week-timeline.tsx
git commit -m "feat(ui): add skeleton and error state to week timeline"
```

---

### Task 8: Bộ lọc cho màn Lịch sử điểm danh

**Files:**
- Modify: `apps/web/features/attendance/index.ts`
- Modify: `apps/web/app/lich-su-diem-danh/page.tsx`
- Modify: `apps/web/features/attendance/components/attendance-log-table.tsx`

**Interfaces:**
- Consumes: `AttendanceFilters` (đã có), `useFilteredCharacters` từ `../hooks/use-attendance` (đã có).
- Produces: `AttendanceFilters` được export ra ngoài feature qua barrel.

**Hành vi đã chốt:** `useAttendanceFilterStore` là store global singleton nên bộ lọc **dính khi chuyển giữa hai màn**. Đây là điều mong muốn — **không** reset store khi unmount.

- [ ] **Step 1: Export `AttendanceFilters` qua barrel**

Sửa `apps/web/features/attendance/index.ts` thành:

```ts
export { AttendanceScreen } from "./components/attendance-screen";
export { AttendanceFilters } from "./components/attendance-filters";
export { AttendanceLogTable } from "./components/attendance-log-table";
```

- [ ] **Step 2: Compose bộ lọc vào trang**

Sửa `apps/web/app/lich-su-diem-danh/page.tsx`:

```tsx
import type { Metadata } from "next";
import { AttendanceFilters, AttendanceLogTable } from "@/features/attendance";

export const metadata: Metadata = {
  title: "Lịch sử điểm danh — Mèo Mập Giang Hồ",
  description: "Lịch sử điểm danh của các thành viên bang hội",
};

/**
 * Route "/lich-su-diem-danh" — trang lịch sử điểm danh.
 * @returns Bộ lọc và bảng lịch sử điểm danh
 */
export default function AttendanceHistoryPage() {
  return (
    <>
      <AttendanceFilters />
      <AttendanceLogTable />
    </>
  );
}
```

- [ ] **Step 3: Lọc rows trong `AttendanceLogTable`**

Thêm vào nhóm import tương đối:

```tsx
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useFilteredCharacters,
} from "../hooks/use-attendance";
```

(tức là bổ sung `useFilteredCharacters` vào danh sách import sẵn có).

Thay khối `rows` hiện tại:

```tsx
  const rows = useMemo(
    () =>
      Object.values(records ?? {}).sort(
        (a, b) =>
          new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
      ),
    [records]
  );
```

bằng:

```tsx
  const filteredCharacters = useFilteredCharacters();
  const filteredIds = useMemo(
    () => new Set(filteredCharacters.map((character) => character.id)),
    [filteredCharacters]
  );

  const allRecords = useMemo(() => Object.values(records ?? {}), [records]);

  const rows = useMemo(
    () =>
      allRecords
        .filter((record) => filteredIds.has(record.characterId))
        .sort(
          (a, b) =>
            new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
        ),
    [allRecords, filteredIds]
  );
```

- [ ] **Step 4: Tách hai empty state**

Thay khối empty state đã viết ở Task 6:

```tsx
            {!isError && !isPending && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Chưa có ai điểm danh.
                </TableCell>
              </TableRow>
            )}
```

bằng:

```tsx
            {!isError && !isPending && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {allRecords.length === 0
                    ? "Chưa có ai điểm danh."
                    : "Không có lượt điểm danh phù hợp."}
                </TableCell>
              </TableRow>
            )}
```

- [ ] **Step 5: Cập nhật doc comment của component**

Đổi dòng `* Sắp xếp mới nhất trước.` thành:

```
 * Lọc theo bộ lọc dùng chung (tìm kiếm + lưu phái), sắp xếp mới nhất trước.
```

- [ ] **Step 6: Verify lint + build + suite hiện có**

Run:

```bash
pnpm --filter web lint && pnpm --filter web build && pnpm --filter web test
```

Expected: cả ba lệnh thành công.

- [ ] **Step 7: Kiểm tra bằng mắt**

Run `pnpm --filter web dev`, mở `http://localhost:3000/lich-su-diem-danh` và xác nhận:
1. Thanh lọc hiện phía trên bảng.
2. Gõ tên một thành viên → bảng chỉ còn lượt điểm danh của người đó, số đếm ở tiêu đề đổi theo.
3. Gõ một chuỗi vô nghĩa → hiện "Không có lượt điểm danh phù hợp." (không phải "Chưa có ai điểm danh.").
4. Chuyển sang trang Điểm danh → bộ lọc vẫn giữ nguyên (đúng thiết kế).

- [ ] **Step 8: Commit** (kiểm tra gate commit trước)

```bash
git add apps/web/features/attendance/index.ts apps/web/app/lich-su-diem-danh/page.tsx apps/web/features/attendance/components/attendance-log-table.tsx
git commit -m "feat(ui): filter attendance history by shared member filters"
```

---

## Kiểm tra cuối

- [ ] **Toàn bộ verify chạy sạch**

```bash
pnpm --filter web lint && pnpm --filter web build && pnpm --filter web test
```

- [ ] **Không còn thay đổi tạm nào sót lại**

```bash
git status
git diff
```

Expected: working tree sạch, đặc biệt `use-deadline-refresh.ts` không còn timeout 5000 của bước kiểm tra ở Task 7.

- [ ] **Đối chiếu với spec** — cả 4 hạng mục trong `docs/superpowers/specs/2026-08-02-attendance-ux-hardening-design.md` đều có task tương ứng: loading (Task 1, 2, 5, 6, 7) · error (Task 2, 3, 5, 6, 7) · bộ lọc (Task 8) · deadline (Task 4, 5, 7).
