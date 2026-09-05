# Điểm danh dùng Boolean — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `AttendanceRecord` lưu điểm danh bằng một cột `isPresent Boolean` (`true` = "Có", `false` = "Không") thay cho enum `AttendanceStatus`, và enum đó biến mất khỏi cả Prisma lẫn `packages/shared`.

**Architecture:** Thay đổi lan theo đúng một chiều: `packages/shared` (contract) → `prisma/schema.prisma` + migration chuyển đổi dữ liệu → `apps/api` (codec, service) → `apps/web` (4 chỗ tiêu thụ) → `docs/architecture.md`. Enum kép biến mất kéo theo hai chỗ cast `as AttendanceStatus`. Nhãn tiếng Việt gom vào một helper `attendanceLabel(isPresent)`.

**Tech Stack:** pnpm workspace; NestJS 11 + Prisma 7 + PostgreSQL (`apps/api`, Jest); Next.js 16 + React 19 + Tailwind 4 + TanStack Query (`apps/web`, Vitest); Zod 4 (`packages/shared`).

**Spec:** [`docs/custom-spec/2026-08-29-attendance-status-boolean-design.md`](../../custom-spec/2026-08-29-attendance-status-boolean-design.md)

## Global Constraints

- **Đổi tên field, không chỉ đổi kiểu**: `status` → `isPresent` ở mọi tầng (Prisma, Zod, DTO, UI, test).
- **`false` là giá trị hợp lệ.** Không bao giờ dùng truthiness để phân biệt "chưa điểm danh"; luôn so sánh tường minh với `undefined`.
- **`attendanceSummarySchema` không đổi** — `coCount` / `khongCount` là số đếm nghiệp vụ, giữ nguyên tên.
- Comment, JSDoc, tên file, tên biến: **tiếng Anh**. Chuỗi hiển thị cho người dùng: **tiếng Việt**. Tiếng Việt chỉ dùng trong `docs/superpowers`, `docs/custom-plan`, `docs/custom-spec`, và tên thư mục migration.
- Mọi function mới có JSDoc nêu mục đích, từng param và giá trị trả về. Không thêm comment cho code đã tự giải thích.
- Không mutate: luôn tạo đối tượng/mảng mới.
- `packages/shared` chạy runtime từ `dist` → chạy `pnpm --filter @guild/shared build` sau Task 1 và trước mọi lần test/dev.
- **Không thêm dependency mới.**
- Nhánh git: `refactor/attendance-status-boolean` (đã tạo). Mỗi task tự commit riêng, không gộp commit của hai task.
- Lệnh kiểm mỗi task: `pnpm --filter <api|web> test`, `pnpm --filter <api|web> typecheck`, `pnpm --filter <api|web> lint`.

---

### Task 1: `packages/shared` — bỏ enum, thêm helper nhãn, đổi schema

**Files:**
- Modify: `packages/shared/enums/attendance.enum.ts`
- Modify: `packages/shared/schemas/attendance.schema.ts`

**Interfaces:**
- Xoá: `enum AttendanceStatus`, `const ATTENDANCE_STATUS_LABEL`.
- Thêm: `export function attendanceLabel(isPresent: boolean): string` → `"Có"` / `"Không"`.
- Đổi: `markAttendanceSchema` và `attendanceRecordSchema` dùng `isPresent: z.boolean()` thay cho `status`.
- `packages/shared/enums/index.ts` và `schemas/index.ts` giữ nguyên (`export *`).

- [ ] **Step 1: Viết lại `attendance.enum.ts`**

```ts
/**
 * Vietnamese display label for an attendance answer.
 * @param isPresent - Whether the character signed up for the session
 * @returns "Có" when true, "Không" when false
 */
export function attendanceLabel(isPresent: boolean): string {
  return isPresent ? "Có" : "Không";
}
```

Bỏ import/khai báo enum. Tên file giữ nguyên để không phải sửa `enums/index.ts`.

- [ ] **Step 2: Đổi `attendance.schema.ts`**

Bỏ `import { AttendanceStatus } from "../enums/attendance.enum";`. Trong `markAttendanceSchema` và `attendanceRecordSchema`, thay dòng `status: z.enum(AttendanceStatus)` bằng:

```ts
/** True = "Có" (đi đánh), false = "Không". */
isPresent: z.boolean(),
```

`attendanceSummarySchema` **không đụng tới**.

