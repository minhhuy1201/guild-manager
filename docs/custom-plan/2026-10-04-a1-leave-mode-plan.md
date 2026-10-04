# A1 - Chế độ nghỉ phép: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development hoặc
> superpowers:executing-plans để chạy plan theo từng task. Bước dùng checkbox (`- [x]`).

**Mục tiêu:** Thành viên khai nghỉ một khoảng ngày; mọi trận còn mở trong khoảng hiện "Không (nghỉ)",
không bị nhắc, bị gỡ khỏi đội hình. Khai được từ web, lệnh bot và nút trên tin `/thong-bao`.

**Kiến trúc:** Bảng `Leave` riêng; câu trả lời hiệu lực tính lúc đọc trong `AttendanceService` (record
thắng, rồi tới lần nghỉ phủ trận). Luật phủ là một hàm thuần. Mọi thứ nằm trong module `attendance` để
tránh vòng phụ thuộc.

**Tech stack:** NestJS 11, Prisma 7, Zod (`@guild/shared`), Jest; Next.js 16, TanStack Query, shadcn
(`Calendar`, `Dialog`, `Tabs`), Vitest; Discord interactions (modal).

**Spec:** [`../custom-spec/2026-10-04-a1-leave-mode-design.md`](../custom-spec/2026-10-04-a1-leave-mode-design.md)
- đọc spec trước, plan không lặp lại lý do.

## Ràng buộc chung

- Một PR cho cả API, web, bot (D10). Vượt 900 dòng: lúc `gh pr create` cần người dùng gõ
  `override rule PR size`.
- Code, comment, tên file tiếng Anh; UI và message lỗi tiếng Việt; dấu gạch là `-`.
- Ngày nghỉ là chuỗi `YYYY-MM-DD` theo lịch VN (UTC+7) ở mọi tầng; không bao giờ dùng giờ máy.
- "Bây giờ" chỉ lấy từ `Clock` (API). Không `new Date()` ngoài seam đó.
- Shape qua mạng chỉ khai báo trong `packages/shared`; sau khi sửa: `pnpm --filter @guild/shared build`.
- Không `forwardRef()`. Switch trên `source` kết thúc bằng `assertNever`.
- Migration tạo local bằng `pnpm --filter api prisma:migrate`, có `ENABLE ROW LEVEL SECURITY`.
- Repo đang ở `main`: tạo branch `feat/a1-leave-mode` trước commit đầu tiên. Mỗi commit: kiểm branch,
  message qua `caveman:caveman-commit`.

## Review Focus

Năm chỗ dễ sai nhất mà test từng task phải ghim (mỗi dòng đã có test trong task sở hữu):

1. Biên ngày VN: trận 00:30 VN ngày D là ngày D chứ không phải D-1 (UTC). - Task 3.
2. Khai nghỉ đúng lúc ngày vừa khoá (`createdAt === closeAt`) không phủ. - Task 3.
3. Bấm "Có" trong lúc nghỉ thắng lần nghỉ; hủy nghỉ không làm record "Có" biến mất. - Task 6.
4. Thành viên khai nghỉ không xoá record / không gỡ đội hình của ngày đã khoá; admin thì có. - Task 5.
5. Gõ `02/01` vào ngày 28/12 ra năm sau; `31/02` bị từ chối chứ không lăn sang tháng 3. - Task 7.

---

### Task 1: Contract dùng chung

**Files:**
- Create: `packages/shared/schemas/leave.schema.ts`
- Modify: `packages/shared/schemas/attendance.schema.ts`, `packages/shared/schemas/index.ts`,
  `packages/shared/lib/vn-time.ts` (+ export trong `packages/shared/lib/index.ts`)

**Produces:**
- `vnDateKey(date: Date): string` - `YYYY-MM-DD` theo lịch VN.
- `LEAVE_DATE_PATTERN`, `createLeaveSchema`, `CreateLeaveInput`, `leaveSchema`, `Leave`.
- `attendanceSourceSchema`, `type AttendanceSource = 'answer' | 'leave'`, field `source` trong
  `attendanceRecordSchema`.

- [x] **Bước 1: viết code**

