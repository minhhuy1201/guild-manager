# Lý do vắng khi điểm danh "Không" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Member trả lời "Không" cho một ngày đánh thì gõ được một câu lý do (≤255 ký tự) vào ô hiện
ngay dưới nút "Không", Enter là lưu; lý do hiện lại cho cả bang ở màn Lịch sử điểm danh và ở lưới điểm
danh của admin (chỉ đọc).

**Architecture:** `reason` là một cột nullable trên `AttendanceRecord`, đi chung đường ghi đã có
(`POST /attendance`) chứ không có endpoint riêng. Server tự quyết giá trị: `isPresent = true` ⇒
`null`, chuỗi rỗng ⇒ `null`. Quyền ghi và luật deadline **không đổi**. Frontend: màn member ghi, hai
màn còn lại chỉ đọc.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod 4 (nestjs-zod) · Jest · Next.js App Router ·
TanStack Query · Zustand · Vitest · pnpm workspace.

**Spec:** [docs/superpowers/specs/2026-08-31-attendance-absence-reason-design.md](../specs/2026-08-31-attendance-absence-reason-design.md)

## Global Constraints

- **TDD**: mỗi task viết test trước, chạy cho nó đỏ, rồi mới viết code cho xanh. Test mô tả **hành vi**.
- Chữ hiển thị cho người dùng bằng **tiếng Việt**; tên file, định danh, commit message bằng tiếng Anh.
  Tên test viết tiếng Việt, theo đúng các file test sẵn có trong module này.
- Comment/JSDoc bằng **tiếng Anh** ở cả `apps/api` lẫn `apps/web` (đúng như các file đang sửa).
- Shape đi qua network chỉ khai báo một lần ở `packages/shared`. Sau khi sửa nó, chạy
  `pnpm --filter @guild/shared build` trước khi chạy test của app (script `pretest` đã tự làm).
- Giới hạn độ dài: `ATTENDANCE_REASON_MAX_LENGTH = 255`, và cột database là `@db.VarChar(255)`.
- Backend: Controller → Service → Prisma. Validate ở biên (Zod/DTO), bên trong tin TypeScript.
- Frontend: server state → TanStack Query, không đưa response API vào Zustand.
- Nhánh `feat/attendance-absence-reason` (đã tạo), mỗi task một commit, **không** dòng `Co-Authored-By`.
- Lệnh kiểm tra cuối: `pnpm --filter api test`, `pnpm --filter web test`,
  `pnpm --filter api typecheck`, `pnpm --filter web typecheck`.

## Trạng thái khởi điểm

