# Ghi chú theo ô trong đội hình — Implementation Plan

**Goal:** Mỗi ô của lưới đội hình có thêm một ô nhập text ngay bên cạnh người đứng ở đó; ghi chú lưu
cùng đội hình khi bấm Lưu, và ô trống vẫn ghi chú được.

**Architecture:** Ghi chú gắn vào **ô**, không gắn vào người — nên nó chỉ là một map `slotId → text`
chạy song song với `assignment`, và `lib/assignment.ts` (luật kéo–thả) không phải sửa. Bảng
`FormationSlot` được tái dùng: `characterId` thành nullable, thêm cột `note`; một hàng tồn tại khi ô
**có người HOẶC có ghi chú**. Wire format đổi từ `matches: Assignment[]` sang
`matches: { slots, notes }[]`. Phía web, nháp đổi từ `Assignment[]` sang `MatchDraft[]` — đây là phần
tốn công nhất, không phải cái ô nhập text.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod 4 (nestjs-zod) · Jest · Next.js App Router ·
TanStack Query · Zustand · Vitest · pnpm workspace.

**Spec:** [docs/superpowers/specs/2026-08-08-formation-slot-notes-design.md](../specs/2026-08-08-formation-slot-notes-design.md)

## Global Constraints

- Mọi chữ hiển thị cho người dùng **phải là tiếng Việt**. Tên file, tên biến, commit message bằng
  tiếng Anh.
- Comment và JSDoc: giữ đúng ngôn ngữ của file đang sửa (backend tiếng Việt, `apps/web/features/team-builder/lib`
  và `components` tiếng Anh — theo file, không đổi ngôn ngữ sẵn có).
- Type/schema dùng chung để ở `packages/shared`, không chép lại ở hai đầu.
- Frontend: server state → TanStack Query, nháp/UI state → Zustand. **Không bao giờ** để dữ liệu API
  trong Zustand.
- Backend: Controller → Service → Prisma (module team-builder không có tầng repository).
- Bố cục lưới (10 team × 6 ô) vẫn nằm hẳn ở frontend. Backend chỉ biết `slotId` là chuỗi.
- **Dừng lại sau mỗi task** để compact context. **Không chạy test/lint sau từng task** — gom lại chạy
  một lần duy nhất ở Task 6.
- Commit message tiếng Anh, **không** có dòng `Co-Authored-By`. Mỗi task một commit, commit thẳng lên
  `main`.
- Lệnh test cuối: `pnpm --filter api test`, `pnpm --filter web test`, `pnpm --filter api build`,
  `pnpm --filter web build`.

## Lệch so với spec (có chủ ý)

Ba chỗ spec nói một đằng, plan làm một nẻo — lý do ghi ngay đây để lúc review không phải đoán:

1. **`setNote` cần thêm tham số `base`.** Spec ghi `setNote(sessionId, matchIndex, slotId, text)`,
   nhưng store chỉ giữ *nháp*: ngày chưa đụng tới thì `drafts[sessionId]` là `undefined`. `drop` đã
   phải nhận `base` vì đúng lý do đó; `setNote` cũng vậy. Chữ ký thật:
   `setNote(sessionId, matchIndex, base, slotId, text)`.
2. **Ô nhập dùng `readOnly` chứ không `disabled`.** Spec ghi `disabled` khi read-only. Nhưng tuần cũ /
   trận đã đánh là lúc người ta **đọc** ghi chú nhiều nhất, mà `disabled` kèm `opacity-50` và chặn cả
   bôi đen. `readOnly` chặn sửa y hệt mà chữ vẫn rõ và copy được.
3. **Web import `NOTE_MAX_LENGTH` (giá trị runtime) từ `@shared/schemas`.** Mọi chỗ khác của
   `apps/web` chỉ `import type` từ đó, nên đây là lần đầu zod bị kéo vào bundle của web. Chấp nhận:
   đổi lại là con số 60 chỉ có một nguồn. Task 6 có bước build web để bắt lỗi resolve nếu có.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/prisma/migrations/<ts>_formation_slot_notes/migration.sql` | `characterId` nullable + cột `note` |
| `apps/web/features/team-builder/components/slot-note-input.tsx` | Ô nhập ghi chú của một ô |

**Sửa**

| File | Đổi gì |
|---|---|
| `apps/api/prisma/schema.prisma` | `characterId` nullable, thêm `note`, sửa comment bất biến |
| `packages/shared/schemas/formation.schema.ts` | `NOTE_MAX_LENGTH`, `notesSchema`, `matchSchema`, `MatchInput` |
| `apps/api/src/modules/team-builder/entities/formation.entity.ts` | `matches: MatchFormation[]` |
| `apps/api/src/modules/team-builder/team-builder.service.ts` | Đọc/ghi cột `note`, dựng hàng từ hợp hai tập khoá |
| `apps/api/src/modules/team-builder/team-builder.controller.ts` | Chỉ đổi kiểu tham số |
| `apps/web/features/team-builder/types/formation.ts` | Thêm `Notes`, `MatchDraft` |
| `apps/web/features/team-builder/types/session-formation.ts` | Thêm `WireNotes`, `WireMatch`; đổi `matches` |
| `apps/web/features/team-builder/lib/wire.ts` | `toWireNotes` / `fromWireNotes`, hai hàm matches đổi kiểu |
| `apps/web/features/team-builder/lib/formation-diff.ts` | Dirty khi assignment **hoặc** notes khác |
| `apps/web/features/team-builder/lib/prefill.ts` | `PrefillResult` mang thêm `notes` |
| `apps/web/features/team-builder/store/formation-store.ts` | `drafts: Record<string, MatchDraft[]>`, thêm `setNote` |
| `apps/web/features/team-builder/api/team-builder-api.ts` | `matches: WireMatch[]` |
| `apps/web/features/team-builder/hooks/use-prefill.ts` | Nháp mang cả notes |
| `apps/web/features/team-builder/hooks/use-formation-screen.ts` | Theo kiểu mới, expose `notes` + `setNote` |
| `apps/web/features/team-builder/components/formation-grid.tsx` | Nhận `notes` + `onNoteChange`, đổi breakpoint |
| `apps/web/features/team-builder/components/team-column.tsx` | Truyền note từng ô xuống |
| `apps/web/features/team-builder/components/slot-cell.tsx` | Chia hai nửa, `setNodeRef` chỉ bọc nửa trái |
| `apps/web/features/team-builder/components/team-builder-screen.tsx` | Nối `notes` / `setNote` |
| `apps/web/app/layout.tsx`, `apps/web/components/shared/site-header.tsx` | `max-w-5xl` → `max-w-[100rem]` |

**Test sửa:** `apps/web/features/team-builder/lib/__tests__/{wire,formation-diff,prefill}.test.ts`,
`apps/web/features/team-builder/store/__tests__/formation-store.test.ts`,
`apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`.

---

### Task 1: Cột `note` và `characterId` nullable

Chỉ động vào database. Sau task này chưa có code nào đọc/ghi `note` — đó là chủ ý, và cả repo vẫn
build được vì nới lỏng NOT NULL không phá kiểu nào đang dùng.

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_formation_slot_notes/migration.sql`
- Modify: `apps/api/src/generated/prisma/**` (Prisma sinh lại, có commit trong repo)

