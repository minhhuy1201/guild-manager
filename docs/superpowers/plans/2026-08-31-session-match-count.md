# Số trận của một ngày đánh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi ngày đánh mang số trận của riêng nó — scrim mặc định 2 và admin chỉnh được, Bang Chiến xen kẽ 2/1 theo tuần do hệ thống tính — và con số đó hiện thành badge sau nhãn ngày đánh ở mọi màn hình.

**Architecture:** Thêm cột `matchCount` vào `BattleSession`. Luật xen kẽ của Bang Chiến là một hàm thuần trong `session-schedule.ts`, đi đúng con đường `deadline` đang đi: hệ thống ghi đè ở mỗi lần materialize, PATCH gửi lên là 400. `matchCount` là **trần trên** của số `FormationMatch`, không phải mệnh lệnh — team-builder giữ nguyên nút "Tạo trận 2", chỉ bị chặn khi ngày đó chỉ có 1 trận.

**Tech Stack:** NestJS + Prisma (PostgreSQL) ở `apps/api`, Next.js + TanStack Query + Zustand ở `apps/web`, Zod dùng chung ở `packages/shared`. Test: Jest (api), Vitest (web).

**Spec:** [`docs/superpowers/specs/2026-08-31-session-match-count-design.md`](../specs/2026-08-31-session-match-count-design.md)

## Global Constraints

- Nhánh làm việc: `feat/session-match-count`. **Không** commit thẳng lên `main`.
- Commit message tiếng Anh, Conventional Commits, không có dòng attribution ở cuối.
- Comment và tên file bằng tiếng Anh; nội dung file trong `docs/superpowers` bằng tiếng Việt.
- Mọi hàm mới có doc comment tiếng Anh nêu mục đích, từng tham số và giá trị trả về.
- `packages/shared` là nơi duy nhất khai báo shape đi qua mạng. Sau khi sửa nó phải chạy
  `pnpm --filter @guild/shared build` trước khi API/web đọc được ở runtime (script `test` của cả hai app tự chạy sẵn qua `pretest`).
- Số trận hợp lệ: **1 hoặc 2**. `MATCH_COUNT_MIN = 1`, `MATCH_COUNT_MAX = 2`,
  `MATCH_COUNT_MESSAGE = "Một ngày đánh 1 hoặc 2 trận."`
- Mốc xen kẽ Bang Chiến: `new Date('2026-08-31T00:00:00+07:00')` — tuần đó đánh **2** trận.
- Câu lỗi khi PATCH Bang Chiến kèm `matchCount`:
  `"Số trận của Bang Chiến do hệ thống tính theo tuần, không sửa được."`
- Câu lỗi 409 khi lưu quá số đội hình:
  `` `Ngày này chỉ đánh ${matchCount} trận, không xếp được nhiều đội hình hơn.` ``
- Mọi thời điểm tính theo giờ Việt Nam cố định UTC+7, qua `packages/shared/lib/vn-time.ts`.
- Database local phải đang chạy trước khi migrate: `pnpm --filter api db:up`.

## File Structure

**Tạo mới:**

| File | Trách nhiệm |
|---|---|
| `apps/api/prisma/migrations/<timestamp>_them_so_tran_cho_ngay_danh/migration.sql` | Thêm cột `matchCount` + backfill từ `FormationMatch` |
| `apps/web/features/settings/components/match-count-field.tsx` | Ô chọn số trận, và dòng chỉ đọc cho Bang Chiến |
| `apps/web/features/settings/components/reduce-match-count-dialog.tsx` | Dialog xác nhận trước khi hạ số trận làm mất đội hình |
| `apps/web/features/settings/lib/match-count.ts` | Hàm thuần: hạ số trận này có làm mất đội hình không |
| `apps/web/features/settings/components/__tests__/session-form-dialog.test.tsx` | Test form thiết lập |
| `apps/web/features/team-builder/components/__tests__/match-tabs.test.tsx` | Test số tab và `canAddMatch` |

**Sửa:**

| File | Thay đổi |
|---|---|
| `apps/api/prisma/schema.prisma` | Cột `matchCount Int @default(2)` trên `BattleSession` |
| `apps/api/src/modules/battle-sessions/session-schedule.ts` | `guildWarMatchCount()` + mốc xen kẽ |
| `apps/api/src/modules/battle-sessions/battle-sessions.codec.ts` | Trả `matchCount`, `formationMatchCount` |
| `apps/api/src/modules/battle-sessions/battle-sessions.service.ts` | create/update/ensureGuildWar + transaction xoá đội hình thừa |
| `apps/api/src/modules/battle-sessions/battle-sessions.public.ts` | Export `guildWarMatchCount` nếu team-builder cần |
| `apps/api/src/modules/team-builder/team-builder.service.ts` | `matchCount` vào `SessionFormation`, chốt 409 |
| `packages/shared/schemas/battle-session.schema.ts` | `matchCount`, `formationMatchCount`, hằng số |
| `packages/shared/schemas/formation.schema.ts` | `matchCount` vào `sessionFormationSchema` |
| `apps/web/components/shared/session-label.tsx` | Badge số trận |
| `apps/web/features/settings/components/session-form-dialog.tsx` | Ô số trận + luồng xác nhận |
| `apps/web/features/settings/components/delete-session-dialog.tsx` | `hasFormation` → `formationMatchCount > 0` |
| `apps/web/features/team-builder/hooks/use-formation-draft.ts` | `canAddMatch` bám `matchCount` của ngày |
| `docs/architecture.md` | §5 bảng data model, §6 luật thời gian |

---

### Task 1: Cột `matchCount` và migration có backfill

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model `BattleSession`)
- Create: `apps/api/prisma/migrations/<timestamp>_them_so_tran_cho_ngay_danh/migration.sql`

**Interfaces:**
- Consumes: không có.
- Produces: cột `BattleSession.matchCount: number` (NOT NULL, DEFAULT 2) và trường cùng tên trong Prisma Client sinh ra tại `apps/api/src/generated/prisma`.

Task này không có test tự động — nó là một thay đổi schema. Kiểm chứng bằng `prisma migrate status` và `typecheck`.

- [ ] **Step 1: Bật database local**

```bash
pnpm --filter api db:up
```

- [ ] **Step 2: Thêm cột vào schema**