Nhánh `feat/attendance-absence-reason`, commit `769d1df` chỉ chứa file spec. Chưa có dòng code nào.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/prisma/migrations/<timestamp>_them_ly_do_vang/migration.sql` | Thêm cột `reason varchar(255)` (Prisma sinh ra) |
| `apps/web/features/attendance/__tests__/attendance-row.test.tsx` | Test dòng lưới admin hiện lý do ở chế độ đọc |

**Sửa**

| File | Đổi gì |
|---|---|
| `apps/api/prisma/schema.prisma` | Cột `reason String? @db.VarChar(255)` trên `AttendanceRecord` |
| `packages/shared/schemas/attendance.schema.ts` | `ATTENDANCE_REASON_MAX_LENGTH`, `reason` trong hai schema |
| `apps/api/src/modules/attendance/attendance.codec.ts` | `AttendanceRecordRow.reason`, map sang response |
| `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts` | Test cho `reason` |
| `apps/api/src/modules/attendance/attendance.service.ts` | `resolveReason()` + ghi `reason` trong `mark()` |
| `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts` | Mock upsert trả `reason`, test luật `resolveReason` |
| `apps/web/features/attendance/components/member-attendance-card.tsx` | Ô nhập lý do + `handleSaveReason` |
| `apps/web/features/attendance/__tests__/member-attendance-card.test.tsx` | Fixture `reason`, test nhập/Enter/Escape |
| `apps/web/features/attendance/components/attendance-log-table.tsx` | Cột "Lý do" |
| `apps/web/features/attendance/__tests__/attendance-log-table.test.tsx` | Fixture `reason`, test cột mới |
| `apps/web/features/attendance/components/attendance-row.tsx` | Hiện lý do dưới badge ở ô chỉ-đọc |
| `apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts` | Fixture `RECORD` thêm `reason: null` |
| `docs/architecture.md` | Mô tả `AttendanceRecord` + dòng `POST /attendance` |

---

### Task 1: Cột `reason` — database, contract, codec

Không tách migration khỏi contract: sau khi `AttendanceRecordRow` có `reason`, service truyền hàng
Prisma vào codec, nên thiếu cột thì typecheck đỏ ngay. Task này để repo xanh trở lại trong một bước.

**Files:**
- Modify: `apps/api/prisma/schema.prisma:93-110`
- Create: `apps/api/prisma/migrations/<timestamp>_them_ly_do_vang/migration.sql` (Prisma sinh)
- Modify: `packages/shared/schemas/attendance.schema.ts`
- Modify: `apps/api/src/modules/attendance/attendance.codec.ts`
- Test: `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts`
- Modify (giữ typecheck xanh): `apps/web/features/attendance/__tests__/attendance-log-table.test.tsx:46-53`,
  `apps/web/features/attendance/__tests__/member-attendance-card.test.tsx:97-109`,
  `apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts:58-63`

**Interfaces:**
- Consumes: `attendanceRecordSchema`, `markAttendanceSchema` (đang có).
- Produces:
  - `ATTENDANCE_REASON_MAX_LENGTH: 255` từ `@guild/shared/schemas`
  - `MarkAttendanceInput.reason?: string | null`
  - `AttendanceRecord.reason: string | null`
  - `AttendanceRecordRow.reason: string | null`

- [ ] **Step 1: Viết test đỏ cho codec**

Thêm vào `apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts`, và thêm
`reason: null` vào hai object đã có trong file (cả input lẫn `toEqual` mong đợi):

```ts
  it('mang theo lý do vắng của câu trả lời "Không"', () => {
    expect(
      toAttendanceRecord({
        characterId: 'char-1',
        sessionId: 'session-sat',
        isPresent: false,
        markedAt: MARKED_AT,
        reason: 'Bận đi công tác',
      }),
    ).toEqual({
      characterId: 'char-1',
      sessionId: 'session-sat',
      isPresent: false,
      markedAt: '2026-07-22T05:00:00.000Z',
      reason: 'Bận đi công tác',
    });
  });
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter api test -- attendance.codec`
Expected: FAIL — `reason` không có trong `AttendanceRecordRow`, và `verifyResponse` không thấy trường
`reason` trong `attendanceRecordSchema`.

- [ ] **Step 3: Thêm cột vào Prisma**

Trong `apps/api/prisma/schema.prisma`, `model AttendanceRecord`, đặt ngay dưới `markByCharacterId`:

```prisma
  /// Why the member answered "Không". Null when isPresent = true, or when no reason was given.
  /// VarChar(255) so the business limit cannot be bypassed by any write path.
  reason              String?          @db.VarChar(255)
```

- [ ] **Step 4: Tạo migration**

Run: `pnpm --filter api prisma:migrate -- --name them_ly_do_vang`
Expected: sinh thư mục `<timestamp>_them_ly_do_vang` với `ALTER TABLE "AttendanceRecord" ADD COLUMN
"reason" VARCHAR(255);`. Cột nullable nên **không** có bước chuyển đổi dữ liệu viết tay; bảng đã tồn
tại nên **không** cần `ENABLE ROW LEVEL SECURITY`.

- [ ] **Step 5: Thêm `reason` vào contract dùng chung**

Trong `packages/shared/schemas/attendance.schema.ts`:

```ts
/** Longest absence reason accepted — mirrors `@db.VarChar(255)` on `AttendanceRecord.reason`. */
export const ATTENDANCE_REASON_MAX_LENGTH = 255;