**Interfaces:**
- Consumes: `FormationSlot`, `FormationMatch`, `Character` hiện có.
- Produces: `FormationSlot.characterId: String?`, `FormationSlot.note: String?`, quan hệ
  `character` thành optional.

- [ ] **Step 1: Sửa model trong schema**

Trong `apps/api/prisma/schema.prisma`, thay nguyên khối `model FormationSlot` (kể cả dòng comment
`/// Một ô đã xếp người. Ô trống thì KHÔNG có hàng.` ngay trên nó) bằng:

```prisma
/// Một ô có người HOẶC có ghi chú. Ô vừa trống vừa không ghi gì thì KHÔNG có hàng.
model FormationSlot {
  matchId     String
  /// "team-1-pos-1" — bố cục lưới vẫn nằm hẳn ở frontend.
  slotId      String
  /// Null khi ô chỉ có ghi chú mà chưa xếp ai ("chừa cho X").
  characterId String?
  /// Ghi chú của người xếp team cho ô này. Null khi không ghi gì.
  note        String?

  match     FormationMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  character Character?     @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@id([matchId, slotId])
  @@index([characterId])
}
```

`model Character` không phải sửa: `formationSlots FormationSlot[]` vẫn đúng khi phía kia optional.

- [ ] **Step 2: Sinh migration mà chưa chạy**

```bash
cd apps/api && pnpm exec prisma migrate dev --create-only --name formation_slot_notes
```
Expected: in ra đường dẫn `prisma/migrations/<timestamp>_formation_slot_notes/migration.sql`,
database **chưa** bị đổi.

- [ ] **Step 3: Đối chiếu nội dung migration**

Mở file vừa sinh. Nội dung phải tương đương đúng hai câu này (Prisma có thể gộp thành một
`ALTER TABLE` hai mệnh đề — cũng được):

```sql
ALTER TABLE "FormationSlot" ALTER COLUMN "characterId" DROP NOT NULL;
ALTER TABLE "FormationSlot" ADD COLUMN "note" TEXT;
```

Nếu thấy bất kỳ `DROP TABLE`, `DROP COLUMN` hay câu nào xoá dữ liệu → dừng lại, schema đã bị sửa
nhầm chỗ khác.

- [ ] **Step 4: Chạy migration và sinh lại client**

```bash
cd apps/api && pnpm exec prisma migrate dev
```
Expected: `Your database is now in sync with your schema.` Không mất dữ liệu (cả hai câu đều là nới
lỏng/thêm cột).

> Database dev chưa chạy thì bật trước: `pnpm --filter api db:up`.

Client Prisma nằm trong `apps/api/src/generated/prisma` và **có commit trong repo**, nên phải chắc
chắn nó đã được sinh lại:

```bash
cd apps/api && pnpm exec prisma generate
git -C ../.. status --short apps/api/src/generated/prisma | head
```
Expected: có file trong `src/generated/prisma` bị sửa (ít nhất `models/FormationSlot.ts` và
`internal/class.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/src/generated/prisma
git commit -m "feat(api): let a formation slot carry a note without an occupant

A slot row now exists when the cell has someone OR has a note, so characterId
becomes nullable and a note column is added. Nothing reads the column yet."
```

---

### Task 2: Backend lưu và trả về ghi chú

Một task cho cả `packages/shared` và `apps/api`: đổi riêng schema dùng chung sẽ làm `apps/api` không
build được, nên hai phần này phải đi cùng nhau.

**Files:**
- Modify: `packages/shared/schemas/formation.schema.ts`
- Modify: `apps/api/src/modules/team-builder/entities/formation.entity.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts`
- Modify: `apps/api/src/modules/team-builder/team-builder.controller.ts`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: cột `note` (Task 1); `assignmentSchema` sẵn có; `formatSessionLabel`,
  `BattleSessionsService.getActiveWeekStart` / `.listByWeek`.
- Produces:
  - `NOTE_MAX_LENGTH = 60`, `notesSchema`, `matchSchema`, `MatchInput`;
    `saveFormationSchema = z.object({ matches: z.array(matchSchema).min(1).max(2) })`.
  - `MatchFormation { slots: Record<string,string>; notes: Record<string,string> }` và
    `SessionFormationEntity.matches: MatchFormation[]`.
  - `TeamBuilderService.saveFormation(sessionId: string, matches: MatchInput[], now?: Date)`.

- [ ] **Step 1: Đổi schema dùng chung**

Trong `packages/shared/schemas/formation.schema.ts`, giữ nguyên `assignmentSchema`, thay phần còn lại
từ `saveFormationSchema` trở xuống bằng:

```ts
/** Độ dài tối đa của một ghi chú — vừa bề ngang ô nhập trên lưới. */
export const NOTE_MAX_LENGTH = 60;

/**
 * Ghi chú theo ô: slotId → text.
 * Ô không ghi gì KHÔNG có khoá, giống hệt cách ô trống không có khoá ở assignment.
 * `.trim()` để một ô chỉ chứa khoảng trắng bị từ chối chứ không lưu thành ghi chú rỗng.
 */
export const notesSchema = z.record(
  z.string().min(1),
  z.string().trim().min(1).max(NOTE_MAX_LENGTH)
);

/** Một trận: ai đứng ở đâu, kèm ghi chú của từng ô. */
export const matchSchema = z.object({
  slots: assignmentSchema,
  notes: notesSchema,
});

/**
 * Body của PUT /team-builder/formations/:sessionId — đội hình CẢ NGÀY.
 * Một ngày có 1 hoặc 2 trận; trần 2 đặt ở đây chứ không ở cấu trúc bảng, nên
 * sau này muốn 3 trận chỉ phải sửa con số này.
 */
export const saveFormationSchema = z.object({
  matches: z.array(matchSchema).min(1).max(2),
});

/** Kiểu đội hình trên dây đã validate. */
export type AssignmentInput = z.infer<typeof assignmentSchema>;

/** Kiểu một trận (đội hình + ghi chú) đã validate. */
export type MatchInput = z.infer<typeof matchSchema>;

/** Kiểu body lưu đội hình đã validate. */
export type SaveFormationInput = z.infer<typeof saveFormationSchema>;
```

`slots` và `notes` đều **bắt buộc** — frontend luôn gửi cả hai, và cho phép thiếu chỉ tạo thêm một
nhánh `?? {}` ở mọi chỗ đọc.

- [ ] **Step 2: Đổi entity**

Trong `apps/api/src/modules/team-builder/entities/formation.entity.ts`, thêm interface mới lên đầu
file và đổi field `matches`:

```ts
/** Đội hình và ghi chú của một trận trong ngày. */
export interface MatchFormation {
  /** slotId → characterId. Ô trống không có khoá. */
  slots: Record<string, string>;
  /** slotId → ghi chú. Ô không ghi gì không có khoá. */
  notes: Record<string, string>;
}
```

```ts
  /**
   * Từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì và cũng chưa ghi chú gì.
   */
  matches: MatchFormation[];
```

- [ ] **Step 3: Viết test cho service**

Trong `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`:

**(a)** Mọi payload truyền vào `saveFormation` đang có dạng `[{ 'team-1-pos-1': 'char-1' }]` phải đổi
thành `[{ slots: { 'team-1-pos-1': 'char-1' }, notes: {} }]`, và `[{}]` thành
`[{ slots: {}, notes: {} }]`.

**(b)** Mọi kỳ vọng về `data.slots.create` phải mang đủ ba khoá. Ví dụ test
`'lưu hai trận thành hai FormationMatch, matchIndex 1 và 2'` đổi thành:

```ts
    expect(tx.formationMatch.create.mock.calls[0][0].data).toEqual({
      sessionId: 'session-thu',
      matchIndex: 1,
      slots: {
        create: [
          { slotId: 'team-1-pos-1', characterId: 'char-1', note: null },
        ],
      },
    });
```

**(c)** Mọi kỳ vọng về `result.matches` đổi sang dạng object, ví dụ
`expect(result.matches).toEqual([{ slots: { 'team-1-pos-1': 'char-1' }, notes: {} }])`.

**(d)** Trong `describe('TeamBuilderService.getFormations')`, mock `formationMatches` phải trả về hàng
có đủ `characterId` và `note`:

```ts
                    {
                      matchIndex: 1,
                      slots: [
                        {
                          slotId: 'team-1-pos-1',
                          characterId: 'char-1',
                          note: 'giữ buồng',
                        },
                        {
                          slotId: 'team-1-pos-4',
                          characterId: null,
                          note: 'chừa cho X',
                        },
                      ],
                    },
```
và test `'trả về hai trận của ngày, đúng thứ tự matchIndex'` đổi kỳ vọng theo đúng mock mới (trận 1
có `slots` một khoá và `notes` hai khoá, trận 2 giữ như cũ với `notes: {}`).

**(e)** Thêm ba test mới vào `describe('TeamBuilderService.saveFormation')`:

```ts
  it('ô chỉ có ghi chú mà chưa xếp ai vẫn được lưu', async () => {
    await service.saveFormation(
      'session-thu',
      [{ slots: {}, notes: { 'team-1-pos-4': 'chừa cho X' } }],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual([
      { slotId: 'team-1-pos-4', characterId: null, note: 'chừa cho X' },
    ]);
  });

  it('ô vừa có người vừa có ghi chú chỉ tạo một hàng', async () => {
    await service.saveFormation(
      'session-thu',
      [
        {
          slots: { 'team-1-pos-1': 'char-1' },
          notes: { 'team-1-pos-1': 'giữ buồng' },
        },
      ],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual([
      { slotId: 'team-1-pos-1', characterId: 'char-1', note: 'giữ buồng' },
    ]);
  });

  it('characterId không còn trong bang bị lọc nhưng ghi chú của ô đó vẫn giữ', async () => {
    const result = await service.saveFormation(
      'session-thu',
      [
        {
          slots: { 'team-1-pos-2': 'char-99' },
          notes: { 'team-1-pos-2': 'vào sau' },
        },
      ],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual([
      { slotId: 'team-1-pos-2', characterId: null, note: 'vào sau' },
    ]);
    expect(result.matches).toEqual([
      { slots: {}, notes: { 'team-1-pos-2': 'vào sau' } },
    ]);
  });
```

**(f)** Thêm một test vào `describe('TeamBuilderService.getFormations')`:

```ts
  it('hàng chỉ có ghi chú không lọt vào slots', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.matches[0].slots).not.toHaveProperty('team-1-pos-4');
    expect(saturday?.matches[0].notes['team-1-pos-4']).toBe('chừa cho X');
  });
```

- [ ] **Step 4: Sửa service**

Trong `apps/api/src/modules/team-builder/team-builder.service.ts`:

Đổi import kiểu — `AssignmentInput` không còn ai dùng ở file này:
```ts
import type { MatchInput } from '@guild/shared/schemas';
```
và thêm `MatchFormation` vào import từ `./entities/formation.entity`.

Thêm hàm thuần ở cấp module, ngay dưới hằng `DAY_MS`:

```ts
/** Một hàng FormationSlot sắp ghi xuống. */
interface SlotRow {
  slotId: string;
  characterId: string | null;
  note: string | null;
}

/**
 * Dựng các hàng FormationSlot của một trận.
 * Một hàng tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ, nên phải lấy hợp của hai tập
 * khoá — duyệt riêng slots sẽ đánh rơi ô chỉ có ghi chú.
 * @param match - Đội hình và ghi chú của một trận, characterId đã lọc sạch
 * @returns Mảng hàng để đưa vào nested create của Prisma
 */
function buildSlotRows(match: MatchFormation): SlotRow[] {
  const slotIds = new Set([
    ...Object.keys(match.slots),
    ...Object.keys(match.notes),
  ]);

  return [...slotIds].map((slotId) => ({
    slotId,
    characterId: match.slots[slotId] ?? null,
    note: match.notes[slotId] ?? null,
  }));
}
```

Trong `getFormations`, thay phần dựng `matches`:
```ts
      matches: session.formationMatches.map((match) => ({
        slots: Object.fromEntries(
          match.slots
            .filter((slot) => slot.characterId !== null)
            .map((slot) => [slot.slotId, slot.characterId as string]),
        ),
        notes: Object.fromEntries(
          match.slots
            .filter((slot) => slot.note !== null)
            .map((slot) => [slot.slotId, slot.note as string]),
        ),
      })),
```

Trong `saveFormation`: đổi chữ ký `matches: AssignmentInput[]` → `matches: MatchInput[]`, thêm dòng
`@param matches - Đội hình và ghi chú từng trận, theo thứ tự trận 1 → trận 2` (thay dòng `@param matches`
cũ), rồi thay khối lọc và khối transaction:

```ts
    // Lọc TRƯỚC khi ghi: một nhân vật vừa bị xoá khỏi bang mà còn trong nháp sẽ
    // làm cả câu insert vỡ vì khoá ngoại. Ghi chú của ô đó thì giữ nguyên —
    // ghi chú mô tả vị trí, không mô tả người.
    const knownIds = await this.loadCharacterIds();
    const cleaned: MatchFormation[] = matches.map((match) => ({
      slots: Object.fromEntries(
        Object.entries(match.slots).filter(([, characterId]) =>
          knownIds.has(characterId),
        ),
      ),
      notes: match.notes,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.formationMatch.deleteMany({ where: { sessionId } });

      for (const [index, match] of cleaned.entries()) {
        await tx.formationMatch.create({
          data: {
            sessionId,
            matchIndex: index + 1,
            slots: { create: buildSlotRows(match) },
          },
        });
      }
    });
```

Phần `return` cuối hàm không đổi — `matches: cleaned` đã đúng kiểu mới.

- [ ] **Step 5: Cập nhật controller**

Trong `apps/api/src/modules/team-builder/team-builder.controller.ts`, chỉ sửa JSDoc của
`saveFormation` (thân hàm không đổi):

```ts
  /**
   * Ghi đè đội hình cả ngày (1 hoặc 2 trận), kèm ghi chú theo ô.
   * @param sessionId - ID ngày đánh cần lưu
   * @param body - matches: đội hình và ghi chú từng trận, theo thứ tự
   * @returns Ngày đánh kèm đội hình vừa ghi
   */
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/schemas/formation.schema.ts apps/api/src/modules/team-builder
git commit -m "feat(api): save a per-slot note alongside the line-up

A match on the wire is now { slots, notes } instead of a bare slot map, and a
slot row is written whenever the cell has an occupant or a note. Notes survive
the character filter on purpose: a note describes the position, not the person."
```

---

### Task 3: Hàm thuần phía web

Bốn file thuần, test được ở `environment: "node"`. Gộp một task vì chúng là một nhóm và cùng phục vụ
Task 4.

**Files:**
- Modify: `apps/web/features/team-builder/types/formation.ts`
- Modify: `apps/web/features/team-builder/types/session-formation.ts`
- Modify: `apps/web/features/team-builder/lib/wire.ts`
- Modify: `apps/web/features/team-builder/lib/formation-diff.ts`
- Modify: `apps/web/features/team-builder/lib/prefill.ts`
- Test: `apps/web/features/team-builder/lib/__tests__/{wire,formation-diff,prefill}.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `Slot`, `WireAssignment`, `toWire`, `fromWire`, `isDirty` (đã có).
- Produces:
  - `Notes = Record<string, string>`, `MatchDraft { assignment; notes }`.
  - `WireNotes`, `WireMatch { slots; notes }`, `SessionFormation.matches: WireMatch[]`.
  - `toWireNotes(notes)`, `fromWireNotes(wire, slots)`;
    `toWireMatches(matches: MatchDraft[]): WireMatch[]`,
    `fromWireMatches(wire: WireMatch[], slots: Slot[]): MatchDraft[]`.
  - `isDayDirty(draft: MatchDraft[] | undefined, saved: MatchDraft[]): boolean`.
  - `PrefillResult` thêm field `notes: Notes`.

- [ ] **Step 1: Thêm type ở `types/formation.ts`**

Nối vào cuối file, ngay dưới `Assignment`:

```ts
/** Per-slot note. A slot with nothing written carries no key. */
export type Notes = Record<string, string>;

/** One match of a draft: who stands where, plus the note of each slot. */
export interface MatchDraft {
  /** Who stands in which slot */
  assignment: Assignment;
  /** Note of each slot, keyed by slot id */
  notes: Notes;
}
```

- [ ] **Step 2: Đổi type trên dây ở `types/session-formation.ts`**

Thêm ngay dưới `WireAssignment`:

```ts
/** Ghi chú trên dây: slotId → text. Ô không ghi gì không có khoá. */
export type WireNotes = Record<string, string>;

/** Một trận đúng như backend trả về: đội hình và ghi chú của nó. */
export interface WireMatch {
  /** slotId → characterId, ô trống không có khoá */
  slots: WireAssignment;
  /** slotId → ghi chú, ô không ghi gì không có khoá */
  notes: WireNotes;
}
```

và đổi field `matches` của `SessionFormation`:

```ts
  /**
   * Từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì và cũng chưa ghi chú gì.
   */
  matches: WireMatch[];
```

- [ ] **Step 3: Viết test cho `wire.ts`**

Trong `apps/web/features/team-builder/lib/__tests__/wire.test.ts`, đổi dòng import thành:

```ts
import type { Assignment, MatchDraft, Slot } from "../../types/formation";
import {
  fromWire,
  fromWireMatches,
  fromWireNotes,
  toWire,
  toWireMatches,
  toWireNotes,
} from "../wire";
```

Thay hai `describe` cuối file (`toWireMatches`, `fromWireMatches`) bằng:

```ts
describe("toWireNotes", () => {
  it("bỏ khoá của ghi chú rỗng và ghi chú chỉ có khoảng trắng", () => {
    expect(
      toWireNotes({
        "team-1-pos-1": "giữ buồng",
        "team-1-pos-2": "",
        "team-1-pos-3": "   ",
      })
    ).toEqual({ "team-1-pos-1": "giữ buồng" });
  });

  it("cắt khoảng trắng thừa hai đầu", () => {
    expect(toWireNotes({ "team-1-pos-1": "  vào sau  " })).toEqual({
      "team-1-pos-1": "vào sau",
    });
  });
});

describe("fromWireNotes", () => {
  it("bỏ ghi chú của slotId không còn trong bố cục", () => {
    expect(
      fromWireNotes(
        { "team-1-pos-1": "giữ buồng", "team-9-pos-9": "ô đã biến mất" },
        SLOTS
      )
    ).toEqual({ "team-1-pos-1": "giữ buồng" });
  });
});

describe("toWireMatches", () => {
  it("bỏ ô trống và ghi chú rỗng của từng trận, giữ nguyên thứ tự", () => {
    const matches: MatchDraft[] = [
      {
        assignment: { "team-1-pos-1": "char-1", "team-1-pos-2": null },
        notes: { "team-1-pos-1": "giữ buồng", "team-1-pos-2": "" },
      },
      {
        assignment: { "team-1-pos-1": null, "team-1-pos-2": "char-2" },
        notes: {},
      },
    ];

    expect(toWireMatches(matches)).toEqual([
      {
        slots: { "team-1-pos-1": "char-1" },
        notes: { "team-1-pos-1": "giữ buồng" },
      },
      { slots: { "team-1-pos-2": "char-2" }, notes: {} },
    ]);
  });
});

describe("fromWireMatches", () => {
  it("ngày chưa xếp gì vẫn cho một trận rỗng", () => {
    const result = fromWireMatches([], SLOTS);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      assignment: {
        "team-1-pos-1": null,
        "team-1-pos-2": null,
        "team-1-pos-3": null,
      },
      notes: {},
    });
  });

  it("dựng lại ghi chú đúng ô của từng trận", () => {
    const result = fromWireMatches(
      [
        {
          slots: { "team-1-pos-1": "char-1" },
          notes: { "team-1-pos-3": "chừa cho X" },
        },
        { slots: {}, notes: { "team-1-pos-1": "vào sau" } },
      ],
      SLOTS
    );

    expect(result[0].assignment["team-1-pos-1"]).toBe("char-1");
    expect(result[0].notes).toEqual({ "team-1-pos-3": "chừa cho X" });
    expect(result[1].assignment["team-1-pos-1"]).toBeNull();
    expect(result[1].notes).toEqual({ "team-1-pos-1": "vào sau" });
  });
});
```

- [ ] **Step 4: Viết lại hai hàm matches và thêm hai hàm notes trong `wire.ts`**

`toWire` và `fromWire` giữ nguyên. Thay hai hàm cuối file bằng bốn hàm:

```ts
/**
 * Strip blank notes before sending, and trim the ones that stay.
 * A slot the user typed into and then emptied must lose its key, or the server
 * would reject the payload — the schema has no room for an empty note.
 * @param notes - Notes as the UI holds them, possibly with blank entries
 * @returns Notes with only the non-blank ones, each trimmed
 */