```ts
// vn-time.ts
/** Vietnam calendar day of an instant, as `YYYY-MM-DD` - the format leave dates are stored and sent in. */
export function vnDateKey(date: Date): string {
  const { year, month, day } = vnParts(date);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
```

```ts
// leave.schema.ts
import { z } from "zod";
import { ATTENDANCE_REASON_MAX_LENGTH } from "./attendance.schema";

/** A Vietnam calendar day. Lexical order equals date order, which the overlap check relies on. */
export const leaveDateSchema = z
  .string()
  .regex(/^(\d{4})-(\d{2})-(\d{2})$/, "Ngày không hợp lệ.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value), "Ngày không hợp lệ.");

export const createLeaveSchema = z
  .object({
    characterId: z.string().min(1, "Thiếu thành viên."),
    startDate: leaveDateSchema,
    endDate: leaveDateSchema,
    reason: z.string().trim().max(ATTENDANCE_REASON_MAX_LENGTH, "Lý do tối đa 255 ký tự.").nullish(),
  })
  .refine((input) => input.endDate >= input.startDate, {
    message: "Ngày kết thúc phải từ ngày bắt đầu trở đi.",
    path: ["endDate"],
  });

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

export const leaveSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  startDate: leaveDateSchema,
  endDate: leaveDateSchema,
  reason: z.string().nullable(),
  /** ISO instant */
  createdAt: z.string(),
});

export type Leave = z.infer<typeof leaveSchema>;
```

```ts
// attendance.schema.ts - thêm
/** Where an attendance entry comes from: a button somebody pressed, or a leave covering the day. */
export const attendanceSourceSchema = z.enum(["answer", "leave"]);
export type AttendanceSource = z.infer<typeof attendanceSourceSchema>;
// attendanceRecordSchema thêm:  source: attendanceSourceSchema,
```

- [x] **Bước 2:** `pnpm --filter @guild/shared build` rồi `pnpm --filter api typecheck` và
  `pnpm --filter web typecheck`. Chỗ nào dựng `AttendanceRecord` sẽ báo thiếu `source` - sửa ở
  Task 6 (API) và Task 9 (fixture web); ghi lại danh sách lỗi để đối chiếu.
- [x] **Bước 3: commit** `feat(core): add shared leave contract`.

### Task 2: Model `Leave` và migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_leave/migration.sql` (sinh bằng lệnh)

- [x] **Bước 1:** thêm model theo spec §4.1, comment giải thích `createdAt` (mốc luật phủ),
  `cancelledAt` (hủy không xoá), hai cột `...ByCharacterId` không phải relation. `Character` thêm
  `leaves Leave[]`.

```prisma
/// A stretch of days a member will be away. Read-time only: it never writes AttendanceRecord rows -
/// see docs/custom-spec/2026-10-04-a1-leave-mode-design.md §4.
model Leave {
  id                     String    @id @default(cuid())
  characterId            String
  /// Vietnam calendar days, both inclusive.
  startDate              DateTime  @db.Date
  endDate                DateTime  @db.Date
  reason                 String?   @db.VarChar(255)
  /// Compared with the day's closing moment by the coverage rule; written from Clock, not by the DB.
  createdAt              DateTime
  createdByCharacterId   String?
  /// Whether an admin created it, captured at that moment: an admin's leave also covers closed days.
  createdByAdmin         Boolean
  /// Null = active. Cancelling stamps this instead of deleting, so days closed before it stay "Không".
  cancelledAt            DateTime?
  cancelledByCharacterId String?
  /// Whether an admin cancelled it: an admin's cancel releases closed days too. False until cancelled.
  cancelledByAdmin       Boolean

  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([characterId])
  @@index([endDate])
}
```

- [x] **Bước 2:** `pnpm --filter api db:up`, `pnpm --filter api prisma:migrate -- --name add_leave`.
- [x] **Bước 3:** thêm cuối `migration.sql`, kèm comment như `20260925004158_enable_rls_on_tactics`:
  `ALTER TABLE "Leave" ENABLE ROW LEVEL SECURITY;`
- [x] **Bước 4:** `pnpm --filter api test -- migration-rls` → PASS.
- [x] **Bước 5: commit** `feat(db): add leave table`.

### Task 3: Luật phủ (hàm thuần)

