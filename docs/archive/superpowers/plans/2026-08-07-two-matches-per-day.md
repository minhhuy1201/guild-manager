# Hai trận trong một ngày đánh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép xếp **hai đội hình** cho một ngày đánh, tạo trận 2 bằng cách clone trận 1, và lưu đội hình cả ngày trong một lần.

**Architecture:** Bảng `Formation` (một hàng/ngày, `assignment` là JSON) được thay bằng hai bảng chuẩn hoá `FormationMatch` (1–2 trận mỗi ngày) và `FormationSlot` (một hàng mỗi ô đã xếp, có khoá ngoại tới `Character`). API `PUT /team-builder/formations/:sessionId` nhận `{ matches: Assignment[] }` và ghi đè cả ngày trong một transaction. Phía web, nháp trong Zustand đổi từ `Assignment` thành `Assignment[]`, và màn hình thêm một hàng tab con Trận 1 / Trận 2.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod (nestjs-zod) · Jest · Next.js App Router · TanStack Query · Zustand · Vitest · pnpm workspace.

**Spec:** [docs/superpowers/specs/2026-08-07-two-matches-per-day-design.md](../specs/2026-08-07-two-matches-per-day-design.md)

## Global Constraints

- Mọi chữ hiển thị cho người dùng **phải là tiếng Việt**. Tên file, tên biến, commit message bằng tiếng Anh.
- Comment và JSDoc: giữ đúng ngôn ngữ của file đang sửa (backend + `apps/web/features/team-builder/lib` đang dùng cả hai; theo file, không đổi ngôn ngữ sẵn có).
- Type/schema dùng chung để ở `packages/shared`, không chép lại ở hai đầu.
- Frontend: server state → TanStack Query, nháp/UI state → Zustand. **Không bao giờ** để dữ liệu API trong Zustand.
- Backend: Controller → Service → Prisma (module team-builder không có tầng repository, giữ nguyên như code đang chạy).
- Trần **tối đa 2 trận/ngày** nằm ở Zod (`.max(2)`), không nằm ở cấu trúc bảng.
- Hạn giữ dữ liệu đội hình: **56 ngày** (`RETENTION_DAYS`).
- Bố cục lưới (10 team × 6 ô) vẫn nằm hẳn ở frontend. Backend chỉ biết `slotId` là chuỗi.
- Commit message tiếng Anh, **không** có dòng `Co-Authored-By`. Mỗi task một commit, commit thẳng lên `main`.
- Lệnh test: `pnpm --filter api test`, `pnpm --filter web test`.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/prisma/migrations/<ts>_formation_matches/migration.sql` | Tạo 2 bảng mới + chuyển dữ liệu từ `Formation` |
| `apps/api/prisma/migrations/<ts>_drop_formation_table/migration.sql` | Xoá bảng `Formation` sau khi hết chỗ dùng |
| `apps/web/features/team-builder/lib/active-match.ts` | Kẹp chỉ số tab con về khoảng hợp lệ |
| `apps/web/features/team-builder/lib/__tests__/active-match.test.ts` | Test cho trên |
| `apps/web/features/team-builder/components/match-tabs.tsx` | Hàng tab con Trận 1 / Trận 2 + nút Tạo/Xoá trận 2 |
| `apps/web/features/team-builder/components/delete-match-dialog.tsx` | Xác nhận xoá trận 2 |

**Sửa**

| File | Đổi gì |
|---|---|
| `apps/api/prisma/schema.prisma` | Thêm `FormationMatch` + `FormationSlot`, sau đó bỏ `Formation` |
| `packages/shared/schemas/formation.schema.ts` | `saveFormationSchema` nhận `{ matches }` |
| `apps/api/src/modules/team-builder/team-builder.service.ts` | Đọc/ghi theo bảng mới, retention 56 ngày, bỏ `pruneMissingCharacters` |
| `apps/api/src/modules/team-builder/team-builder.controller.ts` | Truyền `body.matches` |
| `apps/api/src/modules/team-builder/entities/formation.entity.ts` | `assignment` → `matches` |
| `apps/api/src/modules/battle-sessions/battle-sessions.service.ts` | Bỏ `formation.updateMany`, `hasFormation` tính bằng `_count` |
| `apps/web/features/team-builder/types/session-formation.ts` | `assignment` → `matches: WireAssignment[]` |
| `apps/web/features/team-builder/lib/wire.ts` | Thêm `toWireMatches` / `fromWireMatches` |
| `apps/web/features/team-builder/lib/formation-diff.ts` | Thêm `isDayDirty` |
| `apps/web/features/team-builder/lib/prefill.ts` | Nguồn = trận cuối của ngày trước |
| `apps/web/features/team-builder/store/formation-store.ts` | `drafts: Record<string, Assignment[]>` + `activeMatchIndex` |
| `apps/web/features/team-builder/api/team-builder-api.ts` | Body `{ matches }` |
| `apps/web/features/team-builder/hooks/use-formation-screen.ts` | Điều phối tab con, tạo/xoá trận 2, lưu cả ngày |
| `apps/web/features/team-builder/hooks/use-prefill.ts` | Nháp là mảng một phần tử |
| `apps/web/features/team-builder/components/session-tabs.tsx` | Badge `12/60 · 8/60` |
| `apps/web/features/team-builder/components/formation-toolbar.tsx` | "Lưu đội hình cả ngày" |
| `apps/web/features/team-builder/components/member-pool.tsx`, `member-card.tsx` | Nhãn "đang đánh trận N" |
| `apps/web/features/team-builder/components/team-builder-screen.tsx` | Ghép `MatchTabs` |

---

### Task 1: Hai bảng mới, dữ liệu cũ chuyển sang, bảng `Formation` giữ nguyên

Chia migration làm hai bước (thêm trước, xoá sau) để mọi task ở giữa vẫn build và test được. Sau task này chưa có code nào đọc bảng mới — đó là chủ ý.

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_formation_matches/migration.sql`

**Interfaces:**
- Consumes: bảng `Formation`, `BattleSession`, `Character` hiện có.
- Produces: model Prisma `FormationMatch { id, sessionId, matchIndex, session, slots }` và `FormationSlot { matchId, slotId, characterId, match, character }`; quan hệ `BattleSession.formationMatches` và `Character.formationSlots`.

- [ ] **Step 1: Thêm hai model vào schema**

Thêm vào cuối `apps/api/prisma/schema.prisma`:

```prisma
/// Một trận trong ngày đánh (tối đa 2 — trần đặt ở Zod, không ở đây).
/// Hàng này tồn tại kể cả khi chưa xếp ai: đó là cách phân biệt
/// "ngày này có 2 trận" với "trận 2 đang để trống".
model FormationMatch {
  id         String @id @default(cuid())
  sessionId  String
  /// 1 hoặc 2. Backend gán theo vị trí trong mảng gửi lên, không nhận từ client.
  matchIndex Int

  session BattleSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  slots   FormationSlot[]

  @@unique([sessionId, matchIndex])
}

/// Một ô đã xếp người. Ô trống thì KHÔNG có hàng.
model FormationSlot {
  matchId     String
  /// "team-1-pos-1" — bố cục lưới vẫn nằm hẳn ở frontend.
  slotId      String
  characterId String

  match     FormationMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  character Character      @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@id([matchId, slotId])
  @@index([characterId])
}
```

Thêm quan hệ ngược vào hai model có sẵn:

- Trong `model BattleSession`, ngay dưới dòng `formation Formation?`:
```prisma
  /// Các trận trong ngày này (1 hoặc 2), mỗi trận một đội hình.
  formationMatches  FormationMatch[]
```
- Trong `model Character`, ngay dưới dòng `attendanceRecords AttendanceRecord[]`:
```prisma
  formationSlots    FormationSlot[]
```