export function toWireNotes(notes: Notes): WireNotes {
  const filled = Object.entries(notes)
    .map(([slotId, text]): [string, string] => [slotId, text.trim()])
    .filter(([, text]) => text !== "");

  return Object.fromEntries(filled);
}

/**
 * Rebuild the notes of one match from what the server stored.
 * Keys matching no current slot are dropped, so an old saved note survives a
 * layout change instead of hanging off a slot that no longer exists.
 * @param wire - Notes as stored, blank ones absent
 * @param slots - Slots of the current layout
 * @returns Notes keyed by slot id, absent where there is nothing written
 */
export function fromWireNotes(wire: WireNotes, slots: Slot[]): Notes {
  const notes: Notes = {};

  for (const slot of slots) {
    const text = wire[slot.id];
    if (text) notes[slot.id] = text;
  }

  return notes;
}

/**
 * Strip empty slots and blank notes from every match of a day before sending.
 * @param matches - Each match of the day, as the UI holds it
 * @returns Same order, each match carrying only its filled slots and notes
 */
export function toWireMatches(matches: MatchDraft[]): WireMatch[] {
  return matches.map((match) => ({
    slots: toWire(match.assignment),
    notes: toWireNotes(match.notes),
  }));
}

/**
 * Rebuild a day's matches from what the server stored.
 * A day with nothing saved comes back as `[]`; it is normalised to one empty
 * match here so nothing downstream has to handle "no match at all".
 * @param wire - Matches as stored
 * @param slots - Slots of the current layout
 * @returns One draft per match, always at least one
 */