**Files:**
- Create: `apps/api/src/modules/attendance/leave-coverage.ts`
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts` (`closingMoment`),
  `battle-sessions.public.ts` (export)
- Test: `apps/api/src/modules/attendance/__tests__/leave-coverage.spec.ts`,
  `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Produces:**

```ts
export interface CoverageSession { id: string; dateTime: Date; deadline: Date; attendanceClosedAt: Date | null }
export interface LeaveWindow { id: string; characterId: string; startDate: string; endDate: string;
  reason: string | null; createdAt: Date; createdByAdmin: boolean; cancelledAt: Date | null;
  cancelledByAdmin: boolean }
// closingMoment(deadline, closedAt) lives in battle-sessions/session-schedule.ts (exported via
// battle-sessions.public.ts): the closing rule stays in one file.
export function isLeaveCovering(leave: LeaveWindow, session: CoverageSession): boolean
export function effectiveRecords(records: AttendanceRecord[], leaves: LeaveWindow[],
  sessions: CoverageSession[]): AttendanceRecord[]
```

- [x] **Bước 1: test đỏ** - bảng `it.each` cho `isLeaveCovering`, mỗi dòng ghi rõ lý do:
  - trận trong khoảng, khai trước deadline, chưa hủy → `true`
  - trận ngày `endDate + 1` → `false`; trận ngày `startDate` và `endDate` → `true`
  - trận 00:30 VN ngày D (= 17:30 UTC ngày D-1), khoảng chỉ có ngày D → `true` (Review Focus 1)
  - `createdAt` sau deadline → `false`; `createdAt === closeAt` → `false` (Review Focus 2)
  - `attendanceClosedAt` trước deadline và trước `createdAt` → `false` (announce thắng deadline)
  - hủy trước `closeAt` → `false`; hủy đúng / sau `closeAt` → `true`
  - `createdByAdmin` + `createdAt` sau `closeAt` → `true` (admin vượt khoá)
  - `cancelledByAdmin` + hủy sau `closeAt` → `false` (admin hủy nhả cả ngày đã khoá)
  - `createdByAdmin`, hủy bởi thành viên sau `closeAt` → `true` (điều 3 xét người hủy)
- [x] **Bước 2: test đỏ** cho `effectiveRecords`: record thắng lần nghỉ (giữ `source: 'answer'`);
  ô không record + có lần nghỉ phủ → `{ isPresent: false, source: 'leave', reason: leave.reason,
  markedAt: leave.createdAt.toISOString() }`; lần nghỉ của người khác không lẫn; thứ tự trả về
  `markedAt` giảm dần (giữ hợp đồng cũ của `getRecords`).
- [x] **Bước 3:** `pnpm --filter api test -- leave-coverage` → FAIL.
- [x] **Bước 4: code**

```ts
// session-schedule.ts: an announcement closes the day before its deadline does - the same two ways in
// as isAttendanceClosed.
export function closingMoment(deadline: Date, closedAt: Date | null): Date {
  return closedAt ?? deadline;
}

export function isLeaveCovering(leave: LeaveWindow, session: CoverageSession): boolean {
  const day = vnDateKey(session.dateTime);
  if (day < leave.startDate || day > leave.endDate) return false;

  const closeAt = closingMoment(session.deadline, session.attendanceClosedAt).getTime();
  // An admin may act on a closed day, exactly as when marking attendance; a member may not.
  const isCreatedInTime = leave.createdByAdmin || leave.createdAt.getTime() < closeAt;
  if (!isCreatedInTime) return false;

  if (leave.cancelledAt === null) return true;

  return !leave.cancelledByAdmin && leave.cancelledAt.getTime() >= closeAt;
}
```

`effectiveRecords`: tập key `sessionId:characterId` từ records; với mỗi session × lần nghỉ phủ mà key
chưa có thì thêm phần tử `source: 'leave'`; sort theo `markedAt` giảm dần.
- [x] **Bước 5:** chạy lại → PASS. **Commit** `feat(api): add leave coverage rule`.