/** Attendance payload for one character in one session (form + request body). */
export const markAttendanceSchema = z.object({
  characterId: z.string().min(1, "Thiếu thành viên."),
  sessionId: z.string().min(1, "Thiếu ngày đánh."),
  /** True = "Có" (đi đánh), false = "Không". */
  isPresent: z.boolean(),
  /**
   * Why the member answered "Không". Nullish rather than optional: sending `null` is how a stored
   * reason is cleared. The server ignores it when `isPresent` is true.
   */
  reason: z
    .string()
    .trim()
    .max(ATTENDANCE_REASON_MAX_LENGTH, "Lý do tối đa 255 ký tự.")
    .nullish(),
});
```

và trong `attendanceRecordSchema`, sau `markedAt`:

```ts
  /** Why the member answered "Không"; null for a "Có" answer or when none was given. */
  reason: z.string().nullable(),
```

- [ ] **Step 6: Cho codec mang `reason` ra response**

Trong `apps/api/src/modules/attendance/attendance.codec.ts`, thêm vào `AttendanceRecordRow`:

```ts
  reason: string | null;
```

và vào object trong `toAttendanceRecord`, sau `markedAt`:

```ts
    reason: row.reason,
```

- [ ] **Step 7: Vá các fixture đang thiếu `reason`**

Ba file test khác dựng `AttendanceRecord` bằng tay; thiếu trường mới là typecheck đỏ.

`apps/web/features/attendance/__tests__/attendance-log-table.test.tsx` — cho `makeRecords` nhận thêm
lý do tuỳ chọn:

```ts
function makeRecords(
  entries: Array<
    Pick<AttendanceRecord, "characterId" | "sessionId" | "isPresent"> & {
      reason?: string | null;
    }
  >
): Record<string, AttendanceRecord> {
  return Object.fromEntries(
    entries.map((entry) => [
      recordKey(entry.characterId, entry.sessionId),
      {
        ...entry,
        markedAt: "2026-08-24T10:00:00.000Z",
        reason: entry.reason ?? null,
      },
    ])
  );
}
```

`apps/web/features/attendance/__tests__/member-attendance-card.test.tsx` — cho `makeRecords` nhận
tham số thứ ba:

```ts
function makeRecords(
  sessionId: string,
  isPresent: boolean,
  reason: string | null = null
): Record<string, AttendanceRecord> {
  return {
    [recordKey(CHARACTER.id, sessionId)]: {
      characterId: CHARACTER.id,
      sessionId,
      isPresent,
      markedAt: "2026-08-24T10:00:00.000Z",
      reason,
    },
  };
}
```

`apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts` — thêm vào `RECORD`:

```ts
  reason: null,
```

- [ ] **Step 8: Chạy test cho nó xanh**

Run: `pnpm --filter api test -- attendance.codec && pnpm --filter web typecheck`
Expected: PASS cả hai.

- [ ] **Step 9: Commit**

```bash
git add apps/api/prisma packages/shared/schemas/attendance.schema.ts \
  apps/api/src/modules/attendance/attendance.codec.ts \
  apps/api/src/modules/attendance/__tests__/attendance.codec.spec.ts \
  apps/web/features/attendance/__tests__ \
  apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts
git commit -m "feat(api): store an absence reason on an attendance record"
```

---

### Task 2: Luật ghi `reason` trong `mark()`

**Files:**
- Modify: `apps/api/src/modules/attendance/attendance.service.ts`
- Test: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`
- Modify: `docs/architecture.md:294` và dòng `POST /attendance` trong bảng endpoint

**Interfaces:**
- Consumes: `MarkAttendanceInput.reason`, `AttendanceRecordRow.reason` (Task 1).
- Produces: `AttendanceService.mark()` ghi `reason` đã chuẩn hoá; chữ ký public **không đổi**.

- [ ] **Step 1: Sửa mock upsert để trả `reason`**

Mock hiện tại dựng record từ `args` nên thiếu `reason` là `verifyResponse` ném lỗi. Trong
`attendance.service.spec.ts`, đổi khối `upsert` (khoảng dòng 140-151) thành:

```ts
        .mockImplementation(
          (args: {
            create: { characterId: string; sessionId: string };
            update: { isPresent: boolean; markedAt: Date; reason: string | null };
          }) =>
            Promise.resolve({
              characterId: args.create.characterId,
              sessionId: args.create.sessionId,
              isPresent: args.update.isPresent,
              markedAt: args.update.markedAt,
              reason: args.update.reason,
            }),
        ),
```