Trong `apps/api/prisma/schema.prisma`, model `BattleSession`, chèn ngay dưới dòng `isGuildWar`:

```prisma
  /// How many matches are played on this day, 1 or 2. The cap lives in Zod, not here — the same
  /// rule FormationMatch.matchIndex follows. Scrim: an admin's value, defaulting to 2.
  /// Guild War: system-owned, alternating 2/1 per week (see session-schedule.ts).
  matchCount Int      @default(2)
```

- [ ] **Step 3: Sinh migration nhưng chưa chạy**

```bash
pnpm --filter api prisma:migrate -- --create-only --name them_so_tran_cho_ngay_danh
```

- [ ] **Step 4: Thêm bước backfill viết tay vào file migration vừa sinh**

Mở `apps/api/prisma/migrations/<timestamp>_them_so_tran_cho_ngay_danh/migration.sql` và thêm vào **cuối** file, sau câu `ALTER TABLE` Prisma đã sinh:

```sql
-- Backfill: a day that already has formations knows its own match count. Days with no formation
-- keep the default of 2. Guild War rows correct themselves on the next ensureGuildWar().
UPDATE "BattleSession" s
SET "matchCount" = c.n
FROM (
  SELECT "sessionId", COUNT(*)::int AS n
  FROM "FormationMatch"
  GROUP BY "sessionId"
) c
WHERE c."sessionId" = s.id;
```

- [ ] **Step 5: Chạy migration và sinh lại client**

```bash
pnpm --filter api prisma:migrate
pnpm --filter api prisma:status
```

Expected: `prisma:status` báo database đã đồng bộ, không còn migration nào chờ.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter api typecheck
```

Expected: PASS. Cột mới chưa được đọc ở đâu nên không có lỗi.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(battle-sessions): add a matchCount column to the battle session"
```

---

### Task 2: `guildWarMatchCount` — luật xen kẽ theo tuần

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Interfaces:**
- Consumes: `WeekAnchor` và `weekStartOf()` đã có trong cùng file.
- Produces: `export function guildWarMatchCount(weekStart: Date): number` — trả 2 hoặc 1.

- [ ] **Step 1: Viết test đỏ**

Trong `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`, thêm `guildWarMatchCount` vào danh sách import ở đầu file (giữ thứ tự alphabet: sau `guildWarDateTime`, trước `guildWarSessionId`), rồi thêm khối này vào trong `describe('session-schedule', ...)`:

```ts
  describe('số trận của Bang Chiến xen kẽ theo tuần', () => {
    // Mốc là Thứ 2 2026-08-31 — tuần đó đánh 2 trận, rồi cứ một tuần 1 trận, một tuần 2 trận.
    it('tuần mốc đánh 2 trận', () => {
      expect(guildWarMatchCount(vn('2026-08-31T00:00'))).toBe(2);
    });

    it('tuần kế tiếp đánh 1 trận', () => {
      expect(guildWarMatchCount(vn('2026-09-07T00:00'))).toBe(1);
    });

    it('hai tuần sau mốc quay lại 2 trận', () => {
      expect(guildWarMatchCount(vn('2026-09-14T00:00'))).toBe(2);
    });

    it('tuần ngay trước mốc đánh 1 trận', () => {
      expect(guildWarMatchCount(vn('2026-08-24T00:00'))).toBe(1);
    });

    it('hai tuần trước mốc đánh 2 trận', () => {
      expect(guildWarMatchCount(vn('2026-08-17T00:00'))).toBe(2);
    });

    // 2026-01-05 cách mốc đúng 34 tuần về trước — số chẵn, và là số ÂM. Đây là ca dễ viết sai:
    // `%` trong JavaScript giữ dấu của số bị chia.
    it('tuần quá khứ xa vẫn tính chẵn/lẻ đúng dù số tuần lệch là số âm', () => {
      expect(guildWarMatchCount(vn('2026-01-05T00:00'))).toBe(2);
      expect(guildWarMatchCount(vn('2026-01-12T00:00'))).toBe(1);
    });
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter api test -- session-schedule
```

Expected: FAIL — `guildWarMatchCount is not a function` (hoặc lỗi TypeScript "has no exported member").

- [ ] **Step 3: Viết implementation tối thiểu**

Trong `apps/api/src/modules/battle-sessions/session-schedule.ts`, thêm các hằng số này cạnh `GUILD_WAR_HOUR`:

```ts
/** Milliseconds in a week — the alternation counts whole weeks between two Monday markers. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Monday 00:00 Vietnam time of the week the Guild War alternation is anchored to.
 * Written with the `+07:00` offset rather than `Z`: the constant talks about a Monday on the
 * Vietnamese clock, and writing it that way spares every reader the mental subtraction.
 */
const GUILD_WAR_MATCH_COUNT_ANCHOR = new Date('2026-08-31T00:00:00+07:00');

/** Matches played in the anchor week and every second week from it. */
const GUILD_WAR_MATCH_COUNT_EVEN = 2;

/** Matches played in the weeks in between. */
const GUILD_WAR_MATCH_COUNT_ODD = 1;
```

Rồi thêm hàm, đặt ngay dưới `guildWarDateTime`:

```ts
/**
 * How many matches a week's Guild War is played over: 2, then 1, then 2 again.
 *
 * `Math.abs` before the parity test rather than a bare `weeks % 2 === 0`: a past week gives a
 * NEGATIVE delta, and `%` in JavaScript keeps the sign of the dividend, so the parity has to be
 * computed off a magnitude to be right for reasons a reader can see.
 * @param weekStart - Monday 00:00 Vietnam time of the week
 * @returns 2 for the anchor week and every second week from it, 1 for the weeks between
 */
export function guildWarMatchCount(weekStart: Date): number {
  const weeksFromAnchor = Math.round(
    (weekStart.getTime() - GUILD_WAR_MATCH_COUNT_ANCHOR.getTime()) / WEEK_MS,
  );

  return Math.abs(weeksFromAnchor) % 2 === 0
    ? GUILD_WAR_MATCH_COUNT_EVEN
    : GUILD_WAR_MATCH_COUNT_ODD;
}
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```bash
pnpm --filter api test -- session-schedule
```

Expected: PASS, toàn bộ file.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/battle-sessions/session-schedule.ts apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts
git commit -m "feat(battle-sessions): derive the guild war match count from its week"
```