- [ ] **Step 3: Build**

```bash
pnpm --filter @guild/shared build
```

Sau bước này `apps/api` và `apps/web` sẽ **không type-check được** cho đến hết Task 4 — đó là dự kiến.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(shared): model attendance as a boolean isPresent"
```

---

### Task 2: Prisma schema + migration chuyển đổi dữ liệu

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<UTC timestamp>_diem_danh_dung_boolean/migration.sql`

**Interfaces:**
- Consumes: quyết định ánh xạ `CO → true` từ spec.
- Produces: cột `AttendanceRecord.isPresent BOOLEAN NOT NULL`; type `AttendanceStatus` bị drop.

- [ ] **Step 1: Ghi lại số liệu đối chiếu trước khi migrate**

```bash
pnpm --filter api prisma:studio   # hoặc psql
```

```sql
SELECT "status", count(*) FROM "AttendanceRecord" GROUP BY 1;
```

Ghi lại hai con số `CO` / `KHONG` để đối chiếu ở phần Verification.

- [ ] **Step 2: Sửa `schema.prisma`**

Xoá cả khối `enum AttendanceStatus { CO KHONG }` và comment `/// Attendance status. Values must match…`. Trong `model AttendanceRecord`, đổi:

```prisma
status              AttendanceStatus
```

thành

```prisma
isPresent           Boolean
```

Các field, quan hệ, `@@unique([characterId, sessionId])` và `@@index([sessionId])` giữ nguyên.

- [ ] **Step 3: Tạo migration ở chế độ `--create-only` và viết tay SQL**

```bash
pnpm --filter api prisma:migrate --create-only --name diem_danh_dung_boolean
```

Prisma sẽ sinh `DROP COLUMN` + `ADD COLUMN` — **xoá sạch nội dung đó** và thay bằng:

```sql
ALTER TABLE "AttendanceRecord"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE BOOLEAN USING ("status" = 'CO');
ALTER TABLE "AttendanceRecord" RENAME COLUMN "status" TO "isPresent";
DROP TYPE "AttendanceStatus";
```

Không thêm migration RLS: `AttendanceRecord` đã bật RLS từ `20260802105026`/`20260802185500` và `ALTER COLUMN` không tắt nó.

- [ ] **Step 4: Apply + regenerate client**

```bash
pnpm --filter api prisma:migrate
```

Kiểm tra ngay: `\d "AttendanceRecord"` phải cho `isPresent | boolean | not null`, và `SELECT "isPresent", count(*) FROM "AttendanceRecord" GROUP BY 1;` phải khớp cặp số ở Step 1 (`true` = số `CO`).

- [ ] **Step 5: Commit** (`src/generated/prisma` không được commit)

```bash
git add apps/api/prisma
git commit -m "refactor(api): store attendance as a boolean column"
```

---

### Task 3: `apps/api` — codec và service

**Files:**
- Modify: `apps/api/src/modules/attendance/attendance.codec.ts`
- Modify: `apps/api/src/modules/attendance/attendance.service.ts`
- Test: `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts`
- Test: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`

**Interfaces:**
- Consumes: `attendanceRecordSchema`, `attendanceSummarySchema` (Task 1); cột `isPresent` (Task 2).
- Produces: `AttendanceRecordRow` hết field `status`; `AttendanceService.mark` nhận input có `isPresent`.
- `dto/mark-attendance.dto.ts` **không sửa** — nó derive từ `markAttendanceSchema`.

- [ ] **Step 1: Cập nhật test trước (hành vi đổi có chủ đích)**

Trong `attendance.codec.spec.ts`: row đầu vào dùng `isPresent: true` / `false`, assertion trên `result.isPresent`.

Trong `attendance.service.spec.ts`: mọi fixture `status: AttendanceStatus.PRESENT` → `isPresent: true`; `expect(changed.status).toBe(AttendanceStatus.ABSENT)` → `expect(changed.isPresent).toBe(false)`; mock `groupBy` trả `{ sessionId, isPresent, _count: { _all: n } }`; kỳ vọng summary `{ sessionId, coCount, khongCount }` giữ nguyên. Bỏ import `AttendanceStatus`.

- [ ] **Step 2: `attendance.codec.ts`**

`AttendanceRecordRow`: `status: string` → `isPresent: boolean`. Trong `toAttendanceRecord`, thay `status: row.status as AttendanceStatus` bằng `isPresent: row.isPresent` và **xoá ba dòng comment giải thích cast** cùng `import type { AttendanceStatus }` — không còn cast thì comment không còn đối tượng. `verifyResponse(...)` và `satisfies AttendanceRecord` giữ nguyên.

- [ ] **Step 3: `attendance.service.ts`**

- Bỏ `import { AttendanceStatus } from '@guild/shared/enums';`.
- `getSummary`: `by: ['sessionId', 'status']` → `by: ['sessionId', 'isPresent']`; đổi helper thành

```ts
/**
 * Count of one answer in the session under consideration.
 * @param isPresent - Answer to count
 * @returns The count, 0 when nobody gave that answer
 */