- [ ] **Step 2: Viết test đỏ cho luật `reason`**

Thêm một `describe` mới vào `attendance.service.spec.ts`, ngang hàng với `describe('mark', …)`:

```ts
  describe('lý do vắng', () => {
    const SATURDAY = SESSION_IDS['Thứ 7 · Bang Chiến'];

    it('lưu lý do khi trả lời "Không"', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: false,
          reason: 'Bận đi công tác',
        },
        MEMBER,
      );

      expect(record.reason).toBe('Bận đi công tác');
    });

    it('bỏ lý do khi trả lời "Có", dù body có gửi', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: true,
          reason: 'Bận đi công tác',
        },
        MEMBER,
      );

      expect(record.reason).toBeNull();
    });

    it('lý do rỗng và không gửi lý do đều thành null', async () => {
      const empty = await service.mark(
        { characterId: CHARACTER_ID, sessionId: SATURDAY, isPresent: false, reason: '' },
        MEMBER,
      );
      const missing = await service.mark(
        { characterId: CHARACTER_ID, sessionId: SATURDAY, isPresent: false },
        MEMBER,
      );

      expect(empty.reason).toBeNull();
      expect(missing.reason).toBeNull();
    });

    it('ghi lý do vào cả nhánh tạo mới lẫn nhánh cập nhật của upsert', async () => {
      await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: false,
          reason: 'Ốm',
        },
        MEMBER,
      );

      const [args] = prisma.attendanceRecord.upsert.mock.calls[0] as [
        { create: { reason: string | null }; update: { reason: string | null } },
      ];
      expect(args.create.reason).toBe('Ốm');
      expect(args.update.reason).toBe('Ốm');
    });
  });
```

- [ ] **Step 3: Chạy test cho nó đỏ**

Run: `pnpm --filter api test -- attendance.service`
Expected: FAIL — `reason` là `undefined` trong record trả về (`mark()` chưa đọc tới nó).

- [ ] **Step 4: Cài đặt `resolveReason` và dùng trong `mark()`**

Trong `apps/api/src/modules/attendance/attendance.service.ts`, thêm hàm thuần ngay dưới hằng
`NOT_YOUR_CHARACTER`:

```ts
/**
 * The reason to persist alongside an answer.
 * A "Có" answer carries no reason, and an empty string is the same state as never having given one,
 * so both collapse to null — decided here rather than trusted from the request body, which keeps one
 * representation of "no reason" in the database.
 * @param isPresent - The answer being written
 * @param reason - Reason from the request body, already trimmed by Zod
 * @returns The reason to store, or null
 */
function resolveReason(
  isPresent: boolean,
  reason: string | null | undefined,
): string | null {
  if (isPresent) return null;

  return reason ? reason : null;
}
```

Trong `mark()`, đổi dòng destructure và khối `upsert`:

```ts
    const { characterId, sessionId, isPresent, reason } = input;
```

```ts
    const absenceReason = resolveReason(isPresent, reason);
    const record = await this.prisma.attendanceRecord.upsert({
      where: { characterId_sessionId: { characterId, sessionId } },
      create: {
        characterId,
        sessionId,
        isPresent,
        markedAt: now,
        markedByCharacterId: own,
        reason: absenceReason,
      },
      update: {
        isPresent,
        markedAt: now,
        markedByCharacterId: own,
        reason: absenceReason,
      },
    });
```

Cập nhật JSDoc của `mark()`: thêm dòng cho tham số mới trong `input` —
`Reason is stored only for a "Không" answer; a "Có" answer clears it.`

- [ ] **Step 5: Chạy test cho nó xanh**

Run: `pnpm --filter api test -- attendance`
Expected: PASS toàn bộ (cả `attendance.codec` lẫn `attendance.service`).

- [ ] **Step 6: Cập nhật docs**

`docs/architecture.md`, dòng mô tả `AttendanceRecord` trong bảng data model — nối vào cuối ô:

```
`reason` là câu giải thích (≤255 ký tự) đi kèm một câu trả lời "Không"; nó luôn `null` khi `isPresent = true`, và server tự quyết giá trị đó chứ không tin body.
```

Cùng file, dòng `POST /attendance` trong bảng endpoint — đổi cột mô tả thành:

```
| `POST` | `/attendance` | Mark one character for one match (kèm lý do khi trả lời "Không") | Bearer (own character; admin marks for anyone and bypasses the deadline) |
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/attendance docs/architecture.md
git commit -m "feat(api): clear the absence reason on a \"Có\" answer"
```

---

### Task 3: Ô nhập lý do trên màn điểm danh của member

**Files:**
- Modify: `apps/web/features/attendance/components/member-attendance-card.tsx`
- Test: `apps/web/features/attendance/__tests__/member-attendance-card.test.tsx`

**Interfaces:**
- Consumes: `ATTENDANCE_REASON_MAX_LENGTH`, `AttendanceRecord.reason` (Task 1); `useMarkAttendance()`
  (đang có, `mutateAsync` nhận `MarkAttendanceInput`).
- Produces: component nội bộ `AbsenceReasonInput` (không export ra ngoài file).

- [ ] **Step 1: Viết test đỏ**

Thêm vào `member-attendance-card.test.tsx`, trong `describe` đã có. `beforeEach` sẵn có đã reset
`records`, `sessions` và `markState.mutateAsync` trước mỗi test, nên mỗi test chỉ cần dựng lại phần
nó quan tâm. Ô nhập được tìm qua `aria-label` "Lý do vắng".

```ts
  it('hiện ô lý do khi câu trả lời đã lưu là "Không"', () => {
    sessions = [makeSession("sess-1")];
    records = makeRecords("sess-1", false, "Bận đi công tác");
    render(<MemberAttendanceCard />);

    const input = screen.getByLabelText("Lý do vắng") as HTMLInputElement;
    expect(input.value).toBe("Bận đi công tác");
    expect(input.maxLength).toBe(255);
  });

  it('không hiện ô lý do khi câu trả lời là "Có"', () => {
    sessions = [makeSession("sess-1")];
    records = makeRecords("sess-1", true);
    render(<MemberAttendanceCard />);

    expect(screen.queryByLabelText("Lý do vắng")).toBeNull();
  });

  it("Enter gửi lý do kèm câu trả lời Không", async () => {
    sessions = [makeSession("sess-1")];
    records = makeRecords("sess-1", false);
    markState.mutateAsync.mockResolvedValue(undefined);
    render(<MemberAttendanceCard />);

    const input = screen.getByLabelText("Lý do vắng");
    fireEvent.change(input, { target: { value: "  Ốm  " } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(markState.mutateAsync).toHaveBeenCalledWith({
      characterId: "char-1",
      sessionId: "sess-1",
      isPresent: false,
      reason: "Ốm",
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("Escape trả ô về giá trị đã lưu và không gửi gì", () => {
    sessions = [makeSession("sess-1")];
    records = makeRecords("sess-1", false, "Bận đi công tác");
    render(<MemberAttendanceCard />);

    const input = screen.getByLabelText("Lý do vắng") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "gõ nhầm" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(input.value).toBe("Bận đi công tác");
    expect(markState.mutateAsync).not.toHaveBeenCalled();
  });

  it("lưu lỗi thì giữ nguyên chữ đang gõ để không phải gõ lại", async () => {
    sessions = [makeSession("sess-1")];
    records = makeRecords("sess-1", false);
    markState.mutateAsync.mockRejectedValue(new ApiError("Đã quá hạn điểm danh ngày này.", 409));
    render(<MemberAttendanceCard />);

    const input = screen.getByLabelText("Lý do vắng") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Ốm" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(toastError).toHaveBeenCalledWith("Đã quá hạn điểm danh ngày này.");
    expect(input.value).toBe("Ốm");
  });

  it("ngày đã khoá thì chỉ hiện lý do dạng chữ, không có ô nhập", () => {
    sessions = [makeSession("sess-1", { isDeadlinePassed: true })];
    records = makeRecords("sess-1", false, "Bận đi công tác");
    render(<MemberAttendanceCard />);

    expect(screen.queryByLabelText("Lý do vắng")).toBeNull();
    expect(screen.getByText("Lý do: Bận đi công tác")).toBeTruthy();
  });
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- member-attendance-card`
Expected: FAIL — không tìm thấy phần tử có nhãn "Lý do vắng".