export function fromWireMatches(wire: WireMatch[], slots: Slot[]): MatchDraft[] {
  const source = wire.length > 0 ? wire : [{ slots: {}, notes: {} }];

  return source.map((match) => ({
    assignment: fromWire(match.slots, slots),
    notes: fromWireNotes(match.notes, slots),
  }));
}
```

Đổi hai dòng import ở đầu file cho khớp:
```ts
import type { Assignment, MatchDraft, Notes, Slot } from "../types/formation";
import type {
  WireAssignment,
  WireMatch,
  WireNotes,
} from "../types/session-formation";
```

- [ ] **Step 5: Viết test cho `isDayDirty`**

Trong `apps/web/features/team-builder/lib/__tests__/formation-diff.test.ts`, thay nguyên
`describe("isDayDirty", …)` bằng:

```ts
describe("isDayDirty", () => {
  const saved: MatchDraft[] = [
    {
      assignment: { "team-1-pos-1": "char-1" },
      notes: { "team-1-pos-1": "giữ buồng" },
    },
  ];

  /**
   * Chép sâu một ngày đã lưu để test sửa thoải mái mà không đụng bản gốc.
   * @param matches - Ngày cần chép
   * @returns Bản sao độc lập
   */
  function copy(matches: MatchDraft[]): MatchDraft[] {
    return matches.map((match) => ({
      assignment: { ...match.assignment },
      notes: { ...match.notes },
    }));
  }

  it("chưa động vào thì không dirty", () => {
    expect(isDayDirty(undefined, saved)).toBe(false);
  });

  it("nháp giống hệt bản lưu thì không dirty", () => {
    expect(isDayDirty(copy(saved), saved)).toBe(false);
  });

  it("vừa thêm trận 2 là dirty", () => {
    expect(
      isDayDirty([...copy(saved), { assignment: {}, notes: {} }], saved)
    ).toBe(true);
  });

  it("đổi người là dirty", () => {
    const draft = copy(saved);
    draft[0].assignment["team-1-pos-1"] = "char-9";

    expect(isDayDirty(draft, saved)).toBe(true);
  });

  it("sửa ghi chú là dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-1"] = "vào sau";

    expect(isDayDirty(draft, saved)).toBe(true);
  });

  it("thêm ghi chú vào ô trống là dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-2"] = "chừa cho X";

    expect(isDayDirty(draft, saved)).toBe(true);
  });

  it("sửa ghi chú rồi sửa về như cũ thì hết dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-1"] = "vào sau";
    draft[0].notes["team-1-pos-1"] = "giữ buồng";

    expect(isDayDirty(draft, saved)).toBe(false);
  });

  it("gõ ghi chú rồi xoá trắng thì không tính là dirty", () => {
    const draft = copy(saved);
    draft[0].notes["team-1-pos-2"] = "";

    expect(isDayDirty(draft, saved)).toBe(false);
  });
});
```

Thêm `MatchDraft` vào dòng import type ở đầu file.

- [ ] **Step 6: Sửa `formation-diff.ts`**

`isDirty` giữ nguyên. Thay `isDayDirty` và thêm một hàm private trên nó:

```ts
/**
 * Whether two note maps differ. A slot with nothing written carries no key, so
 * a key holding "" counts as the same thing as no key at all — typing into a
 * note and clearing it again must not leave the day dirty.
 * @param draft - Notes of the draft match
 * @param saved - Notes as last read from the server
 * @returns true when the two differ
 */
function notesDiffer(draft: Notes, saved: Notes): boolean {
  const keys = new Set([...Object.keys(draft), ...Object.keys(saved)]);

  for (const key of keys) {
    if ((draft[key] ?? "").trim() !== (saved[key] ?? "").trim()) return true;
  }

  return false;
}

/**
 * Whether a day's draft differs from what the server has stored.
 * The save button covers the whole day, so dirtiness has to as well — including
 * a match 2 that was just added or just removed, and notes as much as people.
 * @param draft - Draft for the day, undefined when it was never touched
 * @param saved - Matches as last read from the server
 * @returns true when the day holds unsaved changes
 */
export function isDayDirty(
  draft: MatchDraft[] | undefined,
  saved: MatchDraft[]
): boolean {
  if (!draft) return false;
  if (draft.length !== saved.length) return true;

  return draft.some(
    (match, index) =>
      isDirty(match.assignment, saved[index].assignment) ||
      notesDiffer(match.notes, saved[index].notes)
  );
}
```

Đổi dòng import đầu file thành
`import type { Assignment, MatchDraft, Notes } from "../types/formation";`.

- [ ] **Step 7: Sửa `prefill.ts`**

Thêm field vào `PrefillResult`:

```ts
  /** Notes copied along with the line-up, keyed by slot id */
  notes: Notes;
```

Thay khối tìm nguồn và dựng `previous`:

```ts
  // Nguồn xét theo ĐỘI HÌNH, không xét ghi chú: một ngày chỉ có ghi chú thì
  // không có gì để chép sang.
  const source = sessions
    .slice(0, targetIndex)
    .reverse()
    .find((session) =>
      session.matches.some((match) => Object.keys(match.slots).length > 0)
    );
  if (!source) return null;

  // Trận cuối cùng của ngày đó là đội hình gần hiện trạng nhất.
  const sourceMatch = source.matches[source.matches.length - 1];
  const sourceLabel =
    source.matches.length > 1
      ? `${source.label} · trận ${source.matches.length}`
      : source.label;
  const previous = fromWire(sourceMatch.slots, slots);
  // Ghi chú đi theo nguyên vẹn, kể cả ghi chú của ô mà người đứng đó đã báo
  // nghỉ: ghi chú mô tả vị trí, không mô tả người.
  const notes = fromWireNotes(sourceMatch.notes, slots);
```

và đổi dòng `return` cuối thành `return { assignment, notes, sourceLabel, droppedCount };`.

Đổi import: `import type { Assignment, Notes, Slot } from "../types/formation";` và
`import { fromWire, fromWireNotes } from "./wire";`.

- [ ] **Step 8: Sửa test của `prefill.ts`**

Trong `apps/web/features/team-builder/lib/__tests__/prefill.test.ts`:

- Helper `session()`: mặc định `matches: []` giữ nguyên; mọi chỗ dựng dữ liệu
  `matches: [{ "team-1-pos-1": "char-1" }]` đổi thành
  `matches: [{ slots: { "team-1-pos-1": "char-1" }, notes: {} }]`.
- Thêm test:

```ts
it("chép ghi chú sang trận mới, kể cả ghi chú của ô có người bị gỡ vì báo nghỉ", () => {
  const tuesday = session({
    sessionId: "tue",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-07-21T13:30:00.000Z",
    matches: [
      {
        slots: { "team-1-pos-1": "char-1", "team-1-pos-2": "char-2" },
        notes: { "team-1-pos-1": "giữ buồng", "team-1-pos-2": "vào sau" },
      },
    ],
  });
  const thursday = session({
    sessionId: "thu",
    dateTime: "2026-07-23T13:30:00.000Z",
  });

  const result = buildPrefill(
    [tuesday, thursday],
    "thu",
    new Set(["char-1"]),
    SLOTS
  );

  expect(result?.assignment["team-1-pos-2"]).toBeNull();
  expect(result?.droppedCount).toBe(1);
  expect(result?.notes).toEqual({
    "team-1-pos-1": "giữ buồng",
    "team-1-pos-2": "vào sau",
  });
});