- [ ] **Step 2: Sinh khung migration mà chưa chạy**

```bash
cd apps/api && pnpm exec prisma migrate dev --create-only --name formation_matches
```
Expected: in ra đường dẫn file `prisma/migrations/<timestamp>_formation_matches/migration.sql` vừa tạo, database **chưa** bị đổi.

- [ ] **Step 3: Thêm phần chuyển dữ liệu vào cuối file migration**

Giữ nguyên phần `CREATE TABLE` / `CREATE INDEX` / `ADD CONSTRAINT` Prisma vừa sinh, **nối thêm** vào cuối file:

```sql
-- Mỗi đội hình cũ thành trận 1 của ngày đó. Dùng lại id của Formation cho tiện đối chiếu.
INSERT INTO "FormationMatch" ("id", "sessionId", "matchIndex")
SELECT "id", "sessionId", 1 FROM "Formation";

-- Bung assignment JSON ra từng ô.
-- Điều kiện EXISTS là bắt buộc: luật cũ chỉ lọc id mồ côi lúc đọc chứ không xoá khỏi
-- database, nên dữ liệu thật gần như chắc chắn có ô trỏ tới nhân vật đã rời bang —
-- không lọc ở đây thì migration vỡ vì khoá ngoại.
INSERT INTO "FormationSlot" ("matchId", "slotId", "characterId")
SELECT f."id", kv.key, kv.value
FROM "Formation" f, jsonb_each_text(f."assignment") AS kv
WHERE EXISTS (SELECT 1 FROM "Character" c WHERE c."id" = kv.value);
```

- [ ] **Step 4: Chạy migration**

```bash
cd apps/api && pnpm exec prisma migrate dev
```
Expected: `Your database is now in sync with your schema.` Không có lỗi khoá ngoại.

> Database dev chưa chạy thì bật trước: `pnpm --filter api db:up`.

- [ ] **Step 5: Kiểm tra dữ liệu đã chuyển đúng**

```bash
cd apps/api && pnpm exec prisma db execute --stdin <<'SQL'
SELECT
  (SELECT count(*) FROM "Formation")      AS formations,
  (SELECT count(*) FROM "FormationMatch") AS matches,
  (SELECT count(*) FROM "FormationSlot")  AS slots;
SQL
```
Expected: `matches` bằng `formations`. `slots` bằng tổng số ô đã xếp (nhỏ hơn hoặc bằng tổng số khoá trong các JSON — chênh lệch chính là các ô mồ côi bị bỏ). Database rỗng thì cả ba bằng 0, vẫn hợp lệ.

- [ ] **Step 6: Đảm bảo phần còn lại chưa vỡ**

```bash
pnpm --filter api test && pnpm --filter api build
```
Expected: PASS. Chưa có code nào đọc bảng mới nên không có gì đổi hành vi.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): add normalized formation match and slot tables

Copy every existing Formation row into a match with its slots, dropping cells
that point at characters who already left the guild. The Formation table stays
for now so the rest of the code keeps compiling."
```

---

### Task 2: Backend đọc/ghi đội hình cả ngày

**Files:**
- Modify: `packages/shared/schemas/formation.schema.ts`
- Modify: `apps/api/src/modules/team-builder/entities/formation.entity.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.controller.ts`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: `FormationMatch` / `FormationSlot` (Task 1); `BattleSessionsService.getActiveWeekStart(now)`, `.listByWeek(weekStart?, now)`; `formatSessionLabel(dateTime, isGuildWar)`.
- Produces:
  - `saveFormationSchema` = `z.object({ matches: z.array(assignmentSchema).min(1).max(2) })`, kèm type `SaveFormationInput = { matches: Record<string,string>[] }`.
  - `SessionFormationEntity.matches: Record<string, string>[]` (thay `assignment`).
  - `TeamBuilderService.saveFormation(sessionId: string, matches: AssignmentInput[], now?: Date): Promise<SessionFormationEntity>`.

- [ ] **Step 1: Đổi schema dùng chung**

Trong `packages/shared/schemas/formation.schema.ts`, thay khối `saveFormationSchema`:

```ts
/**
 * Body của PUT /team-builder/formations/:sessionId — đội hình CẢ NGÀY.
 * Một ngày có 1 hoặc 2 trận; trần 2 đặt ở đây chứ không ở cấu trúc bảng, nên
 * sau này muốn 3 trận chỉ phải sửa con số này.
 */
export const saveFormationSchema = z.object({
  matches: z.array(assignmentSchema).min(1).max(2),
});
```

`assignmentSchema`, `AssignmentInput`, `SaveFormationInput` giữ nguyên cách khai báo — `SaveFormationInput` tự đổi theo vì suy ra từ schema.

- [ ] **Step 2: Đổi entity**

Trong `apps/api/src/modules/team-builder/entities/formation.entity.ts`, thay field `assignment` của `SessionFormationEntity` bằng:

```ts
  /**
   * Đội hình từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mỗi phần tử là slotId → characterId, ô trống không có khoá.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì.
   */
  matches: Record<string, string>[];