- [ ] **Step 3: Thêm component ô nhập**

Trong `member-attendance-card.tsx`, thêm import `useState` từ `react`, `Input` từ
`@/components/ui/input`, và `ATTENDANCE_REASON_MAX_LENGTH` từ `@guild/shared/schemas`. Đặt component
dưới `AttendanceChoiceButton`, cuối file:

```tsx
interface AbsenceReasonInputProps {
  /** Reason already stored for this session — "" when none was given */
  savedReason: string;
  /** A write is already in flight, so this one may not start */
  disabled: boolean;
  /** Send the typed reason; the caller performs the write and shows the toast */
  onSubmit: (reason: string) => void;
}

/**
 * The one-line reason that goes with a "Không" answer.
 *
 * Enter sends, Escape restores what is stored — blur does neither: leaving the field is something
 * that happens by accident, and here it would fire a request rather than touch a local draft the way
 * the team builder's name field does.
 * @returns The reason input
 */
function AbsenceReasonInput({
  savedReason,
  disabled,
  onSubmit,
}: AbsenceReasonInputProps) {
  const [value, setValue] = useState(savedReason);

  return (
    <Input
      value={value}
      disabled={disabled}
      aria-label="Lý do vắng"
      placeholder="Lý do vắng (tuỳ chọn)…"
      maxLength={ATTENDANCE_REASON_MAX_LENGTH}
      className="h-8 text-sm"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onSubmit(value);
          return;
        }
        if (event.key === "Escape") {
          setValue(savedReason);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
```

- [ ] **Step 4: Nối ô nhập vào tile**

Trong `MemberAttendanceCard`, thêm hàm ghi ngay dưới `handleMark`:

```tsx
  /**
   * Save the reason for a "Không" answer and report the outcome in a toast.
   * It reuses the attendance write, so the entry keeps one code path — and one deadline check.
   * @param battleSession - Session the reason belongs to
   * @param reason - Text typed by the member
   * @returns A promise settled once the toast is shown
   */
  const handleSaveReason = async (
    battleSession: BattleSession,
    reason: string
  ): Promise<void> => {
    if (!character) return;

    try {
      await mark({
        characterId: character.id,
        sessionId: battleSession.id,
        isPresent: false,
        reason: reason.trim() || null,
      });
      toastSuccess(`Đã lưu lý do cho ${battleSession.label}.`);
    } catch (error) {
      toastError(
        error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE
      );
    }
  };
```

Trong thân `battleSessions.map(...)`, ngay dưới dòng tính `current`, thêm:

```tsx
                  const savedReason =
                    recordMap[recordKey(character.id, battleSession.id)]
                      ?.reason ?? "";
```

Rồi đổi khối `<div className="mt-auto flex flex-col gap-2 pt-2">` thành:

```tsx
                      <div className="mt-auto flex flex-col gap-2 pt-2">
                        {battleSession.isDeadlinePassed ? (
                          <>
                            <span className="text-center text-sm text-muted-foreground">
                              Đã khoá
                            </span>
                            {savedReason !== "" && (
                              <span className="text-center text-sm text-muted-foreground italic">
                                Lý do: {savedReason}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {CHOICES.map((isPresent) => (
                              <AttendanceChoiceButton
                                key={String(isPresent)}
                                isPresent={isPresent}
                                isSelected={current === isPresent}
                                isSaving={
                                  isPending &&
                                  variables?.sessionId === battleSession.id &&
                                  variables.isPresent === isPresent
                                }
                                // Both answers of every day wait: a second write while one is in
                                // flight would leave the spinner on the wrong button.
                                disabled={isPending}
                                onSelect={() =>
                                  void handleMark(battleSession, isPresent)
                                }
                              />
                            ))}
                            {current === false && (
                              // Remounting on the stored value resets the field once a save lands,
                              // while a failed save keeps the typed text (the stored value did not
                              // change, so no remount).
                              <AbsenceReasonInput
                                key={`${battleSession.id}:${savedReason}`}
                                savedReason={savedReason}
                                disabled={isPending}
                                onSubmit={(reason) =>
                                  void handleSaveReason(battleSession, reason)
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
```