it("ngày trước chỉ có ghi chú, không có ai, thì không phải nguồn để chép", () => {
  const tuesday = session({
    sessionId: "tue",
    dateTime: "2026-07-21T13:30:00.000Z",
    matches: [{ slots: {}, notes: { "team-1-pos-1": "chừa cho X" } }],
  });
  const thursday = session({
    sessionId: "thu",
    dateTime: "2026-07-23T13:30:00.000Z",
  });

  expect(buildPrefill([tuesday, thursday], "thu", new Set(), SLOTS)).toBeNull();
});
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/features/team-builder/types apps/web/features/team-builder/lib
git commit -m "feat(web): carry per-slot notes through the formation helpers

A match is now a draft of an assignment plus its notes. Blank notes lose their
key on the way out, the same way empty slots already did, and the dirty check
treats an edited note as an edited day."
```

---

### Task 4: Store, API client và hook điều phối

**Files:**
- Modify: `apps/web/features/team-builder/store/formation-store.ts`
- Modify: `apps/web/features/team-builder/api/team-builder-api.ts`
- Modify: `apps/web/features/team-builder/hooks/use-prefill.ts`
- Modify: `apps/web/features/team-builder/hooks/use-formation-screen.ts`
- Test: `apps/web/features/team-builder/store/__tests__/formation-store.test.ts`

**Interfaces:**
- Consumes: mọi thứ Task 3 sinh ra; `applyDrop` (không đổi).
- Produces:
  - `FormationState.drafts: Record<string, MatchDraft[]>`; `drop` nhận `base: MatchDraft[]`;
    action mới `setNote(sessionId, matchIndex, base, slotId, text)`.
  - `SaveFormationInput.matches: WireMatch[]`.
  - `useFormationScreen()` trả thêm `notes: Notes` và `setNote(slotId, text)`.

- [ ] **Step 1: Viết test cho store**

Trong `apps/web/features/team-builder/store/__tests__/formation-store.test.ts`:

- Đổi fixture đầu file:
```ts
const SAVED: Assignment = {
  "team-1-pos-1": "char-1",
  "team-1-pos-2": null,
};

/** Ngày một trận, dùng làm bản đã lưu trong hầu hết các test. */
const ONE_MATCH: MatchDraft[] = [{ assignment: SAVED, notes: {} }];
```
và thêm `MatchDraft` vào import type.
- Mọi kỳ vọng `drafts.<id>` đang ở dạng `[{ …assignment… }]` đổi thành
  `[{ assignment: { … }, notes: {} }]`.
- Thêm `describe` mới:

```ts
describe("setNote", () => {
  it("ghi chú đầu tiên dựng nháp từ bản đã lưu", () => {
    useFormationStore
      .getState()
      .setNote("sat", 0, ONE_MATCH, "team-1-pos-2", "chừa cho X");

    expect(useFormationStore.getState().drafts.sat).toEqual([
      { assignment: SAVED, notes: { "team-1-pos-2": "chừa cho X" } },
    ]);
  });

  it("xoá trắng ghi chú thì bỏ hẳn khoá", () => {
    const store = useFormationStore.getState();
    store.setNote("sat", 0, ONE_MATCH, "team-1-pos-1", "giữ buồng");
    useFormationStore
      .getState()
      .setNote("sat", 0, ONE_MATCH, "team-1-pos-1", "  ");

    expect(useFormationStore.getState().drafts.sat[0].notes).toEqual({});
  });

  it("chỉ chạm đúng trận đang mở, không đụng trận kia", () => {
    const twoMatches: MatchDraft[] = [
      { assignment: SAVED, notes: { "team-1-pos-1": "giữ buồng" } },
      { assignment: SAVED, notes: { "team-1-pos-1": "vào sau" } },
    ];

    useFormationStore
      .getState()
      .setNote("sat", 1, twoMatches, "team-1-pos-1", "tank");

    const drafts = useFormationStore.getState().drafts.sat;
    expect(drafts[0].notes).toEqual({ "team-1-pos-1": "giữ buồng" });
    expect(drafts[1].notes).toEqual({ "team-1-pos-1": "tank" });
  });

  it("không đụng gì khi chỉ số trận nằm ngoài khoảng", () => {
    useFormationStore
      .getState()
      .setNote("sat", 5, ONE_MATCH, "team-1-pos-1", "giữ buồng");

    expect(useFormationStore.getState().drafts.sat).toBeUndefined();
  });

  it("kéo thả không xoá mất ghi chú đã gõ", () => {
    const store = useFormationStore.getState();
    store.setNote("sat", 0, ONE_MATCH, "team-1-pos-2", "chừa cho X");
    useFormationStore
      .getState()
      .drop("sat", 0, ONE_MATCH, { kind: "pool" }, "char-9", {
        kind: "slot",
        slotId: "team-1-pos-2",
      });

    const draft = useFormationStore.getState().drafts.sat[0];
    expect(draft.assignment["team-1-pos-2"]).toBe("char-9");
    expect(draft.notes).toEqual({ "team-1-pos-2": "chừa cho X" });
  });
});
```

- [ ] **Step 2: Sửa store**

Trong `apps/web/features/team-builder/store/formation-store.ts`, đổi import type thành
`import type { DragSource, DropTarget, MatchDraft } from "../types/formation";`, rồi trong
`FormationState` đổi ba dòng và thêm một action:

```ts
  /** Unsaved edits per battle day, keyed by session id. Missing key = untouched. */
  drafts: Record<string, MatchDraft[]>;
```
```ts
  /** Replace a day's draft outright — used by the prefill and by add/remove match */
  setDraft: (sessionId: string, matches: MatchDraft[]) => void;
```
```ts
  /** Resolve one drag gesture into one match of the day's draft */
  drop: (
    sessionId: string,
    matchIndex: number,
    base: MatchDraft[],
    source: DragSource,
    characterId: string,
    target: DropTarget
  ) => void;
  /**
   * Write the note of one slot in one match.
   * Takes `base` for the same reason `drop` does: the day may have no draft yet,
   * and the first note typed has to build one from the saved copy.
   */
  setNote: (
    sessionId: string,
    matchIndex: number,
    base: MatchDraft[],
    slotId: string,
    text: string
  ) => void;