```

- [ ] **Step 3: Viết test cho luồng lưu**

Thay toàn bộ `describe('TeamBuilderService.saveFormation', …)` hiện có trong `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts` bằng:

```ts
describe('TeamBuilderService.saveFormation', () => {
  let service: TeamBuilderService;
  let tx: {
    formationMatch: { deleteMany: jest.Mock; create: jest.Mock };
  };
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    tx = {
      formationMatch: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      character: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }]),
      },
      battleSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-thu',
          dateTime: vn('2026-07-23T20:30'),
          opponent: 'Thiên Nhẫn Giáo',
          isGuildWar: false,
          weekStart: WEEK_START,
        }),
      },
      $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      {} as unknown as BattleSessionsService,
    );
  });

  it('lưu hai trận thành hai FormationMatch, matchIndex 1 và 2', async () => {
    await service.saveFormation(
      'session-thu',
      [{ 'team-1-pos-1': 'char-1' }, { 'team-1-pos-1': 'char-2' }],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create).toHaveBeenCalledTimes(2);
    expect(tx.formationMatch.create.mock.calls[0][0].data).toEqual({
      sessionId: 'session-thu',
      matchIndex: 1,
      slots: { create: [{ slotId: 'team-1-pos-1', characterId: 'char-1' }] },
    });
    expect(tx.formationMatch.create.mock.calls[1][0].data.matchIndex).toBe(2);
  });

  it('xoá sạch đội hình cũ của ngày trước khi ghi lại', async () => {
    await service.saveFormation('session-thu', [{}], WEDNESDAY);

    expect(tx.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-thu' },
    });
  });

  it('lưu lại mảng một phần tử thì chỉ còn một trận', async () => {
    await service.saveFormation('session-thu', [{}], WEDNESDAY);

    expect(tx.formationMatch.create).toHaveBeenCalledTimes(1);
  });

  it('bỏ characterId không còn trong bảng Character', async () => {
    const result = await service.saveFormation(
      'session-thu',
      [{ 'team-1-pos-1': 'char-1', 'team-1-pos-2': 'char-99' }],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual(
      [{ slotId: 'team-1-pos-1', characterId: 'char-1' }],
    );
    expect(result.matches).toEqual([{ 'team-1-pos-1': 'char-1' }]);
  });

  it('gửi hai lần cùng payload cho cùng kết quả', async () => {
    const matches = [{ 'team-1-pos-1': 'char-1' }];

    const first = await service.saveFormation('session-thu', matches, WEDNESDAY);
    const second = await service.saveFormation('session-thu', matches, WEDNESDAY);

    expect(second).toEqual(first);
  });

  it('không tìm thấy ngày đánh thì ném NotFoundException', async () => {
    prisma.battleSession.findUnique.mockResolvedValue(null);

    await expect(
      service.saveFormation('khong-co', [{}], WEDNESDAY),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ngày đã qua giờ đánh thì ném ConflictException', async () => {
    prisma.battleSession.findUnique.mockResolvedValue({
      id: 'session-tue',
      dateTime: vn('2026-07-21T20:30'),
      opponent: null,
      isGuildWar: false,
      weekStart: WEEK_START,
    });

    await expect(
      service.saveFormation('session-tue', [{}], WEDNESDAY),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 4: Chạy test cho chắc là fail**

```bash
pnpm --filter api test -- team-builder
```
Expected: FAIL — `saveFormation` hiện nhận `assignment` chứ không nhận mảng, và mock prisma không còn field `formation`.

- [ ] **Step 5: Viết lại service**

Trong `apps/api/src/modules/team-builder/team-builder.service.ts`:

Đổi hằng số:
```ts
/// Số ngày giữ lại đội hình cũ. Quá mốc này thì dọn.
const RETENTION_DAYS = 56;
```

Thay `purgeExpiredFormations` — không còn cột `weekStart` denormalize, lọc qua quan hệ:
```ts
  private async purgeExpiredFormations(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);

    await this.prisma.formationMatch.deleteMany({
      where: { session: { weekStart: { lt: cutoff } } },
    });
  }
```

Trong `getFormations`, thay hai truy vấn (`battleSession.findMany` + `formation.findMany`) và phần dựng entity bằng:
```ts
    const sessions = await this.prisma.battleSession.findMany({
      where: { weekStart: new Date(targetWeekStart) },
      orderBy: { dateTime: 'asc' },
      include: {
        formationMatches: {
          orderBy: { matchIndex: 'asc' },
          include: { slots: true },
        },
      },
    });
    if (sessions.length === 0) return [];

    return sessions.map((session) => ({
      sessionId: session.id,
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: session.dateTime.getTime() < now.getTime(),
      matches: session.formationMatches.map((match) =>
        Object.fromEntries(
          match.slots.map((slot) => [slot.slotId, slot.characterId]),
        ),
      ),
    }));
```
Xoá luôn lời gọi `loadCharacterIds()` trong `getFormations`: khoá ngoại `onDelete: Cascade` đã đảm bảo mọi `characterId` còn tồn tại.

Thay `saveFormation`:
```ts
  /**
   * Ghi đè đội hình CẢ NGÀY. Idempotent — gửi cùng payload nhiều lần cho cùng
   * kết quả. Xoá rồi tạo lại thay vì so từng ô: nhiều nhất ~120 hàng, và nhờ vậy
   * "bỏ trận 2" chỉ là gửi mảng một phần tử, không cần endpoint riêng.
   * @param sessionId - ID ngày đánh cần lưu đội hình
   * @param matches - Đội hình từng trận, theo thứ tự trận 1 → trận 2
   * @param now - Thời điểm hiện tại (cho phép truyền vào để test)
   * @returns Ngày đánh kèm đội hình vừa ghi
   * @throws NotFoundException khi không có ngày đánh nào mang sessionId đó
   * @throws ConflictException khi ngày đánh đã qua giờ đánh
   */
  async saveFormation(
    sessionId: string,
    matches: AssignmentInput[],
    now: Date = new Date(),
  ): Promise<SessionFormationEntity> {
    const session = await this.prisma.battleSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy ngày đánh.');
    }

    if (session.dateTime.getTime() < now.getTime()) {
      throw new ConflictException('Trận này đã đánh xong, không sửa được nữa.');
    }

    // Lọc TRƯỚC khi ghi: một nhân vật vừa bị xoá khỏi bang mà còn trong nháp sẽ
    // làm cả câu insert vỡ vì khoá ngoại.
    const knownIds = await this.loadCharacterIds();
    const cleaned = matches.map((assignment) =>
      Object.fromEntries(
        Object.entries(assignment).filter(([, characterId]) =>
          knownIds.has(characterId),
        ),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.formationMatch.deleteMany({ where: { sessionId } });

      for (const [index, assignment] of cleaned.entries()) {
        await tx.formationMatch.create({
          data: {
            sessionId,
            matchIndex: index + 1,
            slots: {
              create: Object.entries(assignment).map(
                ([slotId, characterId]) => ({ slotId, characterId }),
              ),
            },
          },
        });
      }
    });

    return {
      sessionId: session.id,
      label: formatSessionLabel(session.dateTime, session.isGuildWar),
      opponent: session.opponent,
      dateTime: session.dateTime.toISOString(),
      isGuildWar: session.isGuildWar,
      locked: false,
      matches: cleaned,
    };
  }
```

Xoá hẳn method `pruneMissingCharacters` — không còn ai gọi. Giữ `loadCharacterIds`.

- [ ] **Step 6: Cập nhật controller**

Trong `apps/api/src/modules/team-builder/team-builder.controller.ts`, sửa JSDoc và thân method `saveFormation`:

```ts
  /**
   * Ghi đè đội hình cả ngày (1 hoặc 2 trận).
   * @param sessionId - ID ngày đánh cần lưu
   * @param body - matches: đội hình từng trận, theo thứ tự
   * @returns Ngày đánh kèm đội hình vừa ghi
   */
  @Put('formations/:sessionId')
  @ApiOperation({ summary: 'Lưu đội hình cả ngày (tối đa 2 trận)' })
  saveFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: SaveFormationDto,
  ): Promise<SessionFormationEntity> {
    return this.teamBuilder.saveFormation(sessionId, body.matches);
  }
```

- [ ] **Step 7: Sửa các test `getFormations` / `getWeeks` cho khớp mô hình mới**

Trong cùng file spec:

- `describe('TeamBuilderService.getFormations')`: bỏ field `formation` khỏi mock `prisma`, và cho `battleSession.findMany` trả về `SESSION_ROWS` đã gắn sẵn đội hình:
```ts
    prisma = {
      character: { findMany: jest.fn().mockResolvedValue([]) },
      battleSession: {
        findMany: jest.fn().mockResolvedValue(
          SESSION_ROWS.map((row) => ({
            ...row,
            formationMatches:
              row.id === 'session-sat'
                ? [
                    {
                      matchIndex: 1,
                      slots: [
                        { slotId: 'team-1-pos-1', characterId: 'char-1' },
                      ],
                    },
                    {
                      matchIndex: 2,
                      slots: [
                        { slotId: 'team-1-pos-1', characterId: 'char-2' },
                      ],
                    },
                  ]
                : [],
          })),
        ),
      },
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
```
- Đổi test `'trận chưa xếp thì assignment rỗng'` thành:
```ts
  it('ngày chưa xếp thì matches rỗng', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const tuesday = result.find((item) => item.sessionId === 'session-tue');

    expect(tuesday?.matches).toEqual([]);
  });
```
- **Xoá** test `'bỏ characterId không còn trong bảng Character'` ở nhóm `getFormations` (việc lọc đã chuyển sang lúc ghi, và đã có test ở Step 3), thay bằng:
```ts
  it('trả về hai trận của ngày, đúng thứ tự matchIndex', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.matches).toEqual([
      { 'team-1-pos-1': 'char-1' },
      { 'team-1-pos-1': 'char-2' },
    ]);
  });
```
- `describe('TeamBuilderService.getWeeks')`: đổi mock `formation: { deleteMany }` thành `formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) }`. Hai test đang có phải sửa theo:
  - `'xoá đội hình có weekStart cũ hơn 28 ngày trước khi đọc'` → đổi tên thành `'xoá đội hình cũ hơn 56 ngày trước khi đọc'` và đổi thân thành:
```ts
    expect(prisma.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { session: { weekStart: { lt: vn('2026-05-28T12:00') } } },
    });
```
  (`WEDNESDAY` là `2026-07-22T12:00` giờ VN; lùi 56 ngày đúng bằng `2026-05-28T12:00`.)
  - `'dọn dữ liệu chạy trước khi liệt kê tuần'` → đổi `prisma.formation.deleteMany.mockImplementation` thành `prisma.formationMatch.deleteMany.mockImplementation`, phần còn lại giữ nguyên.

- [ ] **Step 8: Chạy test**

```bash
pnpm --filter api test -- team-builder && pnpm --filter api build
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/schemas/formation.schema.ts apps/api/src/modules/team-builder
git commit -m "feat(api): store one line-up per match and save a whole day at once

PUT now takes { matches } and rewrites every match of the day inside one
transaction, so dropping match 2 needs no endpoint of its own. Character ids are
filtered on write instead of on read, since the slot rows now carry a real
foreign key. Retention goes from 28 to 56 days."
```

---

### Task 3: Dọn phụ thuộc ở module `battle-sessions`

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`

**Interfaces:**
- Consumes: `FormationMatch` (Task 1).
- Produces: `BattleSessionEntity.hasFormation` giữ nguyên kiểu `boolean`, chỉ đổi cách tính. Sau task này **không còn code nào chạm bảng `Formation`**.

- [ ] **Step 1: Sửa test trước**

Trong `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`:

- Trong mock `prisma`, bỏ hẳn `formation: { updateMany: … }` (nếu có).
- **Xoá** test kiểm tra "đổi tuần có cập nhật `Formation.weekStart`" — cột đó không còn tồn tại.
- Mọi hàng `battleSession` giả lập đang có `formation: null` hoặc `formation: { id: … }` phải đổi sang `_count`:
```ts
  _count: { attendanceRecords: 0, formationMatches: 0 },
```
- Thêm test cho cách tính mới, đặt cạnh các test dựng entity:
```ts
  it('hasFormation bật khi ngày đánh đã có ít nhất một trận được xếp', async () => {
    prisma.battleSession.findMany.mockResolvedValue([
      {
        id: 'session-thu',
        dateTime: vn('2026-07-23T20:30'),
        deadline: vn('2026-07-23T17:00'),
        opponent: null,
        isGuildWar: false,
        weekStart: WEEK_START,
        _count: { attendanceRecords: 3, formationMatches: 2 },
      },
    ]);

    const [session] = await service.listByWeek(
      WEEK_START.toISOString(),
      WEDNESDAY,
    );

    expect(session.hasFormation).toBe(true);
  });
```

> Tên helper (`vn`, `WEEK_START`, `WEDNESDAY`) và cách dựng service lấy theo đúng những gì file spec đó đang dùng — đọc phần đầu file trước khi sửa.

- [ ] **Step 2: Chạy test cho chắc là fail**

```bash
pnpm --filter api test -- battle-sessions
```
Expected: FAIL — `hasFormation` vẫn đọc `row.formation`, mà mock không còn field đó.

- [ ] **Step 3: Sửa service**

Trong `apps/api/src/modules/battle-sessions/battle-sessions.service.ts`:

- `type SessionRow`: bỏ dòng `formation: { id: string } | null;`, đổi `_count` thành:
```ts
  _count: { attendanceRecords: number; formationMatches: number };
```
- `SESSION_INCLUDE`: bỏ dòng `formation: { select: { id: true } },`, đổi `_count` thành:
```ts
const SESSION_INCLUDE = {
  _count: { select: { attendanceRecords: true, formationMatches: true } },
} as const;
```
- Trong `toEntity`, đổi dòng cuối thành:
```ts
      hasFormation: row._count.formationMatches > 0,
```
và sửa JSDoc `@param row` thành `Hàng đọc từ Prisma kèm _count`.
- Trong `update`, xoá cả khối `tx.formationMatch`/`tx.formation.updateMany` cùng comment của nó. Transaction còn lại đúng một câu, nên rút gọn luôn:
```ts
    const updated = await this.prisma.battleSession.update({
      where: { id },
      data: { dateTime, deadline, opponent, weekStart },
      include: SESSION_INCLUDE,
    });

    return this.toEntity(updated);
```

- [ ] **Step 4: Chạy toàn bộ test backend**

```bash
pnpm --filter api test && pnpm --filter api build
```
Expected: PASS.

- [ ] **Step 5: Xác nhận không còn ai chạm bảng `Formation`**

```bash
grep -rn "prisma\.formation\b\|tx\.formation\b" apps/api/src
```
Expected: không có kết quả nào.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/battle-sessions
git commit -m "refactor(api): drop the denormalized formation week marker

Slot rows reach their week through the session relation, so moving a battle to
another week no longer needs a second write to keep formations in place."
```

---

### Task 4: Xoá bảng `Formation`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_drop_formation_table/migration.sql`

**Interfaces:**
- Consumes: kết quả Task 3 (không còn code nào đọc bảng).
- Produces: schema chỉ còn `FormationMatch` + `FormationSlot`.

- [ ] **Step 1: Bỏ model khỏi schema**

Trong `apps/api/prisma/schema.prisma`: xoá cả `model Formation { … }`, và xoá dòng `formation Formation?` trong `model BattleSession` (giữ `formationMatches`).

- [ ] **Step 2: Sinh và chạy migration**

```bash
cd apps/api && pnpm exec prisma migrate dev --name drop_formation_table
```
Expected: migration chứa `DROP TABLE "Formation";` và chạy xong sạch. Prisma có thể hỏi xác nhận vì đây là thao tác mất dữ liệu — dữ liệu đã được chuyển ở Task 1 nên trả lời có.

- [ ] **Step 3: Chạy test**

```bash
pnpm --filter api test && pnpm --filter api build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): drop the JSON-backed Formation table

Every row was copied into formation matches and slots two migrations ago, and
nothing reads the old table anymore."
```

---

### Task 5: Hàm thuần phía web

Bốn hàm thuần, tất cả test được ở `environment: "node"`. Làm trọn gói trong một task vì chúng là một nhóm và cùng phục vụ Task 6.

**Files:**
- Modify: `apps/web/features/team-builder/types/session-formation.ts`
- Modify: `apps/web/features/team-builder/lib/wire.ts`
- Modify: `apps/web/features/team-builder/lib/formation-diff.ts`
- Modify: `apps/web/features/team-builder/lib/prefill.ts`
- Create: `apps/web/features/team-builder/lib/active-match.ts`
- Test: `apps/web/features/team-builder/lib/__tests__/wire.test.ts`, `formation-diff.test.ts`, `prefill.test.ts`, `active-match.test.ts`

**Interfaces:**
- Consumes: `Assignment = Record<string, string | null>`, `Slot`, `WireAssignment = Record<string, string>` (đã có).
- Produces:
  - `SessionFormation.matches: WireAssignment[]` (thay `assignment`).
  - `toWireMatches(matches: Assignment[]): WireAssignment[]`
  - `fromWireMatches(wire: WireAssignment[], slots: Slot[]): Assignment[]` — luôn trả về ít nhất một phần tử.
  - `isDayDirty(draft: Assignment[] | undefined, saved: Assignment[]): boolean`
  - `resolveActiveMatchIndex(matchCount: number, stored: number): number`
  - `buildPrefill(...)` giữ nguyên chữ ký, `PrefillResult` giữ nguyên ba field.

- [ ] **Step 1: Đổi type trên dây**

Trong `apps/web/features/team-builder/types/session-formation.ts`, thay field `assignment` của `SessionFormation`:

```ts
  /**
   * Đội hình từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì.
   */
  matches: WireAssignment[];
```

- [ ] **Step 2: Viết test cho `toWireMatches` / `fromWireMatches`**

Nối vào `apps/web/features/team-builder/lib/__tests__/wire.test.ts` (đổi dòng import thành `import { fromWire, fromWireMatches, toWire, toWireMatches } from "../wire";`):

```ts
describe("toWireMatches", () => {
  it("bỏ ô trống của từng trận, giữ nguyên thứ tự", () => {
    const matches: Assignment[] = [
      { "team-1-pos-1": "char-1", "team-1-pos-2": null },
      { "team-1-pos-1": null, "team-1-pos-2": "char-2" },
    ];

    expect(toWireMatches(matches)).toEqual([
      { "team-1-pos-1": "char-1" },
      { "team-1-pos-2": "char-2" },
    ]);
  });
});

describe("fromWireMatches", () => {
  it("ngày chưa xếp gì vẫn cho một trận rỗng", () => {
    const result = fromWireMatches([], SLOTS);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      "team-1-pos-1": null,
      "team-1-pos-2": null,
      "team-1-pos-3": null,
    });
  });

  it("dựng lại đủ ô cho cả hai trận", () => {
    const result = fromWireMatches(
      [{ "team-1-pos-1": "char-1" }, { "team-1-pos-3": "char-2" }],
      SLOTS
    );

    expect(result).toHaveLength(2);
    expect(result[0]["team-1-pos-1"]).toBe("char-1");
    expect(result[0]["team-1-pos-3"]).toBeNull();
    expect(result[1]["team-1-pos-3"]).toBe("char-2");
  });
});
```

- [ ] **Step 3: Viết test cho `isDayDirty`**

Nối vào `apps/web/features/team-builder/lib/__tests__/formation-diff.test.ts` (đổi import thành `import { isDayDirty, isDirty } from "../formation-diff";`):

```ts
describe("isDayDirty", () => {
  const saved: Assignment[] = [{ "team-1-pos-1": "char-1" }];

  it("chưa động vào thì không dirty", () => {
    expect(isDayDirty(undefined, saved)).toBe(false);
  });

  it("nháp giống hệt bản lưu thì không dirty", () => {
    expect(isDayDirty([{ "team-1-pos-1": "char-1" }], saved)).toBe(false);
  });

  it("vừa thêm trận 2 là dirty", () => {
    expect(isDayDirty([{ "team-1-pos-1": "char-1" }, {}], saved)).toBe(true);
  });

  it("vừa bỏ trận 2 là dirty", () => {
    expect(isDayDirty([{ "team-1-pos-1": "char-1" }], [...saved, {}])).toBe(
      true
    );
  });

  it("đổi người trong trận 2 là dirty", () => {
    expect(
      isDayDirty(
        [{ "team-1-pos-1": "char-1" }, { "team-1-pos-1": "char-9" }],
        [...saved, { "team-1-pos-1": "char-2" }]
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 4: Viết test cho `resolveActiveMatchIndex`**

Tạo `apps/web/features/team-builder/lib/__tests__/active-match.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { resolveActiveMatchIndex } from "../active-match";

describe("resolveActiveMatchIndex", () => {
  it("giữ nguyên khi chỉ số còn hợp lệ", () => {
    expect(resolveActiveMatchIndex(2, 1)).toBe(1);
  });

  it("kẹp về trận 1 khi ngày này chỉ có một trận", () => {
    expect(resolveActiveMatchIndex(1, 1)).toBe(0);
  });

  it("kẹp về trận 1 với chỉ số âm", () => {
    expect(resolveActiveMatchIndex(2, -1)).toBe(0);
  });

  it("ngày chưa có trận nào vẫn trả về 0", () => {
    expect(resolveActiveMatchIndex(0, 1)).toBe(0);
  });
});
```

- [ ] **Step 5: Viết test cho `buildPrefill` lấy trận cuối**

Trong `apps/web/features/team-builder/lib/__tests__/prefill.test.ts`: đổi helper `session()` — field mặc định `assignment: {}` thành `matches: []` — rồi đổi mọi chỗ dựng dữ liệu `assignment: {…}` thành `matches: [{…}]`. Thêm test:

```ts
it("lấy đội hình của trận cuối cùng trong ngày trước, không phải trận 1", () => {
  const tuesday = session({
    sessionId: "tue",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-07-21T13:30:00.000Z",
    matches: [
      { "team-1-pos-1": "char-1" },
      { "team-1-pos-1": "char-2", "team-1-pos-2": "char-3" },
    ],
  });
  const thursday = session({
    sessionId: "thu",
    label: "Thứ 5 · 20:30",
    dateTime: "2026-07-23T13:30:00.000Z",
  });

  const result = buildPrefill(
    [tuesday, thursday],
    "thu",
    new Set(["char-2", "char-3"]),
    SLOTS
  );

  expect(result?.assignment["team-1-pos-1"]).toBe("char-2");
  expect(result?.assignment["team-1-pos-2"]).toBe("char-3");
  expect(result?.sourceLabel).toBe("Thứ 3 · 20:30 · trận 2");
});

it("ngày trước chỉ có một trận thì nhãn không kèm số trận", () => {
  const tuesday = session({
    sessionId: "tue",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-07-21T13:30:00.000Z",
    matches: [{ "team-1-pos-1": "char-1" }],
  });
  const thursday = session({
    sessionId: "thu",
    dateTime: "2026-07-23T13:30:00.000Z",
  });

  const result = buildPrefill([tuesday, thursday], "thu", new Set(["char-1"]), SLOTS);

  expect(result?.sourceLabel).toBe("Thứ 3 · 20:30");
});
```

- [ ] **Step 6: Chạy test cho chắc là fail**

```bash
pnpm --filter web test
```
Expected: FAIL — `toWireMatches`, `fromWireMatches`, `isDayDirty`, `resolveActiveMatchIndex` chưa tồn tại; `prefill.ts` vẫn đọc `session.assignment`.

- [ ] **Step 7: Thêm hai hàm vào `wire.ts`**

Nối vào cuối `apps/web/features/team-builder/lib/wire.ts`:

```ts
/**
 * Strip empty slots from every match of a day before sending it.
 * @param matches - Line-up of each match, as the UI holds it
 * @returns Same order, each match carrying only its filled slots
 */
export function toWireMatches(matches: Assignment[]): WireAssignment[] {
  return matches.map(toWire);
}

/**
 * Rebuild a day's line-ups from what the server stored.
 * A day with nothing saved comes back as `[]`; it is normalised to one empty
 * match here so nothing downstream has to handle "no match at all".
 * @param wire - Matches as stored, only filled slots present
 * @param slots - Slots of the current layout
 * @returns One assignment per match, always at least one
 */
export function fromWireMatches(
  wire: WireAssignment[],
  slots: Slot[]
): Assignment[] {
  const source = wire.length > 0 ? wire : [{}];

  return source.map((match) => fromWire(match, slots));
}
```

- [ ] **Step 8: Thêm `isDayDirty` vào `formation-diff.ts`**

Nối vào cuối `apps/web/features/team-builder/lib/formation-diff.ts`:

```ts
/**
 * Whether a day's draft differs from what the server has stored.
 * The save button covers the whole day, so dirtiness has to as well — including
 * a match 2 that was just added or just removed.
 * @param draft - Draft for the day, undefined when it was never touched
 * @param saved - Matches as last read from the server
 * @returns true when the day holds unsaved changes
 */
export function isDayDirty(
  draft: Assignment[] | undefined,
  saved: Assignment[]
): boolean {
  if (!draft) return false;
  if (draft.length !== saved.length) return true;

  return draft.some((match, index) => isDirty(match, saved[index]));
}
```

- [ ] **Step 9: Tạo `active-match.ts`**

```ts
/**
 * Clamp the open sub-tab to a match that actually exists.
 * The index is kept as one value across days, so switching from a day with two
 * matches to a day with one would otherwise point at nothing.
 * @param matchCount - How many matches the open day has
 * @param stored - Sub-tab index remembered in the store
 * @returns A valid match index, 0 when nothing else fits
 */
export function resolveActiveMatchIndex(
  matchCount: number,
  stored: number
): number {
  if (stored < 0 || stored >= matchCount) return 0;

  return stored;
}
```

- [ ] **Step 10: Sửa `prefill.ts` lấy trận cuối của ngày trước**

Trong `apps/web/features/team-builder/lib/prefill.ts`, thay khối tìm nguồn và dựng `previous`:

```ts
  const source = sessions
    .slice(0, targetIndex)
    .reverse()
    .find((session) => session.matches.some((match) => Object.keys(match).length > 0));
  if (!source) return null;

  // Trận cuối cùng của ngày đó là đội hình gần hiện trạng nhất.
  const sourceMatch = source.matches[source.matches.length - 1];
  const sourceLabel =
    source.matches.length > 1
      ? `${source.label} · trận ${source.matches.length}`
      : source.label;
  const previous = fromWire(sourceMatch, slots);
```

và ở `return`, đổi `sourceLabel: source.label` thành `sourceLabel`.

Cập nhật JSDoc của `buildPrefill`: `@param sessions - Every battle day of the week, ordered by battle time`.

- [ ] **Step 11: Chạy test**

```bash
pnpm --filter web test
```
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add apps/web/features/team-builder/types apps/web/features/team-builder/lib
git commit -m "feat(web): teach the formation helpers about two matches a day

Wire conversion, the dirty check and the prefill now work on a day's list of
line-ups. A day with nothing saved normalises to a single empty match, so no
caller has to handle an empty list."
```

---

### Task 6: Store, API và hook điều phối

**Files:**
- Modify: `apps/web/features/team-builder/store/formation-store.ts`
- Modify: `apps/web/features/team-builder/api/team-builder-api.ts`
- Modify: `apps/web/features/team-builder/hooks/use-prefill.ts`
- Modify: `apps/web/features/team-builder/hooks/use-formation-screen.ts`

**Interfaces:**
- Consumes: mọi thứ Task 5 sinh ra; `useSaveFormation()` (chữ ký mutation không đổi, chỉ đổi kiểu input); `useSessionPool(characters, records, sessionId, assignment)` giữ nguyên.
- Produces: `useFormationScreen()` trả thêm `matchCount: number`, `activeMatchIndex: number`, `otherMatchIds: Set<string>`, `canAddMatch: boolean`, `setActiveMatch(index: number)`, `addMatch()`, `removeMatch()`; `dirty` và `resetActive` đổi phạm vi sang cả ngày.

- [ ] **Step 1: Sửa store**

Trong `apps/web/features/team-builder/store/formation-store.ts`, đổi interface và phần khởi tạo:

```ts
interface FormationState {
  /** Unsaved edits per battle day, keyed by session id. Missing key = untouched. */
  drafts: Record<string, Assignment[]>;
  /** Battle day whose tab is open */
  activeSessionId: string | null;
  /** Sub-tab open inside the day: 0 = match 1, 1 = match 2 */
  activeMatchIndex: number;
  /** Monday of the week on screen; null means the open week */
  selectedWeekStart: string | null;
  /** Switch to another day's tab, always landing on match 1 */
  setActiveSession: (sessionId: string) => void;
  /** Switch to another match inside the open day */
  setActiveMatch: (index: number) => void;
  /** Switch to another week; drafts of the previous week are dropped */
  setWeek: (weekStart: string | null) => void;
  /** Replace a day's draft outright — used by the prefill and by add/remove match */
  setDraft: (sessionId: string, matches: Assignment[]) => void;
  /** Discard a day's draft, falling back to the saved copy */
  clearDraft: (sessionId: string) => void;
  /** Resolve one drag gesture into one match of the day's draft */
  drop: (
    sessionId: string,
    matchIndex: number,
    base: Assignment[],
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
}
```

```ts
  drafts: {},
  activeSessionId: null,
  activeMatchIndex: 0,
  selectedWeekStart: null,
  setActiveSession: (sessionId) =>
    set({ activeSessionId: sessionId, activeMatchIndex: 0 }),
  setActiveMatch: (index) => set({ activeMatchIndex: index }),
  setWeek: (weekStart) =>
    set({
      selectedWeekStart: weekStart,
      drafts: {},
      activeSessionId: null,
      activeMatchIndex: 0,
    }),
```

`setDraft` và `clearDraft` giữ nguyên thân hàm (chỉ đổi kiểu). Thay `drop`:

```ts
  drop: (sessionId, matchIndex, base, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId] ?? base;
      const next = applyDrop(current[matchIndex], source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === current[matchIndex]) return state;

      const matches = current.map((match, index) =>
        index === matchIndex ? next : match
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
```

- [ ] **Step 2: Sửa API client**

Trong `apps/web/features/team-builder/api/team-builder-api.ts`:

```ts
/** Payload lưu đội hình cả ngày. */
export interface SaveFormationInput {
  /** ID ngày đánh cần lưu */
  sessionId: string;
  /** Đội hình từng trận, ô trống đã bị bỏ khoá */
  matches: WireAssignment[];
}
```

và trong `saveFormation`, đổi `body` thành:
```ts
      body: JSON.stringify({ matches: input.matches }),
```
Sửa JSDoc: `Ghi đè đội hình cả ngày (1 hoặc 2 trận).`

- [ ] **Step 3: Sửa `use-prefill.ts`**

Nháp bây giờ là mảng, và điều kiện "đã có bản lưu" xét theo cả ngày:

```ts
  const hasSaved = Boolean(
    active && active.matches.some((match) => Object.keys(match).length > 0)
  );
```

và trong `useEffect`:
```ts
    setDraft(activeSessionId, [proposal.assignment]);
```

Prefill luôn chỉ tạo **một** trận — ngày mới bắt đầu với một trận, muốn trận 2 thì bấm nút.

- [ ] **Step 4: Sửa `use-formation-screen.ts`**

Thay các import liên quan:
```ts
import { isDayDirty } from "../lib/formation-diff";
import { resolveActiveMatchIndex } from "../lib/active-match";
import { fromWire, fromWireMatches, toWireMatches } from "../lib/wire";
```
(`fromWire` vẫn cần cho `clearActiveDraft`; `toWire` thì không còn ai gọi ở file này.)
và đổi `const EMPTY_ASSIGNMENT: Assignment = {};` thành:
```ts
/** Stable stand-in while no battle day is selected, so memos do not rerun. */
const EMPTY_MATCHES: Assignment[] = [{}];
```

Lấy thêm hai thứ từ store, cạnh các selector đang có:
```ts
  const setActiveMatch = useFormationStore((s) => s.setActiveMatch);
  const storedMatchIndex = useFormationStore((s) => s.activeMatchIndex);
```

Đổi `savedBySession` / `assignments` / `dirtySessionIds` sang mảng:
```ts
  const savedBySession = useMemo(() => {
    const map: Record<string, Assignment[]> = {};

    for (const session of sessions) {
      map[session.sessionId] = fromWireMatches(session.matches, FORMATION.slots);
    }

    return map;
  }, [sessions]);

  const matchesBySession = useMemo(() => {
    const map: Record<string, Assignment[]> = {};

    for (const session of sessions) {
      map[session.sessionId] =
        drafts[session.sessionId] ?? savedBySession[session.sessionId];
    }

    return map;
  }, [sessions, drafts, savedBySession]);

  const dirtySessionIds = useMemo(() => {
    const dirty = new Set<string>();

    for (const session of sessions) {
      if (
        isDayDirty(drafts[session.sessionId], savedBySession[session.sessionId])
      ) {
        dirty.add(session.sessionId);
      }
    }

    return dirty;
  }, [sessions, drafts, savedBySession]);
```

Thay khối tính `assignment` bằng khối tính trận đang mở:
```ts
  const matches = useMemo(
    () =>
      (activeSessionId ? matchesBySession[activeSessionId] : null) ??
      EMPTY_MATCHES,
    [activeSessionId, matchesBySession]
  );

  const activeMatchIndex = resolveActiveMatchIndex(
    matches.length,
    storedMatchIndex
  );

  const assignment = matches[activeMatchIndex] ?? EMPTY_MATCHES[0];

  // Ai đang được xếp ở trận kia — để đánh dấu trên thẻ trong pool.
  const otherMatchIds = useMemo(() => {
    const ids = new Set<string>();

    matches.forEach((match, index) => {
      if (index === activeMatchIndex) return;
      for (const characterId of Object.values(match)) {
        if (characterId) ids.add(characterId);
      }
    });

    return ids;
  }, [matches, activeMatchIndex]);
```

`handleDragEnd` truyền thêm chỉ số trận:
```ts
    drop(
      activeSessionId,
      activeMatchIndex,
      matches,
      toDragSource(dragData),
      dragData.characterId,
      toDropTarget(event.over?.data.current)
    );
```

`handleSave` lưu cả ngày:
```ts
  /**
   * Persist the open day's draft — both matches at once.
   * A failed save keeps the draft: the toolbar shows the message and the user
   * can retry. A 409 means the day just crossed its start time, so refetch to
   * flip the screen into read-only.
   */
  async function handleSave() {
    if (!activeSessionId) return;

    try {
      await saveMutation.mutateAsync({
        sessionId: activeSessionId,
        matches: toWireMatches(matches),
      });
      clearDraft(activeSessionId);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === CONFLICT_STATUS) {
        void formationsQuery.refetch();
      }
    }
  }
```

Trong khối `return`, đổi/thêm:
```ts
    matches,
    matchCount: matches.length,
    activeMatchIndex,
    otherMatchIds,
    canAddMatch: editable && matches.length < 2,
    assignment,
    ...
    setActiveMatch,
    addMatch: () => {
      if (!activeSessionId || matches.length >= 2) return;
      // Clone nguyên vẹn, kể cả người đã báo nghỉ đang nằm trong ô — không bao
      // giờ tự gỡ người sau lưng người dùng.
      setDraft(activeSessionId, [...matches, { ...matches[0] }]);
      setActiveMatch(matches.length);
    },
    removeMatch: () => {
      if (!activeSessionId || matches.length < 2) return;
      setDraft(activeSessionId, [matches[0]]);
      setActiveMatch(0);
    },
    clearActiveDraft: () => {
      if (!activeSessionId) return;
      const cleared = matches.map(() => fromWire({}, FORMATION.slots));
      setDraft(activeSessionId, cleared);
    },
```
Xoá `assignments` khỏi giá trị trả về (không ai dùng nữa); `resetActive` giữ nguyên — `clearDraft` vốn đã xoá theo ngày nên đã đúng phạm vi "đặt lại cả ngày".

- [ ] **Step 5: Kiểm tra biên dịch và test**

```bash
pnpm --filter web test && pnpm --filter web exec tsc --noEmit
```
Expected: test PASS. `tsc` báo lỗi ở các **component** chưa sửa (`team-builder-screen.tsx` truyền `assignments`, `session-tabs.tsx` đọc `session.assignment`) — đúng như dự kiến, Task 7 sửa nốt. Không được có lỗi nào trong `store/`, `api/`, `hooks/`, `lib/`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/store apps/web/features/team-builder/api apps/web/features/team-builder/hooks
git commit -m "feat(web): hold a whole day's line-ups as one draft

Drafts, the dirty flag and the save button now cover both matches of a day, and
adding or removing match 2 is just a change in the draft's length."
```

---

### Task 7: Giao diện tab con và nút tạo/xoá trận 2

**Files:**
- Create: `apps/web/features/team-builder/components/match-tabs.tsx`
- Create: `apps/web/features/team-builder/components/delete-match-dialog.tsx`
- Modify: `apps/web/features/team-builder/components/session-tabs.tsx`
- Modify: `apps/web/features/team-builder/components/formation-toolbar.tsx`
- Modify: `apps/web/features/team-builder/components/member-pool.tsx`
- Modify: `apps/web/features/team-builder/components/member-card.tsx`
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx`

**Interfaces:**
- Consumes: mọi field `useFormationScreen()` trả về (Task 6).
- Produces: màn hình hoàn chỉnh. Không có API mới cho task sau.

- [ ] **Step 1: Tạo `delete-match-dialog.tsx`**

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteMatchDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user closes or confirms */
  onOpenChange: (open: boolean) => void;
  /** Remove match 2 from the day's draft */
  onConfirm: () => void;
}

/**
 * Confirm dropping match 2. Says plainly that nothing is gone until the day is
 * saved, since the save button covers the whole day.
 * @param open - Whether the dialog is open
 * @param onOpenChange - Called when the user closes or confirms
 * @param onConfirm - Remove match 2 from the day's draft
 * @returns The confirmation dialog
 */
export function DeleteMatchDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteMatchDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá trận 2 khỏi ngày này?</AlertDialogTitle>
          <AlertDialogDescription>
            Đội hình trận 2 sẽ mất khi bạn bấm Lưu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Xoá trận 2
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

> Nếu `@/components/ui/alert-dialog` chưa có trong dự án, thêm bằng `pnpm --filter web exec shadcn@latest add alert-dialog` rồi mới viết file này. Kiểm tra trước bằng `ls apps/web/components/ui/alert-dialog.tsx`.

- [ ] **Step 2: Tạo `match-tabs.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteMatchDialog } from "./delete-match-dialog";

interface MatchTabsProps {
  /** How many matches the open day has, 1 or 2 */
  matchCount: number;
  /** Match whose sub-tab is open, 0-based */
  activeMatchIndex: number;
  /** Whether match 2 still holds someone — decides if removing needs confirming */
  secondMatchHasMembers: boolean;
  /** Whether a second match can still be added */
  canAddMatch: boolean;
  /** Switch to another match */
  onSelect: (index: number) => void;
  /** Clone match 1 into a new match 2 */
  onAdd: () => void;
  /** Drop match 2 from the day */
  onRemove: () => void;
}

/**
 * Sub-tabs for the matches of one day, plus the button that creates match 2 by
 * cloning match 1 or removes it again.
 * @param matchCount - How many matches the open day has
 * @param activeMatchIndex - Match whose sub-tab is open
 * @param secondMatchHasMembers - Whether match 2 still holds someone
 * @param canAddMatch - Whether a second match can still be added
 * @param onSelect - Switch to another match
 * @param onAdd - Clone match 1 into a new match 2
 * @param onRemove - Drop match 2 from the day
 * @returns The match sub-tab row
 */
export function MatchTabs({
  matchCount,
  activeMatchIndex,
  secondMatchHasMembers,
  canAddMatch,
  onSelect,
  onAdd,
  onRemove,
}: MatchTabsProps) {
  const [confirming, setConfirming] = useState(false);

  // Một trận duy nhất và không thêm được nữa (tuần cũ, trận đã đánh) thì hàng
  // này không nói lên điều gì — ẩn hẳn.
  if (matchCount < 2 && !canAddMatch) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs
        value={String(activeMatchIndex)}
        onValueChange={(value) => onSelect(Number(value))}
      >
        <TabsList>
          {Array.from({ length: matchCount }, (_, index) => (
            <TabsTrigger key={index} value={String(index)}>
              Trận {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {canAddMatch ? (
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Tạo trận 2
        </Button>
      ) : null}

      {matchCount > 1 && activeMatchIndex === 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (secondMatchHasMembers ? setConfirming(true) : onRemove())}
        >
          <Trash2 className="size-4" />
          Xoá trận 2
        </Button>
      ) : null}

      <DeleteMatchDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={onRemove}
      />
    </div>
  );
}
```

- [ ] **Step 3: Badge số ô đã xếp trên tab ngày**

Trong `apps/web/features/team-builder/components/session-tabs.tsx`, thêm prop và helper. Thêm vào interface:

```ts
  /** Total slots of one match, for the "12/60" badge */
  slotCount: number;
```

Thêm hàm thuần ngay dưới interface:

```ts
/**
 * Progress label for a day: one count per match, e.g. "12/60 · 8/60".
 * @param matches - Saved line-up of each match of the day
 * @param slotCount - Total slots of one match
 * @returns The label, or null when the day has nothing saved
 */
function matchProgress(
  matches: Record<string, string>[],
  slotCount: number
): string | null {
  if (matches.length === 0) return null;

  return matches
    .map((match) => `${Object.keys(match).length}/${slotCount}`)
    .join(" · ");
}
```

Trong thân `map`, ngay sau `const subtitle = …`:
```ts
          const progress = matchProgress(session.matches, slotCount);
```
và đổi dòng subtitle cuối thành:
```tsx
              <span className="text-xs font-normal opacity-80">
                {progress ? `${subtitle} · ${progress}` : subtitle}
              </span>
```

- [ ] **Step 4: Nhãn "đang đánh trận N" trong pool**

Trong `member-card.tsx`, thêm prop:
```ts
  /** Short note shown under the name, e.g. "đang đánh trận 1" */
  note?: string;
```
và đổi khối tên thành:
```tsx
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {character.name}
              </span>
              {note ? (
                <span className="truncate text-xs text-muted-foreground">
                  {note}
                </span>
              ) : null}
            </span>
```
Nhớ nhận `note` trong tham số hàm và bổ sung dòng `@param note - Short note shown under the name, if any` vào JSDoc.

Trong `draggable-member.tsx`, ba sửa đổi:
- Thêm vào `DraggableMemberProps`, ngay dưới `warning?: string;`:
```ts
  /** Short note shown under the name, e.g. "đang đánh trận 1" */
  note?: string;
```
- Thêm `note` vào danh sách tham số: `export function DraggableMember({ character, from, warning, note }: DraggableMemberProps) {`, và thêm dòng `@param note - Short note shown under the name, if any` vào JSDoc.
- Đổi dòng cuối trong `return`: `<MemberCard character={character} warning={warning} note={note} />`.

Trong `member-pool.tsx`, thêm prop:
```ts
  /** Ids of members already placed in the day's other match */
  otherMatchIds: Set<string>;
  /** Which match is on screen, 0-based — decides what the note says */
  activeMatchIndex: number;
```
nhận trong tham số hàm, và trong vòng lặp render đổi thành:
```tsx
                {pool.map((character) => (
                  <DraggableMember
                    key={character.id}
                    character={character}
                    from={POOL_DROPPABLE_ID}
                    note={
                      otherMatchIds.has(character.id)
                        ? `đang đánh trận ${activeMatchIndex === 0 ? 2 : 1}`
                        : undefined
                    }
                  />
                ))}
```

- [ ] **Step 5: Đổi nhãn nút Lưu**

Trong `formation-toolbar.tsx`, đổi nhãn nút Lưu thành:
```tsx
        {saving ? "Đang lưu..." : "Lưu đội hình cả ngày"}
```
và đổi câu chỉ-đọc cho đúng nghĩa "ngày":
```tsx
        Ngày này đã đánh xong, chỉ xem lại được.
```

- [ ] **Step 6: Ghép vào màn hình**

Trong `team-builder-screen.tsx`:

- Thêm `import { MatchTabs } from "./match-tabs";`
- Thêm `slotCount={screen.slotCount}` vào `<SessionTabs …>`.
- Chèn `MatchTabs` ngay sau `<SessionTabs … />`:
```tsx
        <MatchTabs
          matchCount={screen.matchCount}
          activeMatchIndex={screen.activeMatchIndex}
          secondMatchHasMembers={
            Object.values(screen.matches[1] ?? {}).some(Boolean)
          }
          canAddMatch={screen.canAddMatch}
          onSelect={screen.setActiveMatch}
          onAdd={screen.addMatch}
          onRemove={screen.removeMatch}
        />
```
- Truyền hai prop mới cho pool:
```tsx
        <MemberPool
          pool={screen.pool}
          readOnly={!screen.editable}
          otherMatchIds={screen.otherMatchIds}
          activeMatchIndex={screen.activeMatchIndex}
        />
```

- [ ] **Step 7: Kiểm tra biên dịch, lint và test**

```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && pnpm --filter web test
```
Expected: PASS, không còn lỗi type nào.

- [ ] **Step 8: Chạy thử end-to-end bằng tay**

```bash
pnpm --filter api db:up
pnpm --filter api dev   # cửa sổ khác
pnpm --filter web dev   # cửa sổ khác
```
Mở `/xep-team` với tài khoản quản trị viên và xác nhận đúng bảy điều:

1. Ngày chưa xếp gì → chỉ hiện một lưới, có nút "Tạo trận 2".
2. Bấm "Tạo trận 2" → nhảy sang tab con Trận 2, đội hình y hệt trận 1.
3. Sửa vài ô ở trận 2 rồi bấm Lưu → tải lại trang, cả hai trận còn nguyên.
4. Xoá sạch người ở trận 2 rồi Lưu → tải lại trang, tab con Trận 2 **vẫn còn**.
5. Bấm "Xoá trận 2" → hỏi xác nhận (nếu còn người), đồng ý xong bấm Lưu → tải lại, chỉ còn một trận.
6. Thẻ trong pool của trận 2 hiện nhãn "đang đánh trận 1" với người đã xếp ở trận 1.
7. Bấm "Đặt lại" khi vừa tạo trận 2 mà chưa lưu → trận 2 biến mất.

- [ ] **Step 9: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(web): arrange a second match for a battle day

A sub-tab row appears inside the day tab, with a button that clones match 1 into
match 2 and one that drops it again. Pool cards say who is already playing the
other match."
```

---

## Ghi chú khi thực thi

- **Thứ tự bắt buộc:** Task 1 → 2 → 3 → 4 (Task 4 xoá bảng, chỉ an toàn khi Task 3 đã gỡ tham chiếu cuối cùng). Task 5 → 6 → 7 nối tiếp nhau. Nhánh backend (1–4) và nhánh web (5–7) độc lập nhau, làm song song được, nhưng màn hình chỉ chạy thật khi cả hai xong.
- **Sau Task 6, `tsc` báo lỗi ở component là bình thường** — Task 7 sửa nốt. Không có mốc nào khác được phép để lại lỗi type.
- Không tạo nhánh riêng, commit thẳng lên `main`.