const countOf = (isPresent: boolean): number =>
  rows.find((row) => row.isPresent === isPresent)?._count._all ?? 0;
```

  rồi `coCount: countOf(true)`, `khongCount: countOf(false)`.
- `mark`: destructure `const { characterId, sessionId, isPresent } = input;`, `create: { …, isPresent, … }` và `update: { isPresent, markedAt: now, markedByCharacterId: own }`. Cập nhật JSDoc `@param input` thành "characterId, sessionId and isPresent".

- [ ] **Step 4: Kiểm**

```bash
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```

- [ ] **Step 5: Commit**

```bash
git commit -am "refactor(api): read and write attendance through isPresent"
```

---

### Task 4: `apps/web` — bốn chỗ tiêu thụ

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-row.tsx`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx`
- Modify: `apps/web/features/attendance/components/member-attendance-card.tsx`
- Modify: `apps/web/features/attendance/components/attendance-log-table.tsx`
- Modify: `apps/web/features/team-builder/lib/session-pool.ts`
- Test: `apps/web/features/attendance/api/__tests__/attendance-api.test.ts`
- Test: `apps/web/features/team-builder/lib/__tests__/session-pool.test.ts`
- Test: `apps/web/features/team-builder/hooks/__tests__/use-formation-pool.test.ts`
- Test: `apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts`

**Interfaces:**
- Consumes: `attendanceLabel`, `AttendanceRecord`, `MarkAttendanceInput` từ `@guild/shared`.
- Produces: `AttendanceDraft = Record<string, boolean | undefined>` (export từ `attendance-row.tsx`, dùng bởi `attendance-grid.tsx`).
- `api/attendance-api.ts`, `hooks/use-attendance.ts`, `lib/record-key.ts`, các store: **không sửa**, chỉ xác nhận type-check sạch.

- [ ] **Step 1: Cập nhật fixtures trong test**

Mọi record giả trong bốn file test đổi `status: AttendanceStatus.PRESENT` → `isPresent: true` (và `ABSENT` → `false`); bỏ import `AttendanceStatus`.

- [ ] **Step 2: `attendance-row.tsx`**

- `export type AttendanceDraft = Record<string, boolean | undefined>;`
- `onDraftChange: (sessionId: string, isPresent: boolean) => void;`
- Trong body: `const currentIsPresent = recordMap[recordKey(...)]?.isPresent;` → `<StatusBadge isPresent={currentIsPresent} />`.
- `StatusBadge({ isPresent }: { isPresent?: boolean })` — **thứ tự nhánh bắt buộc**: `if (isPresent === undefined) return <span className="text-muted-foreground">—</span>;` rồi mới `return <StatusIcon tone={isPresent ? "success" : "danger"} label={attendanceLabel(isPresent)} />;`. Cập nhật JSDoc.
- `AttendanceToggle({ value, onSelect }: { value?: boolean; onSelect: (isPresent: boolean) => void })`: nút "Không" dùng `aria-pressed={value === false}`, `onClick={() => onSelect(false)}`, điều kiện class `value === false`; nút "Có" dùng `value === true` và `onSelect(true)`. **Giữ nguyên toàn bộ className, icon và animation**; chuỗi "Có"/"Không" trong hai nút giữ nguyên (chúng là nhãn tĩnh của control, không phải nhãn của một giá trị).

- [ ] **Step 3: `attendance-grid.tsx`**

- `handleStartEdit`: `initial[session.id] = recordMap[recordKey(character.id, session.id)]?.isPresent;`
- `handleDraftChange = (sessionId: string, isPresent: boolean) => …`, cập nhật JSDoc `@param`.
- `getChangedCells`: `const current = recordMap[...]?.isPresent;`, `return [{ sessionId: session.id, isPresent: next }];`. **Giữ nguyên** `if (next === undefined || next === current) return [];` — đã đúng với `false`.
- `handleConfirm`: `changes.map(({ sessionId, isPresent }) => mark({ characterId: character.id, sessionId, isPresent }))`.
- Bỏ `import { AttendanceStatus }`.

- [ ] **Step 4: `member-attendance-card.tsx`**

- `import { attendanceLabel } from "@guild/shared/enums";`
- `/** The two options of an attendance entry, in display order. */ const CHOICES = [true, false];`
- `const current = recordMap[recordKey(character.id, battleSession.id)]?.isPresent ?? null;`
- Trong `CHOICES.map((isPresent) => …)`: `key={String(isPresent)}`, `variant={current === isPresent ? "default" : "outline"}`, payload `mark({ characterId: character.id, sessionId: battleSession.id, isPresent })`, nội dung nút `{attendanceLabel(isPresent)}`.
- `counts.coCount` giữ nguyên.

- [ ] **Step 5: `attendance-log-table.tsx`**

`const present = record.isPresent;` và `label={attendanceLabel(record.isPresent)}`; import `attendanceLabel` thay cho `ATTENDANCE_STATUS_LABEL, AttendanceStatus`.

- [ ] **Step 6: `team-builder/lib/session-pool.ts`**

`AttendanceRecordLike`: `status: AttendanceStatus` → `isPresent: boolean`; bộ lọc `presentCharacterIds` dùng `record.isPresent`; bỏ import enum.

- [ ] **Step 7: Kiểm**

```bash
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
```

- [ ] **Step 8: Commit**

```bash
git commit -am "refactor(web): consume the boolean attendance answer"
```

---

### Task 5: `docs/architecture.md`

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Bảng `@guild/shared/enums`** (~dòng 61-62) — bỏ dòng `AttendanceStatus`; nếu cần thì nêu `attendanceLabel` ở đúng chỗ mô tả helper.
- [ ] **Step 2:** (~dòng 73) sửa "Prisma's `GuildClass` / `AttendanceStatus` enums must keep the same values as the shared enums" thành chỉ còn `GuildClass`.
- [ ] **Step 3:** ER diagram và bảng data model của `AttendanceRecord` (~dòng 284-291) — `status AttendanceStatus` → `isPresent Boolean`, ghi rõ `true` = "Có". Câu về `markedAt` giữ nguyên.
- [ ] **Step 4:** §Endpoint — mô tả `POST /attendance` và `GET /attendance/records` nếu có nhắc tên field thì đổi theo. `GET /attendance/summary` giữ nguyên.
- [ ] **Step 5:** Không sửa các spec lịch sử trong `docs/superpowers/specs` và `docs/custom-spec` cũ — chúng là bản ghi tại thời điểm đó.

- [ ] **Step 6: Commit**

```bash
git commit -am "docs(architecture): attendance is a boolean answer"
```

---

## Verification

```bash
pnpm --filter @guild/shared build
pnpm --filter api prisma:status      # không còn migration nào pending
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
```

Dữ liệu:

- `\d "AttendanceRecord"` → `isPresent | boolean | not null`, và không còn type `AttendanceStatus` (`\dT`).
- `SELECT "isPresent", count(*) FROM "AttendanceRecord" GROUP BY 1;` khớp cặp số `CO`/`KHONG` đã ghi ở Task 2 Step 1.

Chạy thật (`pnpm --filter api dev` + `pnpm --filter web dev`):

- Vai **member** — thẻ điểm danh: bấm "Có" rồi reload, nút "Có" vẫn ở trạng thái `default`; bấm "Không" rồi reload, nút "Không" ở trạng thái `default` (đây là ca bắt lỗi truthiness); số "Đã có N người" tăng/giảm đúng.
- Vai **admin** — lưới: sửa nhiều ô trong một hàng rồi Xác nhận, badge xanh (Có) / đỏ (Không) / `—` (chưa điểm danh) hiển thị đúng ba trạng thái; ô của ngày quá hạn vẫn read-only với member.
- `/lich-su-diem-danh` — cột trạng thái hiển thị đúng nhãn "Có"/"Không".
- `/xep-team` — pool chỉ gom những người trả lời "Có".