### Task 4: Đọc mốc khoá của trận

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`,
  `battle-sessions.public.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`

**Produces:**

```ts
/** Sessions by id, carrying what the leave coverage rule needs and the public shape leaves out. */
readCoverageByIds(ids: string[]): Promise<CoverageSessionRow[]>
/** Sessions whose battle falls on a Vietnam day in [startDate, endDate]. */
readCoverageInRange(startDate: string, endDate: string): Promise<CoverageSessionRow[]>
export type CoverageSessionRow = { id: string; dateTime: Date; deadline: Date; attendanceClosedAt: Date | null; isGuildWar: boolean }
```

`readCoverageInRange` đổi khoảng ngày VN sang khoảng instant bằng `fromVnParts` (00:00 ngày đầu đến
00:00 ngày sau ngày cuối, nửa mở). `isGuildWar` có mặt vì `releaseCharacterFromSession` nhận
`BattleSession` - kiểm chữ ký hàm đó, nếu chỉ cần `id` + `dateTime` thì truyền đúng các field đó.

- [x] **Bước 1: test đỏ:** trận 23:59 VN ngày cuối nằm trong; trận 00:00 VN ngày sau ngày cuối nằm
  ngoài; `attendanceClosedAt` được trả về.
- [x] **Bước 2:** code, chạy `pnpm --filter api test -- battle-sessions.service` → PASS.
- [x] **Bước 3: commit** `feat(api): read session closing moments`.

### Task 5: `LeaveService` + endpoint

**Files:**
- Create: `apps/api/src/modules/attendance/leave.service.ts`, `leave.controller.ts`,
  `leave.codec.ts`, `dto/create-leave.dto.ts`
- Modify: `attendance.module.ts` (controller + provider + export), `attendance.public.ts`
- Test: `apps/api/src/modules/attendance/__tests__/leave.service.spec.ts`,
  `__tests__/leave.controller.spec.ts`

**Consumes:** Task 1 schemas, Task 3 `isLeaveCovering`/`LeaveWindow`, Task 4 `readCoverageInRange`,
`TeamBuilderService.releaseCharacterFromSession(session, characterId, tx)`.

**Produces:**

```ts
class LeaveService {
  listActive(): Promise<Leave[]>                                   // GET /leaves
  create(input: CreateLeaveInput, actor: JwtPayload): Promise<Leave>  // POST /leaves
  cancel(id: string, actor: JwtPayload): Promise<Leave>            // POST /leaves/:id/cancel
    /** Leaves overlapping a set of sessions, as LeaveWindow - for AttendanceService. */
  windowsForSessions(sessions: CoverageSession[]): Promise<LeaveWindow[]>
}
```

Message lỗi là hằng số đầu file, đúng bảng spec §5.2. Thứ tự kiểm: 404 → 403 → 400 → 409.

- [x] **Bước 1: test đỏ** (Prisma + `TeamBuilderService` stub, `Clock` cố định):
  - member khai cho người khác → 403 `Bạn chỉ khai nghỉ được cho nhân vật của mình.`
  - admin khai hộ → OK, `createdByCharacterId` = id admin (null với rescue admin)
  - member: `endDate` trước hôm nay VN → 400 `Ngày kết thúc đã qua.`; `endDate` = hôm nay → OK;
    admin: khoảng đã qua → OK
  - chồng với lần nghỉ chưa hủy → 409 nêu `dd/mm - dd/mm`; chồng với lần **đã hủy** → OK; liền kề
    (`endDate` cũ = `startDate` mới - 1) → OK
  - member: xoá record + gọi release chỉ cho trận có `now < closeAt`; trận đã khoá trong khoảng giữ
    record, không gọi release (Review Focus 4)
  - admin: xoá record + gọi release cho mọi trận trong khoảng, kể cả đã khoá (ghi đè câu trả lời cũ)
  - `createdByAdmin` / `cancelledByAdmin` ghi theo role lúc bấm; rescue admin (không nhân vật) → true
  - `cancel` bởi người khác (member) → 403; gọi hai lần → lần hai trả nguyên, không ghi lại
    `cancelledAt`
  - `listActive` bỏ lần đã hủy và lần có `endDate` trước hôm nay
- [x] **Bước 2:** `pnpm --filter api test -- leave.service` → FAIL.
- [x] **Bước 3:** code. `create` chạy trong `prisma.$transaction(async (tx) => …)`: lấy khoá advisory theo nhân vật (`tx.$executeRaw` `pg_advisory_xact_lock(hashtext(characterId))`), đọc các lần nghỉ chưa hủy và báo 409 nếu chồng ngày, rồi tạo `Leave` với
  `createdAt: now`, `createdByAdmin: canManageGuild(actor.role)`, `cancelledByAdmin: false`; lọc
  `readCoverageInRange` bằng chính `isLeaveCovering(created, s)` (một luật cho cả đọc lẫn ghi); `tx.attendanceRecord.deleteMany({ where: { characterId, sessionId: { in } } })`; release từng trận.
  `leave.codec.ts` đổi `@db.Date` sang chuỗi bằng `toISOString().slice(0, 10)` (cột Date về dạng
  00:00 UTC) qua `verifyResponse(leaveSchema, …)`. Controller: `@UseGuards(JwtAuthGuard)`, route
  `leaves`, `@CurrentUser()`.
- [x] **Bước 4:** test controller mỏng (route gọi đúng service, guard có mặt). Chạy lại → PASS.
- [x] **Bước 5: commit** `feat(api): add leave endpoints`.

### Task 6: Câu trả lời hiệu lực trong điểm danh

**Files:**
- Modify: `apps/api/src/modules/attendance/attendance.service.ts`, `attendance.codec.ts`
- Test: `__tests__/attendance.service.spec.ts`,
  `apps/api/src/modules/discord-bot/__tests__/reminder.service.spec.ts`

- [x] **Bước 1: test đỏ:**
  - `getRecords` trả phần tử `source: 'leave'` cho ô chưa trả lời trong khoảng nghỉ
  - record "Có" tạo sau lần nghỉ thắng; sau `cancel` record "Có" vẫn còn (Review Focus 3)
  - `getSummary` đếm phần tử nghỉ vào `khongCount`
  - reminder: người có lần nghỉ phủ trận không nằm trong `missing`; người khác vẫn bị nhắc
- [x] **Bước 2:** code. `toAttendanceRecord` thêm `source: 'answer'`. `getRecordsForSessions(ids)`:
  đọc song song records, `battleSessions.readCoverageByIds(ids)`, rồi
  `leaves.windowsForSessions(sessions)` → `effectiveRecords(...)`. `getSummary` đếm trên kết quả
  `getRecordsForSessions` thay vì `groupBy`. `ReminderService` không đổi code.
- [x] **Bước 3:** `pnpm --filter api test` (cả suite, vì shape record đổi) → PASS.
- [x] **Bước 4: commit** `feat(api): merge leave into attendance reads`.

### Task 7: Bot - parse ngày và hai lệnh

**Files:**
- Create: `apps/api/src/modules/discord-bot/leave-date-input.ts`,
  `leave-reply.ts` (câu trả lời của modal). Không có lệnh slash riêng (quyết định sau review: tránh
  rối danh sách lệnh)
- Modify: `commands/command.types.ts` (`CommandDeps` thêm `leaves: LeaveService`),
  `interaction-router.ts` (truyền `leaves`), `discord-bot.module.ts` nếu cần
- Test: `__tests__/leave-date-input.spec.ts`, `__tests__/leave-reply.spec.ts`

**Produces:**

```ts
/** `dd/mm` or `dd/mm/yyyy` → `YYYY-MM-DD`; a missing year picks the occurrence nearest `today`. Null when unreadable. */
export function parseLeaveDateInput(text: string, today: Date): string | null
/** Create a leave for the caller and phrase the ephemeral answer - the answer to the leave modal. */
export async function submitLeave(discordId: string, raw: { from: string; to: string; reason: string | null }, deps: CommandDeps): Promise<CommandReply>
```

- [x] **Bước 1: test đỏ** `parseLeaveDateInput`: `05/10` ngày 2026-10-04 → `2026-10-05`; `5/10` →
  như trên; `02/01` ngày 2026-12-28 → `2027-01-02`; `27/12` ngày 2027-01-02 → `2026-12-27`;
  `05/10/2027` → `2027-10-05`; `31/02` → `null`; `abc`, `` , `32/01` → `null` (Review Focus 5).
  Regex có nhóm rõ ràng: `/^(\d{1,2})\/(\d{1,2})(\/(\d{4}))?$/`.
- [x] **Bước 2: test đỏ** `submitLeave`: khai hợp lệ → ephemeral `Đã khai nghỉ 05/10 - 12/10.`; sai
  định dạng → `Ngày phải có dạng dd/mm, ví dụ 05/10.`; lỗi 409 của service → message của service
  hiện nguyên văn.
- [x] **Bước 3:** code. Danh tính qua `ActorResolver` như `/diem-danh`; actor JWT-like dựng theo cách
  `/diem-danh` đang truyền vào `AttendanceService.mark`.
- [x] **Bước 4:** `pnpm --filter api test -- discord-bot` → PASS.
- [x] **Bước 5: commit** `feat(api): add leave slash commands` (sau đó hai lệnh bị bỏ, chỉ còn nút + modal;
  không cần `discord:register`).

### Task 8: Bot - nút "Xin nghỉ" và modal

**Files:**
- Modify: `discord.constants.ts` (`INTERACTION_TYPE.modalSubmit = 5`,
  `INTERACTION_RESPONSE_TYPE.modal = 9`, `COMPONENT_TYPE.textInput = 4`, `COMPONENT_TYPE.label = 18`,
  `TEXT_INPUT_STYLE`), `custom-id.ts` (`ANNOUNCEMENT_LEAVE_ID = 'ann:nghi-phep'`,
  `LEAVE_MODAL_ID = 'modal:nghi-phep'`), `entry-buttons.ts`, `interaction.schema.ts`,
  `interaction-router.ts`, `commands/command.types.ts` (`ModalReply`)
- Create: `leave-modal.ts` (dựng modal + đọc giá trị submit)
- Test: `__tests__/entry-buttons.spec.ts`, `__tests__/leave-modal.spec.ts`,
  `__tests__/interaction-router.spec.ts`

- [x] **Bước 1: test đỏ:**
  - `buildEntryButtons` có 3 nút, nút giữa `🏖️ Xin nghỉ` với `custom_id: 'ann:nghi-phep'`
  - bấm nút → response `{ type: 9, data: { custom_id: 'modal:nghi-phep', title: 'Xin nghỉ',
    components: [3 Label] } }`, ô `tu-ngay` điền sẵn hôm nay dạng `dd/mm`
  - payload type 5 hợp lệ qua `interactionSchema`; payload type 5 với custom_id lạ → ephemeral báo
    nút cũ, không 500
  - submit → `submitLeave` nhận đúng `from`/`to`/`reason` (ô lý do rỗng → `null`)
- [x] **Bước 2:** code. Schema modal submit:

```ts
const modalSubmitInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.modalSubmit),
  data: z.object({
    custom_id: z.string().min(1),
    // Each Label wraps one Text Input; only the inner custom_id and value are read.
    components: z.array(z.object({
      component: z.object({ custom_id: z.string().min(1), value: z.string() }),
    })),
  }),
  ...invokerFields,
});
```

  `callerDiscordId` nhận thêm kiểu này. Cập nhật comment ở `interaction.schema.ts:67` (modal submit
  giờ được nhận). Router: nhánh `messageComponent` thêm `ANNOUNCEMENT_LEAVE_ID` → modal; `case
  INTERACTION_TYPE.modalSubmit` → `submitLeave`; `default` → `assertNever`.
- [x] **Bước 3:** `pnpm --filter api test -- discord-bot` → PASS.
- [x] **Bước 4: commit** `feat(api): open leave modal from announcement`.

### Task 9: Web - màn điểm danh

**Files:**
- Create: `apps/web/features/attendance/api/leave-api.ts` (`"use server"`: `fetchLeaves`,
  `createLeave`, `cancelLeave`), `hooks/use-leaves.ts` (`useLeaves`, `useCreateLeave`,
  `useCancelLeave` - invalidate keys của leaves **và** records), `components/leave-dialog.tsx`,
  `components/my-leave-banner.tsx`, `lib/leave-label.ts` (`formatLeaveRange('2026-10-05',
  '2026-10-12') → '05/10 - 12/10'`)
- Modify: `api/attendance-keys.ts` (key `leaves`), `components/attendance-screen.tsx` (nút + banner),
  `components/attendance-status-icon.tsx` (prop `source: AttendanceSource`, nhãn
  `Không · Nghỉ phép` khi `leave`, switch + `assertNever`), các chỗ gọi icon truyền `source`,
  fixture test có `AttendanceRecord` thêm `source: 'answer'`
- Test: `features/attendance/__tests__/` + `lib/__tests__/leave-label.test.ts`

- [x] **Bước 1: test đỏ:** `formatLeaveRange`; dialog không cho gửi khi chưa chọn đủ khoảng; admin
  thấy ô chọn thành viên, member không thấy; banner chỉ hiện lần nghỉ của mình, bấm `Hủy nghỉ` gọi
  `cancelLeave(id)`; icon với `source: 'leave'` có nhãn `Không · Nghỉ phép`.
- [x] **Bước 2:** `pnpm --filter web test -- attendance` → FAIL.
- [x] **Bước 3:** code. Dialog có hai `LeaveDayField` ("Từ ngày", "Đến ngày"; popover + `Calendar
  mode="single"` như `date-time-field.tsx`) và `MemberPicker` có ô tìm kiếm cho admin; ngày đổi sang
  `YYYY-MM-DD` bằng phần lịch của máy (`toDayKey`, không qua `vnDateKey` vì DayPicker trả nửa đêm giờ
  máy), ngày trước hôm nay bị khoá **chỉ với member** (admin được chọn ngày đã qua). Lỗi API hiện nguyên `ApiError.message` qua toast.
- [x] **Bước 4:** chạy lại + `pnpm --filter web typecheck` + `pnpm --filter web lint` → PASS.
- [x] **Bước 5: commit** `feat(ui): add leave dialog to attendance`.

### Task 10: Web - tab "Nghỉ phép" trong Thiết lập

**Files:**
- Create: `apps/web/features/attendance/components/leave-panel.tsx`
- Modify: `apps/web/features/attendance/index.ts` (export `LeavePanel`),
  `apps/web/features/settings/components/settings-tabs.tsx` (`TAB.leaves`, `tabFrom` nhận
  `leaves`, trigger icon `Plane`, nhãn ngắn `Nghỉ phép`)
- Test: `features/settings/components/__tests__/settings-tabs.test.tsx`,
  `features/attendance/__tests__/leave-panel.test.tsx`

- [x] **Bước 1: test đỏ:** `?tab=leaves` mở tab nghỉ phép; giá trị lạ vẫn mở lịch đánh; bảng hiện
  tên thành viên, khoảng ngày, lý do; nút `Hủy` gọi `cancelLeave`; nút `Khai hộ` mở `LeaveDialog`.
- [x] **Bước 2:** code; ba tab trên mobile vẫn vừa một hàng (nhãn ngắn).
- [x] **Bước 3:** `pnpm --filter web test` → PASS. **Commit** `feat(ui): add leave tab to settings`.

### Task 11: Tài liệu, kiểm tra cuối, review, PR

- [x] **Bước 1:** cập nhật `docs/architecture.md` theo spec §10 (module, endpoint, §5 `Leave` +
  `source`, §6 luật phủ, sơ đồ bot có modal submit). Đổi trạng thái spec thành "đã triển khai".
- [x] **Bước 2:** chạy đủ: `pnpm --filter @guild/shared build`, `pnpm --filter api test`,
  `pnpm --filter api lint`, `pnpm --filter api typecheck`, `pnpm --filter web test`,
  `pnpm --filter web lint`, `pnpm --filter web typecheck`, `pnpm --filter web build`. Log dài đi qua
  subagent, chỉ lấy tóm tắt.
- [ ] **Bước 3:** chạy app (`run` skill): khai nghỉ trên web, xem ô "Nghỉ phép", hủy, xem tab
  Thiết lập.
- [x] **Bước 4:** review bằng skill `review-loop` (vòng cuối `pr-review` trong agent `reviewer`
  riêng); dán danh sách Needs human review.
- [ ] **Bước 5:** `git diff --shortstat main...HEAD`; vượt 900 thì dừng, chờ người dùng gõ
  `override rule PR size`, rồi `gh pr create` theo `.github/pull_request_template.md`. Sau merge:
  không cần `discord:register` (không có lệnh slash mới).