---

### Task 3: Contract dùng chung và codec

**Files:**
- Modify: `packages/shared/schemas/battle-session.schema.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.codec.ts`
- Modify: `apps/web/features/settings/components/delete-session-dialog.tsx:27`
- Test: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.codec.spec.ts`

**Interfaces:**
- Consumes: cột `matchCount` từ Task 1.
- Produces:
  - `MATCH_COUNT_MIN: 1`, `MATCH_COUNT_MAX: 2`, `MATCH_COUNT_MESSAGE: string` từ `@guild/shared/schemas`.
  - `BattleSession` có thêm `matchCount: number` và `formationMatchCount: number`; **không còn** `hasFormation`.
  - `CreateBattleSessionInput.matchCount: number` (bắt buộc), `UpdateBattleSessionInput.matchCount?: number`.
  - `SessionRow._count` không đổi; `toBattleSession(row, now)` giữ nguyên chữ ký.

- [ ] **Step 1: Viết test đỏ cho codec**

Trong `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.codec.spec.ts`, thêm `matchCount: 2,` vào object `ROW` (ngay dưới `isGuildWar`), rồi **thay** test `'rút số liệu phụ ra khỏi `_count`'` bằng:

```ts
  it('rút số liệu phụ ra khỏi `_count`', () => {
    const entity = toBattleSession(ROW, new Date('2026-07-22T05:00:00.000Z'));

    expect(entity.attendanceCount).toBe(3);
    expect(entity.formationMatchCount).toBe(0);
  });

  it('trả số trận của ngày đánh và số đội hình đã xếp như hai con số khác nhau', () => {
    const entity = toBattleSession(
      { ...ROW, matchCount: 2, _count: { attendanceRecords: 3, formationMatches: 1 } },
      new Date('2026-07-22T05:00:00.000Z'),
    );

    expect(entity.matchCount).toBe(2);
    expect(entity.formationMatchCount).toBe(1);
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter api test -- battle-sessions.codec
```

Expected: FAIL — `formationMatchCount` là `undefined`, và TypeScript báo `matchCount` không có trên `SessionRow`.

- [ ] **Step 3: Sửa contract dùng chung**

Trong `packages/shared/schemas/battle-session.schema.ts`:

Thêm hằng số ngay dưới `INVALID_WEEK_MESSAGE`:

```ts
/** A day is played over 1 or 2 matches. Both bounds and the message are shared by the schema, the service and the form. */
export const MATCH_COUNT_MIN = 1;
export const MATCH_COUNT_MAX = 2;

/** Message shown when the match count falls outside its bounds. */
export const MATCH_COUNT_MESSAGE = "Một ngày đánh 1 hoặc 2 trận.";
```

Thêm trường vào `battleSessionFields`, ngay dưới `deadline`:

```ts
  /** How many matches are played on this day, 1 or 2 */
  matchCount: z
    .number()
    .int(MATCH_COUNT_MESSAGE)
    .min(MATCH_COUNT_MIN, MATCH_COUNT_MESSAGE)
    .max(MATCH_COUNT_MAX, MATCH_COUNT_MESSAGE),
```

Trong `battleSessionSchema`, thêm `matchCount` và **thay** `hasFormation`:

```ts
  /** How many matches are played on this day. Guild War: system-owned, alternating per week. */
  matchCount: z.number(),
  /** How many formations have been laid out for this day — never more than `matchCount`. */
  formationMatchCount: z.number(),
```

(xoá dòng `hasFormation: z.boolean(),` và doc comment của nó)

- [ ] **Step 4: Sửa codec**

Trong `apps/api/src/modules/battle-sessions/battle-sessions.codec.ts`, thêm `matchCount: number;` vào `SessionRow` (dưới `isGuildWar`), rồi trong `toBattleSession` thay dòng `hasFormation` bằng hai dòng:

```ts
    matchCount: row.matchCount,
    formationMatchCount: row._count.formationMatches,
```

- [ ] **Step 5: Sửa chỗ duy nhất đang đọc `hasFormation`**

Trong `apps/web/features/settings/components/delete-session-dialog.tsx`, đổi dòng 27:

```ts
  if (session.formationMatchCount > 0) losses.push("1 đội hình đã xếp");
```

- [ ] **Step 6: Build shared rồi chạy test**

```bash
pnpm --filter @guild/shared build
pnpm --filter api test -- battle-sessions.codec
```

Expected: PASS.

- [ ] **Step 7: Cập nhật các fixture test bên web đang mang `hasFormation`**

Năm file dưới đây có dòng `hasFormation: false,` trong fixture. Ở mỗi file, thay dòng đó bằng `formationMatchCount: 0,` và thêm `matchCount: 2,` ngay trên nó:

- `apps/web/features/attendance/__tests__/attendance-log-table.test.tsx:35`
- `apps/web/features/attendance/__tests__/member-attendance-card.test.tsx:86`
- `apps/web/features/attendance/__tests__/attendance-history-filters.test.tsx:55`
- `apps/web/features/attendance/__tests__/attendance-grid.test.tsx:50`
- `apps/web/features/attendance/__tests__/attendance-row.test.tsx:30`

Làm y hệt ở `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts` (hai chỗ, dòng 68 và 79).

- [ ] **Step 8: Chạy typecheck cả hai app**

```bash
pnpm --filter api typecheck && pnpm --filter web typecheck
```

Expected: PASS. Nếu còn lỗi ở `battle-sessions.service.ts` vì `create` thiếu `matchCount`, **để nguyên** — Task 4 xử lý; nhưng nếu muốn commit sạch thì làm Task 4 trước khi commit và gộp hai commit.

- [ ] **Step 9: Commit**

```bash
git add packages/shared apps/api/src/modules/battle-sessions apps/api/src/modules/attendance/__tests__ apps/web/features
git commit -m "feat(shared): carry the match count and the formation count on a battle session"
```

---

### Task 4: Service — ghi, ghi đè, và xoá đội hình thừa

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`

**Interfaces:**
- Consumes: `guildWarMatchCount()` (Task 2), `CreateBattleSessionInput.matchCount` (Task 3).
- Produces: `BattleSessionsService.create/update` xử lý `matchCount`; `ensureGuildWar` ghi `matchCount` ở cả `create` lẫn `update` của upsert.

- [ ] **Step 1: Viết test đỏ**

Trong `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`:

Thêm `matchCount: 2,` vào hàm `row()` (dưới `isGuildWar`), và thêm `formationMatch: { deleteMany: jest.Mock }` vào type của `prisma`, khởi tạo trong `beforeEach`:

```ts
      formationMatch: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
```

Thêm `matchCount: 2,` vào **mọi** lời gọi `service.create({ … })` đang có trong file (chúng sẽ không typecheck nếu thiếu).

Rồi thêm các test mới:

```ts
  describe('số trận', () => {
    it('lưu số trận admin chọn khi tạo scrim', async () => {
      await service.create({
        dateTime: vn('2026-07-21T20:30').toISOString(),
        deadline: vn('2026-07-21T10:00').toISOString(),
        matchCount: 1,
      });

      expect(firstArg(prisma.battleSession.create, 0)).toMatchObject({
        data: { matchCount: 1 },
      });
    });

    it('ghi đè số trận của Bang Chiến theo luật xen kẽ, cả khi tạo lẫn khi đã tồn tại', async () => {
      // Tuần 2026-08-31 là mốc → 2 trận; tuần 2026-09-07 → 1 trận.
      await makeService(vn('2026-09-02T12:00')).listByWeek();

      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        create: { matchCount: 2 },
        update: { matchCount: 2 },
      });

      await makeService(vn('2026-09-09T12:00')).listByWeek();

      expect(firstArg(prisma.battleSession.upsert, 1)).toMatchObject({
        create: { matchCount: 1 },
        update: { matchCount: 1 },
      });
    });

    it('từ chối sửa số trận của Bang Chiến', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
      );

      await expect(service.update('gw-2026-07-20', { matchCount: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('hạ số trận thì xoá đội hình vượt trần, trong cùng transaction với lệnh update', async () => {
      await service.update('session-tue', { matchCount: 1 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(firstArg(prisma.formationMatch.deleteMany, 0)).toMatchObject({
        where: { sessionId: 'session-tue', matchIndex: { gt: 1 } },
      });
      expect(firstArg(prisma.battleSession.update, 0)).toMatchObject({
        data: { matchCount: 1 },
      });
    });

    it('không đụng vào đội hình khi số trận giữ nguyên hoặc tăng', async () => {
      await service.update('session-tue', { matchCount: 2 });

      expect(prisma.formationMatch.deleteMany).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter api test -- battle-sessions.service
```

Expected: FAIL — `matchCount` không có trong data gửi cho Prisma, `deleteMany` không được gọi, và update Bang Chiến không ném lỗi.

- [ ] **Step 3: Viết implementation**

Trong `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`:

Thêm `guildWarMatchCount` vào import từ `./session-schedule`.

Trong `create`, thêm vào object `data`:

```ts
        matchCount: input.matchCount,
```

Trong `ensureGuildWar`, thêm vào cả `create` lẫn `update` của upsert:

```ts
    const matchCount = guildWarMatchCount(weekStart);
```

```ts
      create: {
        id: guildWarSessionId(weekStart),
        weekStart,
        dateTime,
        deadline: guildWarDeadline(weekStart),
        matchCount,
        isGuildWar: true,
      },
      // The battle time is left alone — an admin may have moved it. The deadline and the match
      // count are the opposite: the system owns them, so a legacy row breaking the rule corrects
      // itself.
      update: { deadline: guildWarDeadline(weekStart), matchCount },
```

Trong `update`, ngay dưới khối từ chối `deadline` của Bang Chiến, thêm khối song song:

```ts
    if (current.isGuildWar && input.matchCount !== undefined) {
      throw new BadRequestException(
        'Số trận của Bang Chiến do hệ thống tính theo tuần, không sửa được.',
      );
    }
```

Rồi, sau khi đã tính xong `deadline`, quyết định `matchCount` và ghi trong một transaction. Thay khối `const updated = await this.prisma.battleSession.update({…})` bằng:

```ts
    // A Guild War's match count follows the week it now sits in, exactly like its deadline.
    const matchCount = current.isGuildWar
      ? guildWarMatchCount(weekStart)
      : (input.matchCount ?? current.matchCount);

    // One transaction, not two statements: between them the day would claim one match while still
    // holding two formations — the very state `saveFormation` refuses.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (matchCount < current.matchCount) {
        await tx.formationMatch.deleteMany({
          where: { sessionId: id, matchIndex: { gt: matchCount } },
        });
      }

      return tx.battleSession.update({
        where: { id },
        data: { dateTime, deadline, opponent, weekStart, matchCount },
        include: SESSION_INCLUDE,
      });
    });
```

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```bash
pnpm --filter api test -- battle-sessions
```

Expected: PASS toàn bộ, cả `.service`, `.codec` và `.controller`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/battle-sessions
git commit -m "feat(battle-sessions): persist the match count and trim formations when it drops"
```

---

### Task 5: Team-builder — `matchCount` ra response và chốt trần 409

**Files:**
- Modify: `packages/shared/schemas/formation.schema.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts` (`ScheduledSession`, `readWeekSessions`)
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: `BattleSession.matchCount` (Task 3), `ScheduledSession` từ `battle-sessions.public`.
- Produces: `SessionFormation.matchCount: number`; `saveFormation` ném `ConflictException` khi `matches.length > session.matchCount`.

- [ ] **Step 1: Viết test đỏ**

Trong `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`:

Thêm `matchCount: 2,` vào **cả ba** phần tử của `SCHEDULED_SESSIONS` (module scope, dòng ~23) — `getFormations` sẽ đọc trường này.

Trong `describe('TeamBuilderService.saveFormation', …)`, fixture của `battleSessions.findById` đang nằm inline trong `beforeEach`. Tách nó ra một hằng số ngay trên `describe` đó để các test ghi đè được:

```ts
/** The battle day `saveFormation` writes to, as `battleSessions.findById` returns it. */
const SAVED_DAY = {
  id: 'session-thu',
  label: 'Thứ 5 · 20:30',
  dateTime: vn('2026-07-23T20:30').toISOString(),
  opponent: 'Thiên Nhẫn Giáo',
  isGuildWar: false,
  weekStart: WEEK_START.toISOString(),
  matchCount: 2,
};
```

rồi trong `beforeEach` đổi thành `findById: jest.fn().mockResolvedValue(SAVED_DAY),`.

Thêm các test mới vào cuối `describe('TeamBuilderService.saveFormation', …)`:

```ts
  describe('số trận là trần trên của số đội hình', () => {
    it('từ chối lưu 2 đội hình cho ngày chỉ đánh 1 trận', async () => {
      battleSessions.findById.mockResolvedValue({ ...SAVED_DAY, matchCount: 1 });

      await expect(
        service.saveFormation('session-thu', [
          { slots: {}, notes: {} },
          { slots: {}, notes: {} },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('cho lưu 1 đội hình cho ngày đánh 2 trận — cả hai trận dùng chung', async () => {
      const saved = await service.saveFormation('session-thu', [
        { slots: {}, notes: {} },
      ]);

      expect(saved.matches).toHaveLength(1);
      expect(saved.matchCount).toBe(2);
    });
  });
```

`ConflictException` đã được import sẵn ở đầu file.

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter api test -- team-builder.service
```

Expected: FAIL — không có exception nào được ném, và `saved.matchCount` là `undefined`.

- [ ] **Step 3: Thêm `matchCount` vào contract của team-builder**

Trong `packages/shared/schemas/formation.schema.ts`, thêm vào `sessionFormationSchema` ngay dưới `isGuildWar`:

```ts
  /** How many matches are played on this day — the ceiling on how many formations it may hold */
  matchCount: z.number(),
```

- [ ] **Step 4: Mang `matchCount` qua `readWeekSessions`**

Trong `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`, thêm vào interface `ScheduledSession`:

```ts
  matchCount: number;
```

rồi vào `select` của `readWeekSessions` (`matchCount: true,`) và vào object trả về (`matchCount: row.matchCount,`).

- [ ] **Step 5: Viết implementation trong team-builder**

Trong `apps/api/src/modules/team-builder/team-builder.service.ts`:

Ở `getFormations`, thêm vào object dựng `sessionFormationSchema`:

```ts
        matchCount: session.matchCount,
```

Ở `saveFormation`, ngay sau khối kiểm `isSessionLocked`, thêm chốt trần:

```ts
    // The day decides how many matches are played; the payload only decides how many formations are
    // laid out for them. One formation for a two-match day is normal — both matches use it. More
    // formations than matches is not.
    if (matches.length > session.matchCount) {
      throw new ConflictException(
        `Ngày này chỉ đánh ${session.matchCount} trận, không xếp được nhiều đội hình hơn.`,
      );
    }
```

và thêm `matchCount: session.matchCount,` vào object `verifyResponse(sessionFormationSchema, …)` ở cuối hàm.

- [ ] **Step 6: Chạy test để chắc chắn nó xanh**

```bash
pnpm --filter @guild/shared build && pnpm --filter api test
```

Expected: PASS toàn bộ suite của API.

- [ ] **Step 7: Commit**

```bash
git add packages/shared apps/api/src/modules
git commit -m "feat(team-builder): cap the formations of a day at its match count"
```

---

### Task 6: Badge số trận trong `SessionLabel`

**Files:**
- Modify: `apps/web/components/shared/session-label.tsx`
- Test: `apps/web/components/shared/__tests__/session-label.test.tsx`

**Interfaces:**
- Consumes: `BattleSession.matchCount` (Task 3).
- Produces: `SessionLabelProps.session` mở rộng thành `Pick<BattleSession, "label" | "isGuildWar" | "matchCount">`.

- [ ] **Step 1: Viết test đỏ**

Trong `apps/web/components/shared/__tests__/session-label.test.tsx`, thêm `matchCount` vào hai fixture ở đầu file:

```ts
const GUILD_WAR = { label: "Thứ 7 · Bang Chiến", isGuildWar: true, matchCount: 2 };
const SCRIM = { label: "Thứ 3 · 20:30", isGuildWar: false, matchCount: 1 };
```

Sửa hai assertion `toBe` đang so văn bản cả hàng thành `toContain`, vì badge giờ nằm trong cùng hàng đó:

```ts
    expect(row.textContent).toContain("Thứ 7 · Bang Chiến");
```

```ts
    expect(row.textContent).toContain("Thứ 7 · Bang ChiếnĐã khoá");
```

Rồi thêm test mới:

```ts
  it("hiện số trận ngay sau nhãn", () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} />);

    expect(row.textContent).toContain("2 trận");
  });

  it('ngày 1 trận cũng hiện badge — "không thấy gì" không được phép có hai nghĩa', () => {
    const row = renderRow(<SessionLabel session={SCRIM} />);

    expect(row.textContent).toContain("1 trận");
  });

  it("children vẫn đứng sau badge", () => {
    const row = renderRow(
      <SessionLabel session={SCRIM}>
        <span>Đã khoá</span>
      </SessionLabel>
    );

    expect(row.textContent).toBe("Thứ 3 · 20:301 trậnĐã khoá");
  });
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter web test -- session-label
```

Expected: FAIL — `textContent` không chứa "2 trận".

- [ ] **Step 3: Viết implementation**

Trong `apps/web/components/shared/session-label.tsx`:

Đổi kiểu của prop `session`:

```ts
  /** Battle to show; its label, its Guild War flag and its match count are read */
  session: Pick<BattleSession, "label" | "isGuildWar" | "matchCount">;
```

Thêm hằng số cạnh `GUILD_WAR_TINT`:

```ts
/** Badge classes for the match count, kept beside the label they belong with. */
const MATCH_COUNT_BADGE =
  "rounded-full border px-1.5 py-0.5 text-[0.6875rem] font-normal leading-none text-muted-foreground";
```

Rồi chèn badge giữa nhãn và `children`:

```tsx
      {session.label}
      <span className={MATCH_COUNT_BADGE}>{session.matchCount} trận</span>
      {children}
```

Cập nhật doc comment của component để nhắc badge là một phần của hàng.

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```bash
pnpm --filter web test -- session-label
```

Expected: PASS.

- [ ] **Step 5: Chạy cả suite web để bắt các fixture còn thiếu `matchCount`**

```bash
pnpm --filter web test && pnpm --filter web typecheck
```

Expected: PASS. Nếu file test nào báo thiếu `matchCount` trong fixture session, thêm `matchCount: 2` vào fixture đó.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/shared
git commit -m "feat(web): show the match count beside the session label"
```

---

### Task 7: Ô "Số trận" ở `/thiet-lap`

**Files:**
- Create: `apps/web/features/settings/components/match-count-field.tsx`
- Create: `apps/web/features/settings/components/reduce-match-count-dialog.tsx`
- Create: `apps/web/features/settings/lib/match-count.ts`
- Modify: `apps/web/features/settings/components/session-form-dialog.tsx`
- Test: `apps/web/features/settings/lib/__tests__/match-count.test.ts` (tạo mới)
- Test: `apps/web/features/settings/components/__tests__/session-form-dialog.test.tsx` (tạo mới)

**Interfaces:**
- Consumes: `MATCH_COUNT_MAX`, `BattleSession.matchCount`, `BattleSession.formationMatchCount` (Task 3).
- Produces:
  - `MatchCountField({ value, isGuildWar, onChange })` — `value: number`, `onChange: (value: number) => void`.
  - `ReduceMatchCountDialog({ open, onOpenChange, onConfirm })`.
  - `willDropFormation(session: Pick<BattleSession, "formationMatchCount"> | null, matchCount: number): boolean` từ `../lib/match-count`.

- [ ] **Step 1: Viết test đỏ**

Tạo `apps/web/features/settings/components/__tests__/session-form-dialog.test.tsx`. Xem
`apps/web/components/shared/__tests__/mutation-dialog.test.tsx` để lấy đúng cách mock provider của
TanStack Query mà repo đang dùng, rồi viết:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SessionFormDialog } from "../session-form-dialog";

afterEach(cleanup);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const GUILD_WAR = {
  id: "gw-2026-08-31",
  label: "Thứ 7 · Bang Chiến",
  dateTime: "2026-09-05T13:00:00.000Z",
  deadline: "2026-09-03T10:00:00.000Z",
  isDeadlinePassed: false,
  isGuildWar: true,
  opponent: null,
  weekStart: "2026-08-30T17:00:00.000Z",
  attendanceCount: 0,
  matchCount: 2,
  formationMatchCount: 0,
};

describe("SessionFormDialog", () => {
  it("form tạo mới mặc định 2 trận", () => {
    render(<SessionFormDialog open session={null} onOpenChange={() => {}} />);

    expect(screen.getByLabelText("Số trận")).toHaveValue("2");
  });

  it("Bang Chiến chỉ hiện dòng chữ, không có ô chọn", () => {
    render(
      <SessionFormDialog open session={GUILD_WAR} onOpenChange={() => {}} />
    );

    expect(screen.queryByLabelText("Số trận")).toBeNull();
    expect(
      screen.getByText(/hệ thống tự tính theo tuần, không sửa được/)
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter web test -- session-form-dialog
```

Expected: FAIL — không tìm thấy label "Số trận".

- [ ] **Step 3: Viết `MatchCountField`**

Tạo `apps/web/features/settings/components/match-count-field.tsx`. Dùng `Select` của
`@/components/ui/select` và `FieldLabel` của `@/components/shared/field-label`, theo đúng cách
`session-form-dialog.tsx` đang dựng các field khác:

```tsx
"use client";

import { Swords } from "lucide-react";

import { MATCH_COUNT_MAX, MATCH_COUNT_MIN } from "@guild/shared/schemas";

import { FieldLabel } from "@/components/shared/field-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Every allowed match count, built from the shared bounds so the two cannot drift. */
const OPTIONS = Array.from(
  { length: MATCH_COUNT_MAX - MATCH_COUNT_MIN + 1 },
  (_, index) => MATCH_COUNT_MIN + index
);

interface MatchCountFieldProps {
  /** Match count currently chosen */
  value: number;
  /** Whether this is the Guild War, whose count the system owns */
  isGuildWar: boolean;
  /** Called with the newly chosen count */
  onChange: (value: number) => void;
}

/**
 * How many matches the day is played over. A Select rather than a number input: with two options
 * the list states the whole range, so nobody has to read an error message to learn it.
 * @param value - Match count currently chosen
 * @param isGuildWar - Whether this is the Guild War, whose count the system owns
 * @param onChange - Called with the newly chosen count
 * @returns The match count field, or the read-only line for a Guild War
 */
export function MatchCountField({
  value,
  isGuildWar,
  onChange,
}: MatchCountFieldProps) {
  if (isGuildWar) {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel icon={<Swords />}>Số trận</FieldLabel>
        <p className="text-sm text-muted-foreground">
          {value} trận — hệ thống tự tính theo tuần, không sửa được.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor="session-match-count" icon={<Swords />}>
        Số trận
      </FieldLabel>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id="session-match-count" aria-label="Số trận">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((count) => (
            <SelectItem key={count} value={String(count)}>
              {count} trận
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 4: Viết `ReduceMatchCountDialog`**

Tạo `apps/web/features/settings/components/reduce-match-count-dialog.tsx`, dựa trên
`apps/web/features/team-builder/components/delete-match-dialog.tsx` (cùng vai trò: xác nhận một
việc làm mất đội hình):

```tsx
"use client";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

interface ReduceMatchCountDialogProps {
  /** Whether the confirmation is showing */
  open: boolean;
  /** Called when the dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Called once the admin accepts losing the second formation */
  onConfirm: () => void;
}

/**
 * Confirm dropping to one match when a second formation is already laid out.
 * @param open - Whether the confirmation is showing
 * @param onOpenChange - Called when the dialog closes
 * @param onConfirm - Called once the admin accepts losing the second formation
 * @returns The confirmation dialog
 */
export function ReduceMatchCountDialog({
  open,
  onOpenChange,
  onConfirm,
}: ReduceMatchCountDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hạ xuống 1 trận?"
      submitLabel="Hạ xuống 1 trận"
      pendingLabel="Đang lưu…"
      fallbackError="Không lưu được thay đổi."
      run={async () => onConfirm()}
    >
      <div className="text-sm">
        Hạ xuống 1 trận sẽ xoá đội hình đã xếp cho trận 2. Không khôi phục lại
        được.
      </div>
    </ConfirmDeleteDialog>
  );
}
```

Nếu chữ ký prop của `ConfirmDeleteDialog` khác, đọc `apps/web/components/shared/confirm-delete-dialog.tsx` rồi chỉnh cho khớp — **không** đổi component dùng chung đó.

- [ ] **Step 5: Tách luật "có mất đội hình không" thành hàm thuần**

Tạo `apps/web/features/settings/lib/match-count.ts`:

```ts
import type { BattleSession } from "@guild/shared/schemas";

/**
 * Whether saving this match count would destroy a formation: the day would be played over fewer
 * matches than it already has formations laid out for.
 *
 * A pure function rather than a check inside the form, because it is the one rule here worth
 * testing on its own — the rest of the form is wiring.
 * @param session - Session being edited, null while creating (nothing to lose yet)
 * @param matchCount - Match count about to be saved
 * @returns true when the admin has to confirm before the request goes out
 */
export function willDropFormation(
  session: Pick<BattleSession, "formationMatchCount"> | null,
  matchCount: number
): boolean {
  return session !== null && matchCount < session.formationMatchCount;
}
```

Test đi kèm, `apps/web/features/settings/lib/__tests__/match-count.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { willDropFormation } from "../match-count";

describe("willDropFormation", () => {
  it("tạo mới thì không có gì để mất", () => {
    expect(willDropFormation(null, 1)).toBe(false);
  });

  it("hạ xuống dưới số đội hình đã xếp là mất dữ liệu", () => {
    expect(willDropFormation({ formationMatchCount: 2 }, 1)).toBe(true);
  });

  it("ngày 2 trận mới xếp 1 đội hình thì hạ xuống 1 không mất gì", () => {
    expect(willDropFormation({ formationMatchCount: 1 }, 1)).toBe(false);
  });

  it("giữ nguyên hoặc tăng thì không bao giờ mất", () => {
    expect(willDropFormation({ formationMatchCount: 2 }, 2)).toBe(false);
  });
});
```

- [ ] **Step 6: Nối vào form**

Trong `apps/web/features/settings/components/session-form-dialog.tsx`:

Thêm hằng số cạnh `DEFAULT_BATTLE_TIME`:

```tsx
// A day is played over two matches unless an admin says otherwise.
const DEFAULT_MATCH_COUNT = 2;
```

Thêm state và ref, ngay dưới `const [opponent, setOpponent] = useState(...)`:

```tsx
  const [matchCount, setMatchCount] = useState(
    session?.matchCount ?? DEFAULT_MATCH_COUNT
  );
  const [confirmingReduce, setConfirmingReduce] = useState(false);
  // Resolver of the confirmation currently on screen. A ref, not state: resolving it must not
  // re-render, and there is only ever one in flight because the form is blocked while it waits.
  const confirmResolver = useRef<((accepted: boolean) => void) | null>(null);
```

(thêm `useRef` vào import từ `react`, và `import { willDropFormation } from "../lib/match-count";` cùng `import { MatchCountField } from "./match-count-field";`, `import { ReduceMatchCountDialog } from "./reduce-match-count-dialog";` vào đầu file)

Thêm hai hàm:

```tsx
  /**
   * Show the confirmation and wait for the admin's answer.
   * @returns true when the admin accepted losing the second formation
   */
  function askToDropFormation(): Promise<boolean> {
    setConfirmingReduce(true);

    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  }

  /**
   * Close the confirmation, handing the waiting submit the admin's answer.
   * @param accepted - Whether the admin accepted losing the second formation
   */
  function settleConfirmation(accepted: boolean) {
    setConfirmingReduce(false);
    confirmResolver.current?.(accepted);
    confirmResolver.current = null;
  }
```

Trong `submitSession`, ngay **trước** lời gọi mutation (sau các kiểm tra ngày giờ và hạn chót):

```tsx
    // The request must not go out before the admin has seen what it destroys. Throwing on refusal
    // keeps the form up with everything they typed — `MutationForm` shows the sentence and nothing
    // is saved.
    if (
      willDropFormation(session, matchCount) &&
      !(await askToDropFormation())
    ) {
      throw new Error("Chưa lưu — bạn đã huỷ việc hạ số trận.");
    }
```

Gửi `matchCount` ở cả hai nhánh: nhánh create thêm `matchCount,`; nhánh update thêm
`...(isGuildWar ? {} : { matchCount }),` ngay cạnh dòng `deadline` đã có.

Render field trong `MutationForm`, ngay dưới `DateTimeField` của ngày giờ đánh:

```tsx
      <MatchCountField
        value={matchCount}
        isGuildWar={isGuildWar}
        onChange={setMatchCount}
      />
```

và dialog xác nhận **bên ngoài** `MutationForm`, bọc cả hai trong một fragment:

```tsx
      <ReduceMatchCountDialog
        open={confirmingReduce}
        onOpenChange={(open) => {
          if (!open) settleConfirmation(false);
        }}
        onConfirm={() => settleConfirmation(true)}
      />
```

- [ ] **Step 7: Chạy test để chắc chắn nó xanh**

```bash
pnpm --filter web test -- match-count session-form-dialog
```

Expected: PASS cả hai file.

- [ ] **Step 8: Chạy toàn bộ test web**

```bash
pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/features/settings
git commit -m "feat(settings): let an admin set how many matches a day is played over"
```

---

### Task 8: `canAddMatch` bám trần của ngày đánh

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formation-draft.ts:300`
- Test: `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts`

**Interfaces:**
- Consumes: `SessionFormation.matchCount` (Task 5).
- Produces: `FormationDraftState.canAddMatch` giờ là `editable && matches.length < <matchCount của ngày đang mở>`.

- [ ] **Step 1: Viết test đỏ**

Trước hết, cho fixture dùng chung một giá trị mặc định. Trong
`apps/web/features/team-builder/hooks/__tests__/render-formation-hook.ts`, thêm `matchCount: 2,` vào
object mà `makeSession` trả về (ngay dưới `isGuildWar`), để mọi test cũ giữ nguyên hành vi hiện tại.

Rồi trong `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts`, thêm:

```ts
describe("useFormationDraft — trần số đội hình theo số trận của ngày", () => {
  it("ngày chỉ đánh 1 trận thì không tạo được đội hình thứ hai", () => {
    const session = makeSession(SESSION_ID, { matchCount: 1 });
    const { result } = renderFormationHook(() =>
      useFormationDraft([session], SESSION_ID, true, vi.fn())
    );

    expect(result.current.canAddMatch).toBe(false);
  });

  it("ngày đánh 2 trận vẫn cho phép chỉ có 1 đội hình, và mời tạo trận 2", () => {
    const session = makeSession(SESSION_ID, { matchCount: 2 });
    const { result } = renderFormationHook(() =>
      useFormationDraft([session], SESSION_ID, true, vi.fn())
    );

    expect(result.current.matchCount).toBe(1);
    expect(result.current.canAddMatch).toBe(true);
  });

  it("chưa chọn ngày nào thì không mời tạo gì", () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([], null, true, vi.fn())
    );

    expect(result.current.canAddMatch).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó đỏ**

```bash
pnpm --filter web test -- use-formation-draft
```

Expected: FAIL — `canAddMatch` là `true` cho ngày 1 trận.

- [ ] **Step 3: Viết implementation**

Trong `apps/web/features/team-builder/hooks/use-formation-draft.ts`:

**Xoá** hằng số `MAX_MATCHES` và doc comment của nó — trần giờ đến từ dữ liệu, không còn là hằng số của frontend.

Thêm, cạnh chỗ đang tính `matches` cho ngày đang mở:

```ts
  // The day itself decides the ceiling: a one-match day can never hold a second formation, while a
  // two-match day is free to run both matches off a single one.
  const activeSession = sessions.find(
    (session) => session.sessionId === activeSessionId
  );
  const maxMatches = activeSession?.matchCount ?? 1;
```

rồi đổi dòng trả về:

```ts
    canAddMatch: editable && matches.length < maxMatches,
```

`?? 1` chứ không phải `?? 2`: chưa chọn ngày nào thì không có gì để thêm vào, và mặc định thoáng hơn sẽ bật một nút không có chỗ bấm.

- [ ] **Step 4: Chạy test để chắc chắn nó xanh**

```bash
pnpm --filter web test -- use-formation-draft
```

Expected: PASS.

- [ ] **Step 5: Viết test cho `MatchTabs`**

Tạo `apps/web/features/team-builder/components/__tests__/match-tabs.test.tsx`, theo mẫu của
`apps/web/components/shared/__tests__/session-label.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MatchTabs } from "../match-tabs";

afterEach(cleanup);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const HANDLERS = {
  onSelect: () => {},
  onAdd: () => {},
  onRemove: () => {},
};

describe("MatchTabs", () => {
  it("một đội hình mà ngày cho phép hai thì vẫn mời tạo trận 2", () => {
    render(
      <MatchTabs
        matchCount={1}
        activeMatchIndex={0}
        secondMatchHasMembers={false}
        canAddMatch
        {...HANDLERS}
      />
    );

    expect(screen.getByRole("button", { name: /Tạo trận 2/ })).toBeTruthy();
  });

  it("ngày 1 trận thì hàng này biến mất hẳn", () => {
    const { container } = render(
      <MatchTabs
        matchCount={1}
        activeMatchIndex={0}
        secondMatchHasMembers={false}
        canAddMatch={false}
        {...HANDLERS}
      />
    );

    expect(container.firstElementChild).toBeNull();
  });
});
```

- [ ] **Step 6: Chạy toàn bộ test web**

```bash
pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/team-builder
git commit -m "feat(team-builder): cap the second formation at the day's match count"
```

---

### Task 9: Cập nhật tài liệu kiến trúc

**Files:**
- Modify: `docs/architecture.md` (§5 bảng data model, §6 luật thời gian)

Luật ở CLAUDE.md: spec, plan, code và tài liệu phải nhất quán trước khi coi là xong. `architecture.md` là tài liệu **binding**, nên nó phải nói về `matchCount`.

- [ ] **Step 1: Sửa dòng `BattleSession` trong bảng §5**

Thêm vào cuối ô mô tả của hàng `BattleSession`:

```
`matchCount` là số trận đánh trong ngày (1 hoặc 2): scrim do admin chọn, mặc định 2; Guild War do hệ thống tính theo luật xen kẽ của tuần. Nó là **trần trên** của số `FormationMatch`, không phải mệnh lệnh — một ngày 2 trận hoàn toàn có thể chỉ xếp một đội hình dùng chung.
```

- [ ] **Step 2: Thêm một gạch đầu dòng vào §6**

Ngay dưới gạch đầu dòng nói về hạn chót của Guild War:

```
- **Số trận của Guild War cũng do hệ thống sở hữu**: xen kẽ 2 → 1 → 2 theo tuần, tính từ mốc Thứ 2
  2026-08-31 (tuần đó 2 trận) bằng `guildWarMatchCount`. Gửi `matchCount` cho một Guild War là 400,
  và `ensureGuildWar` ghi lại giá trị ở mỗi lần đọc, y như với `deadline`.
```

- [ ] **Step 3: Chạy toàn bộ kiểm tra một lượt cuối**

```bash
pnpm --filter @guild/shared build
pnpm --filter api test && pnpm --filter api lint && pnpm --filter api typecheck
pnpm --filter web test && pnpm --filter web lint && pnpm --filter web typecheck
pnpm --filter api format:check
```

Expected: PASS hết. Đây là sáu kiểm tra CI sẽ chạy trên PR.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): record the per-day match count and the guild war alternation"
```

---

## Ghi chú khi thực thi

- **Thứ tự bắt buộc:** Task 1 → 2 → 3 → 4 → 5 rồi mới đến phần web (6 → 7 → 8). Task 3 đổi contract, nên trước khi web build được thì `pnpm --filter @guild/shared build` phải chạy ít nhất một lần.
- **Nếu `pnpm --filter api test` báo lỗi typecheck ở các file test cũ** sau Task 3, đó là hành vi đúng: `matchCount` là trường bắt buộc của `CreateBattleSessionInput`. Thêm `matchCount: 2` vào các fixture, đừng nới lỏng schema.
- **Migration đã chạy trên máy local không rollback được bằng lệnh.** Nếu cần làm lại từ đầu: `pnpm --filter api db:reset` rồi `pnpm --filter api prisma:migrate` và `pnpm --filter api db:seed`.
- **Không chạy `migrate deploy` lên production bằng tay** — CI làm việc đó khi PR merge.