- [ ] **Step 5: Chạy test cho nó xanh**

Run: `pnpm --filter web test -- member-attendance-card`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/attendance/components/member-attendance-card.tsx \
  apps/web/features/attendance/__tests__/member-attendance-card.test.tsx
git commit -m "feat(web): let a member explain a \"Không\" answer"
```

---

### Task 4: Cột "Lý do" ở bảng Lịch sử điểm danh

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-log-table.tsx:36-45`, phần header và
  phần `renderRow`
- Test: `apps/web/features/attendance/__tests__/attendance-log-table.test.tsx`

**Interfaces:**
- Consumes: `AttendanceRecord.reason` (Task 1), `makeRecords` đã nhận `reason` (Task 1 Step 7).
- Produces: không có API mới.

- [ ] **Step 1: Viết test đỏ**

Trong `attendance-log-table.test.tsx`, thêm lý do vào một hàng của `RECORDS`:

```ts
const RECORDS = makeRecords([
  { characterId: "char-1", sessionId: "sess-1", isPresent: true },
  {
    characterId: "char-1",
    sessionId: "sess-2",
    isPresent: false,
    reason: "Bận đi công tác",
  },
  { characterId: "char-2", sessionId: "sess-1", isPresent: false },
  { characterId: "char-2", sessionId: "sess-2", isPresent: true },
]);
```

và thêm test:

```ts
  it("hiện lý do vắng, và dấu gạch khi không có", async () => {
    render(<AttendanceLogTable />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Bận đi công tác")).toBeTruthy();
    });
    expect(screen.getByRole("columnheader", { name: "Lý do" })).toBeTruthy();
    // Ba hàng còn lại không có lý do.
    expect(screen.getAllByText("—").length).toBe(3);
  });
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- attendance-log-table`
Expected: FAIL — không có columnheader "Lý do".

- [ ] **Step 3: Thêm cột**

Trong `attendance-log-table.tsx`, sửa hai hằng ở đầu file:

```tsx
/** Header column count: member, session, status, reason, marked-at. */
const COLUMN_COUNT = 5;

/** Per-column CSS classes, so the skeleton hides the same column as the header. */
const COLUMN_CLASSES = [
  undefined,
  undefined,
  undefined,
  undefined,
  MARKED_AT_COLUMN,
] as const;
```

Trong `<TableHeader>`, thêm giữa "Trạng thái" và "Thời gian điểm danh":

```tsx
              <TableHead>Lý do</TableHead>
```

Trong `renderRow`, thêm ô tương ứng ngay sau ô trạng thái:

```tsx
                    {/* A 255-character sentence would stretch the table, so the cell is capped and
                        the full text lives in the tooltip. */}
                    <TableCell className="max-w-56 text-muted-foreground">
                      <span
                        className="block truncate"
                        title={record.reason ?? undefined}
                      >
                        {record.reason ?? "—"}
                      </span>
                    </TableCell>
```

- [ ] **Step 4: Chạy test cho nó xanh**

Run: `pnpm --filter web test -- attendance-log-table`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/attendance/components/attendance-log-table.tsx \
  apps/web/features/attendance/__tests__/attendance-log-table.test.tsx
git commit -m "feat(web): show the absence reason in the attendance history"
```

---

### Task 5: Lý do trong lưới điểm danh của admin (chỉ đọc)

**Files:**
- Modify: `apps/web/features/attendance/components/attendance-row.tsx:78-100`
- Create: `apps/web/features/attendance/__tests__/attendance-row.test.tsx`

**Interfaces:**
- Consumes: `AttendanceRecord.reason` (Task 1), `AttendanceRow` (đang có, props không đổi).
- Produces: không có API mới. `AttendanceDraft` **giữ nguyên** `Record<string, boolean | undefined>` —
  lưới không cho sửa lý do.

- [ ] **Step 1: Viết test đỏ**

Tạo `apps/web/features/attendance/__tests__/attendance-row.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import { recordKey } from "../lib/record-key";
import { AttendanceRow } from "../components/attendance-row";