```

Thay `drop` và thêm `setNote`:

```ts
  drop: (sessionId, matchIndex, base, source, characterId, target) =>
    set((state) => {
      const current = state.drafts[sessionId] ?? base;
      const match = current[matchIndex];
      if (!match) return state;

      const next = applyDrop(match.assignment, source, characterId, target);

      // applyDrop returns the same reference for an out-of-bounds drop.
      if (next === match.assignment) return state;

      const matches = current.map((item, index) =>
        index === matchIndex ? { ...item, assignment: next } : item
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
  setNote: (sessionId, matchIndex, base, slotId, text) =>
    set((state) => {
      const current = state.drafts[sessionId] ?? base;
      const match = current[matchIndex];
      if (!match) return state;

      const notes = { ...match.notes };
      // A slot cleared back to blank loses its key, the same way an empty slot
      // carries no key in the assignment. The raw text is kept otherwise, so
      // typing a space mid-sentence is not swallowed.
      if (text.trim() === "") delete notes[slotId];
      else notes[slotId] = text;

      const matches = current.map((item, index) =>
        index === matchIndex ? { ...item, notes } : item
      );

      return { drafts: { ...state.drafts, [sessionId]: matches } };
    }),
```

- [ ] **Step 3: Sửa API client**

Trong `apps/web/features/team-builder/api/team-builder-api.ts`, đổi import type
`WireAssignment` → `WireMatch` và field của `SaveFormationInput`:

```ts
  /** Từng trận: đội hình đã bỏ ô trống, và ghi chú đã bỏ ô để rỗng */
  matches: WireMatch[];
```

Thân `saveFormation` không đổi. Sửa JSDoc:
`Ghi đè đội hình cả ngày (1 hoặc 2 trận), kèm ghi chú theo ô.`

- [ ] **Step 4: Sửa `use-prefill.ts`**

Đổi điều kiện `hasSaved` (một ngày chỉ mới ghi chú cũng là đã có dữ liệu — đừng đè lên):

```ts
  const hasSaved = Boolean(
    active &&
      active.matches.some(
        (match) =>
          Object.keys(match.slots).length > 0 ||
          Object.keys(match.notes).length > 0
      )
  );
```

và trong `useEffect`:
```ts
    // Ngày mới bắt đầu với một trận; muốn trận 2 thì bấm nút "Tạo trận 2".
    setDraft(activeSessionId, [
      { assignment: proposal.assignment, notes: proposal.notes },
    ]);
```

- [ ] **Step 5: Sửa `use-formation-screen.ts`**

Đổi import type: `import type { MatchDraft, Notes } from "../types/formation";`
(`Assignment` không còn dùng trực tiếp ở file này).

Đổi hằng số:
```ts
/** Stable stand-in while no battle day is selected, so memos do not rerun. */
const EMPTY_MATCHES: MatchDraft[] = [{ assignment: {}, notes: {} }];
```

Lấy thêm action từ store, cạnh `drop` (đặt tên khác để không đè handler cùng tên trả ra dưới):
```ts
  const setNoteInStore = useFormationStore((s) => s.setNote);
```

Đổi kiểu ba map — chỉ đổi annotation, thân giữ nguyên:
```ts
    const map: Record<string, MatchDraft[]> = {};
```
(xuất hiện hai lần: `savedBySession` và `matchesBySession`).

Thay khối tính `assignment` và `otherMatchIds`:
```ts
  const activeMatch = matches[activeMatchIndex] ?? EMPTY_MATCHES[0];
  const assignment = activeMatch.assignment;
  const notes = activeMatch.notes;

  // Ai đang được xếp ở trận kia — để đánh dấu trên thẻ trong pool.
  const otherMatchIds = useMemo(() => {
    const ids = new Set<string>();

    matches.forEach((match, index) => {
      if (index === activeMatchIndex) return;
      for (const characterId of Object.values(match.assignment)) {
        if (characterId) ids.add(characterId);
      }
    });

    return ids;
  }, [matches, activeMatchIndex]);
```

Thêm handler ngay dưới `handleDragEnd`:
```ts
  /**
   * Write the note of one slot in the match currently open.
   * @param slotId - Slot the note belongs to
   * @param text - New text, raw as typed
   */
  function handleNoteChange(slotId: string, text: string) {
    if (!activeSessionId) return;

    setNoteInStore(activeSessionId, activeMatchIndex, matches, slotId, text);
  }
```

Trong khối `return`, thêm hai dòng cạnh `assignment`:
```ts
    assignment,
    notes,
```
và cạnh `setActiveMatch`:
```ts
    setNote: handleNoteChange,
```

Đổi `addMatch` (clone cả ghi chú) và `clearActiveDraft` (xoá cả ghi chú):
```ts
    addMatch: () => {
      if (!activeSessionId || matches.length >= MAX_MATCHES) return;
      // Clone nguyên vẹn, kể cả người đã báo nghỉ đang nằm trong ô — không bao
      // giờ tự gỡ người sau lưng người dùng. Ghi chú đi theo y hệt.
      setDraft(activeSessionId, [
        ...matches,
        {
          assignment: { ...matches[0].assignment },
          notes: { ...matches[0].notes },
        },
      ]);
      setActiveMatch(matches.length);
    },
```
```ts
    clearActiveDraft: () => {
      if (!activeSessionId) return;
      const cleared = matches.map(() => ({
        assignment: fromWire({}, FORMATION.slots),
        notes: {} as Notes,
      }));
      setDraft(activeSessionId, cleared);
    },
```

`handleSave`, `handleDragEnd`, `removeMatch`, `dirtySessionIds` không phải sửa — `toWireMatches` và
`isDayDirty` đã nhận đúng kiểu mới.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/store apps/web/features/team-builder/api apps/web/features/team-builder/hooks
git commit -m "feat(web): hold per-slot notes in the formation draft

Drafts move from a list of assignments to a list of matches, each pairing an
assignment with its notes, and a setNote action writes one slot at a time.
Adding match 2 and the prefill both copy the notes along with the line-up."
```

---

### Task 5: Ô nhập ghi chú trên lưới

**Files:**
- Create: `apps/web/features/team-builder/components/slot-note-input.tsx`
- Modify: `apps/web/features/team-builder/components/slot-cell.tsx`
- Modify: `apps/web/features/team-builder/components/team-column.tsx`
- Modify: `apps/web/features/team-builder/components/formation-grid.tsx`
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/components/shared/site-header.tsx`

**Interfaces:**
- Consumes: `notes` và `setNote` từ `useFormationScreen()` (Task 4); `NOTE_MAX_LENGTH` từ
  `@shared/schemas`; `Input` của shadcn.
- Produces: `SlotNoteInput`; `FormationGrid` / `TeamColumn` / `SlotCell` nhận thêm `notes`
  (hoặc `note`) và `onNoteChange`.

- [ ] **Step 1: Tạo `slot-note-input.tsx`**

```tsx
"use client";

import { NOTE_MAX_LENGTH } from "@shared/schemas";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SlotNoteInputProps {
  /** Slot this note belongs to */
  slotId: string;
  /** Current text, empty string when the slot has no note */
  value: string;
  /** Render uneditable — a past week or a battle already fought */
  readOnly?: boolean;
  /** Called with the raw text on every keystroke */
  onChange: (slotId: string, text: string) => void;
}

/**
 * Free-text note for one slot, sitting next to the slot's drop area.
 * Capped with `maxLength` rather than a validation message: the schema rejects
 * anything longer, and a cap the user can feel beats an error after the fact.
 * Read-only uses the `readOnly` attribute, not `disabled`, so notes of a past
 * battle stay legible and selectable.
 * @param slotId - Slot this note belongs to
 * @param value - Current text
 * @param readOnly - Render uneditable
 * @param onChange - Called with the raw text on every keystroke
 * @returns Text input for the slot's note
 */
export function SlotNoteInput({
  slotId,
  value,
  readOnly = false,
  onChange,
}: SlotNoteInputProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(slotId, event.target.value)}
      readOnly={readOnly}
      maxLength={NOTE_MAX_LENGTH}
      placeholder="Ghi chú"
      aria-label="Ghi chú cho ô này"
      className={cn(
        "h-8 text-xs",
        readOnly && "cursor-default border-transparent bg-muted/30 shadow-none"
      )}
    />
  );
}
```

- [ ] **Step 2: Chia `slot-cell.tsx` làm hai nửa**

Thêm hai prop và JSDoc tương ứng:
```ts
  /** Note written for this slot, empty string when there is none */
  note: string;
  /** Called with the raw text when the note changes */
  onNoteChange: (slotId: string, text: string) => void;
```

Thay khối `return`. **Điểm dễ sai:** `setNodeRef` phải chỉ bọc nửa trái — bọc cả hàng thì ô nhập
text cũng trở thành vùng thả người.

```tsx
  return (
    <div className="flex items-center gap-2">
      <div
        ref={setNodeRef}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center rounded-md transition-colors",
          !character && "border border-dashed border-border bg-muted/30",
          !readOnly && isOver && "ring-2 ring-primary"
        )}
      >
        {character ? (
          readOnly ? (
            <MemberCard character={character} warning={absentReason} />
          ) : (
            <DraggableMember
              character={character}
              from={slot.id}
              warning={absentReason}
            />
          )
        ) : (
          <SlotPlaceholder slot={slot} />
        )}
      </div>
      <div className="w-[40%] shrink-0">
        <SlotNoteInput
          slotId={slot.id}
          value={note}
          readOnly={readOnly}
          onChange={onNoteChange}
        />
      </div>
    </div>
  );