const CHARACTER: Character = {
  id: "char-1",
  name: "Mèo Mập",
  guildClass: GuildClass.CUU_LINH,
};

const SESSION: BattleSession = {
  id: "sess-1",
  label: "Trận sess-1",
  dateTime: "2026-08-24T20:00:00.000Z",
  deadline: "2026-08-24T03:00:00.000Z",
  isDeadlinePassed: false,
  isGuildWar: false,
  opponent: null,
  weekStart: "2026-08-24T00:00:00.000Z",
  attendanceCount: 0,
  hasFormation: false,
};

/**
 * Build the one-entry record map the row reads.
 * @param reason - Reason stored with the "Không" answer
 * @returns The records keyed the way the app keys them
 */
function makeRecordMap(reason: string | null): Record<string, AttendanceRecord> {
  return {
    [recordKey(CHARACTER.id, SESSION.id)]: {
      characterId: CHARACTER.id,
      sessionId: SESSION.id,
      isPresent: false,
      markedAt: "2026-08-24T10:00:00.000Z",
      reason,
    },
  };
}

/**
 * Render one row inside a table, with the props a read-only row needs.
 * @param reason - Reason stored with the answer
 * @param isEditing - Whether the row is in editing mode
 */
function renderRow(reason: string | null, isEditing = false) {
  render(
    <table>
      <tbody>
        <AttendanceRow
          character={CHARACTER}
          sessions={[SESSION]}
          recordMap={makeRecordMap(reason)}
          lockedSessionIds={new Set<string>()}
          allLocked={false}
          isEditing={isEditing}
          isSaving={false}
          draft={{}}
          onStartEdit={vi.fn()}
          onDraftChange={vi.fn()}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </tbody>
    </table>
  );
}

afterEach(cleanup);

describe("AttendanceRow", () => {
  it("hiện lý do vắng dưới trạng thái ở ô chỉ đọc", () => {
    renderRow("Bận đi công tác");

    expect(screen.getByText("Bận đi công tác")).toBeTruthy();
  });

  it("không hiện gì thêm khi bản ghi không có lý do", () => {
    renderRow(null);

    expect(screen.queryByText("Bận đi công tác")).toBeNull();
  });

  it("ô đang sửa không hiện lý do cũ", () => {
    renderRow("Bận đi công tác", true);

    expect(screen.queryByText("Bận đi công tác")).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- attendance-row`
Expected: FAIL ở test đầu — không tìm thấy chữ "Bận đi công tác".

- [ ] **Step 3: Hiện lý do dưới badge**

Trong `attendance-row.tsx`, đổi thân của `sessions.map(...)`:

```tsx
      {sessions.map((session) => {
        const currentRecord = recordMap[recordKey(character.id, session.id)];
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
              <div className="flex flex-col items-center gap-0.5">
                <StatusBadge isPresent={currentRecord?.isPresent} />
                {/* Read-only on purpose: the reason is the absent member's own words, and the grid
                    would have to carry a draft string per cell to let an admin edit it. */}
                {currentRecord?.reason && (
                  <span
                    className="block max-w-32 truncate text-xs text-muted-foreground"
                    title={currentRecord.reason}
                  >
                    {currentRecord.reason}
                  </span>
                )}
              </div>
            )}
          </TableCell>
        );
      })}
```

- [ ] **Step 4: Chạy test cho nó xanh**

Run: `pnpm --filter web test -- attendance-row`
Expected: PASS cả ba.

- [ ] **Step 5: Chạy toàn bộ và kiểm tra kiểu**

Run:
```bash
pnpm --filter api test && pnpm --filter web test && \
pnpm --filter api typecheck && pnpm --filter web typecheck
```
Expected: PASS hết.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/attendance/components/attendance-row.tsx \
  apps/web/features/attendance/__tests__/attendance-row.test.tsx
git commit -m "feat(web): show the absence reason in the admin attendance grid"
```