```

Thêm `import { SlotNoteInput } from "./slot-note-input";` và hai prop vào phần destructure.

- [ ] **Step 3: Truyền note qua `team-column.tsx`**

Thêm hai prop (`notes: Notes`, `onNoteChange`) kèm JSDoc, thêm
`import type { Notes, Slot } from "../types/formation";`, và trong vòng lặp truyền xuống:

```tsx
            <SlotCell
              key={slot.id}
              slot={slot}
              character={character}
              readOnly={readOnly}
              note={notes[slot.id] ?? ""}
              onNoteChange={onNoteChange}
              absentReason={
                character && absentIds.has(character.id)
                  ? "Đã báo nghỉ trận này"
                  : undefined
              }
            />
```

- [ ] **Step 4: Sửa `formation-grid.tsx`**

Thêm hai prop và JSDoc:
```ts
  /** Notes currently shown, keyed by slot id */
  notes: Notes;
  /** Called with the raw text when a slot's note changes */
  onNoteChange: (slotId: string, text: string) => void;
```

Truyền xuống `TeamColumn` (`notes={notes}`, `onNoteChange={onNoteChange}`), và đổi class của lưới:

```tsx
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
```

Mỗi cột giờ chứa hai thứ nên cần ~300px mới đọc được; giữ 5 cột ở màn 1280px sẽ bóp nát cả tên lẫn
ghi chú. Cập nhật đoạn JSDoc mô tả "five per row on large screens" cho khớp.

- [ ] **Step 5: Nối vào `team-builder-screen.tsx`**

```tsx
        <FormationGrid
          assignment={screen.assignment}
          notes={screen.notes}
          onNoteChange={screen.setNote}
          charactersById={screen.charactersById}
          readOnly={!screen.editable}
          absentIds={screen.absentIds}
        />
```

và sửa prop của `MatchTabs` cho khớp kiểu mới:
```tsx
          secondMatchHasMembers={Object.values(
            screen.matches[1]?.assignment ?? {}
          ).some(Boolean)}
```

- [ ] **Step 6: Nới chiều ngang toàn app**

- `apps/web/app/layout.tsx`: `max-w-5xl` → `max-w-[100rem]` trong class của `<main>`.
- `apps/web/components/shared/site-header.tsx`: `max-w-5xl` → `max-w-[100rem]` để header vẫn thẳng
  hàng với nội dung.

Kiểm tra không sót chỗ nào:
```bash
grep -rn "max-w-5xl" apps/web/app apps/web/components
```
Expected: không có kết quả nào.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/team-builder/components apps/web/app/layout.tsx apps/web/components/shared/site-header.tsx
git commit -m "feat(web): put a note field next to every formation slot

Each cell splits into a drop area and a text field; the droppable ref moves to
the left half so typing a note never reads as a drop target. The grid drops to
three columns below 1600px and the app shell widens to match, since a column
now holds two things instead of one."
```

---

### Task 6: Chạy test, build và xem thật

Task duy nhất chạy test — năm task trên chỉ viết code và test, không chạy.

- [ ] **Step 1: Test backend**

```bash
pnpm --filter api test
```
Expected: PASS.

- [ ] **Step 2: Test frontend**

```bash
pnpm --filter web test
```
Expected: PASS.

- [ ] **Step 3: Build cả hai**

```bash
pnpm --filter api build && pnpm --filter web build
```
Expected: PASS. Bước build web là chỗ bắt lỗi nếu `NOTE_MAX_LENGTH` (giá trị runtime, không phải
type) không resolve được qua alias `@shared/schemas` — xem mục "Lệch so với spec" ở đầu plan. Vỡ ở
đây thì cách sửa gọn nhất là khai báo `NOTE_MAX_LENGTH` trong một file không import zod ở
`packages/shared` và re-export lại từ `schemas/formation.schema.ts`.

- [ ] **Step 4: Xem thật trên trình duyệt**

```bash
pnpm --filter api start:dev
pnpm --filter web dev
```
Mở trang Xếp team và kiểm bằng mắt:

1. Mỗi ô có một ô nhập bên phải; gõ ghi chú vào **ô trống** cũng được.
2. Kéo người từ ô 1 sang ô 2 → ghi chú **ở lại** ô 1.
3. Gõ ghi chú → nút Lưu sáng lên (dirty); bấm Lưu, F5 → ghi chú còn nguyên.
4. Bấm "Tạo trận 2" → ghi chú của trận 1 được chép sang; sửa ghi chú trận 2 không đụng trận 1.
5. Ô nhập đã đủ 60 ký tự thì không gõ thêm được.
6. Mở một tuần cũ → ô nhập không sửa được nhưng chữ vẫn đọc rõ.
7. Màn ≥1600px: lưới vẫn là 2 hàng × 5 cột, header thẳng hàng với nội dung.

- [ ] **Step 5: Commit nếu Step 1–4 phải sửa gì**

```bash
git add -A
git commit -m "fix(web): <mô tả cái đã sửa>"
```

Không phải sửa gì thì bỏ qua bước này — plan đã xong.

---

## Ngoài phạm vi

- Ghi chú ở cấp team hoặc cấp trận (chỉ có ghi chú theo ô).
- Rich text, xuống dòng, emoji picker — một dòng text thuần.
- Lịch sử chỉnh sửa ghi chú.
- Hiển thị ghi chú ở màn Điểm danh.
