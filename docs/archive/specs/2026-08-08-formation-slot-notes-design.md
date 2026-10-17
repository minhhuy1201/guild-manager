# Ghi chú theo ô trong đội hình — Design

Ngày: 2026-08-08 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Trang Xếp team hiện chỉ ghi được **ai đứng ở đâu**. Người xếp team còn cần ghi kèm thông tin ngắn cho
từng vị trí — "giữ buồng", "vào sau", "acc phụ" — mà hiện phải nhớ trong đầu hoặc ghi ra ngoài.

Spec này thêm một **ô nhập text cho mỗi ô của đội hình**, nằm ngay cạnh người đứng ở ô đó, lưu cùng
đội hình khi bấm Lưu.

## Bối cảnh

Trạng thái hiện tại, sau các spec trước:

- [per-session-formation](./2026-08-02-per-session-formation-design.md) — mỗi ngày đánh một đội hình,
  bố cục lưới là dữ liệu tĩnh ở frontend (`lib/mock-formation.ts`), user chỉ sửa `Assignment`
  (`slotId → characterId`).
- [two-matches-per-day](./2026-08-07-two-matches-per-day-design.md) — mỗi ngày 1 hoặc 2 trận, lưu
  chuẩn hoá xuống từng ô qua hai bảng `FormationMatch` → `FormationSlot`, ghi bằng cách xoá rồi tạo
  lại cả ngày trong một transaction.

Lưới hiện là 10 team × 6 ô, render thành `grid-cols-5` nên nhìn ra **2 hàng × 5 cột** trên màn rộng.

## Quyết định thiết kế

### 1. Note gắn vào Ô, không gắn vào thành viên

Note thuộc về **vị trí**, không thuộc về người. Kéo A từ ô 1 sang ô 2 thì note ở lại ô 1.

Lý do: note dạng "giữ buồng", "tank đứng đầu" mô tả vai trò của vị trí trong đội hình. Gắn vào người
sẽ phải định nghĩa thêm hành vi cho swap, unassign, và cho ô trống (ô trống thì không note được) —
đổi lại chẳng được gì cho nhu cầu thật.

Hệ quả: note chỉ là một map `slotId → text` chạy song song với `assignment`. **Logic kéo–thả trong
`lib/assignment.ts` không phải sửa một dòng nào.**

### 2. Note nằm cùng hàng với ô, không phải một Card riêng

Ý tưởng ban đầu là thêm 5 cột note xen kẽ 5 cột team, thành lưới 2 hàng × 10 cột. Kết quả nhìn thấy
được giữ nguyên, nhưng cách dựng thì khác: **mở rộng chính `SlotCell` thành hai nửa** — trái là vùng
thả người (như hiện tại), phải là ô nhập text.

Lý do: hai Card cạnh nhau bắt buộc phải tự đồng bộ chiều cao từng hàng giữa chúng (một tên dài xuống
dòng là lệch ngay). Đặt trong cùng một hàng thì việc căn hàng là miễn phí, và chỉ một component phải
sửa thay vì thêm `NoteColumn` + logic ghép cặp trong `FormationGrid`.

```
┌─ Team 1 ─────────────────────────┐
│ [ Kiếm Bạch   ] [ giữ buồng    ] │
│ [ Tố Vân A    ] [ vào sau      ] │
│ [ Ô trống     ] [              ] │
└──────────────────────────────────┘
```

**Điểm dễ sai:** `useDroppable().setNodeRef` hiện bọc cả `SlotCell`. Phải chuyển sang chỉ bọc nửa
trái, nếu không ô nhập text cũng trở thành vùng thả người.

### 3. Ô trống vẫn note được

Người xếp team có thể muốn ghi "chừa cho X" vào một ô chưa có ai. Vì vậy note không phụ thuộc vào
việc ô có người hay không.

Điều này phá bất biến hiện tại của `FormationSlot` (*"ô trống thì KHÔNG có hàng"*): hàng giờ tồn tại
khi ô **có người HOẶC có note**. Comment ở `prisma/schema.prisma` phải sửa theo.

### 4. Tái dùng bảng `FormationSlot`, không thêm bảng mới

```prisma
model FormationSlot {
  matchId     String
  slotId      String
  /// Null khi ô chỉ có note mà chưa xếp ai.
  characterId String?
  /// Ghi chú của người xếp team cho ô này. Null khi không ghi gì.
  note        String?
  ...
}
```

Migration:

```sql
ALTER TABLE "FormationSlot" ALTER COLUMN "characterId" DROP NOT NULL;
ALTER TABLE "FormationSlot" ADD COLUMN "note" TEXT;
```

Một bảng phụ `FormationSlotNote` sẽ giữ được bất biến cũ, nhưng đổi lại là thêm một bảng, một join,
và một đường ghi thứ hai phải giữ đồng bộ với đường ghi đội hình trong cùng transaction. Note và
người luôn được lưu/xoá cùng lúc, cùng vòng đời, cùng khoá — không có lý do tách.

Đường ghi hiện tại (`deleteMany` rồi `create` lại cả ngày) **giữ nguyên**; chỉ có phần dựng mảng
`slots.create` là đổi: lấy hợp của các `slotId` có người và các `slotId` có note.

Truy vấn thống kê ở spec two-matches-per-day vẫn chạy đúng, chỉ cần thêm điều kiện loại hàng
note-only:

```ts
prisma.formationSlot.groupBy({
  by: ["characterId"],
  where: { characterId: { not: null }, match: { ... } },
  _count: true,
});
```

### 5. Wire format: một object cho mỗi trận

`matches` đổi từ mảng `Record<slotId, characterId>` sang mảng object:

```jsonc
{
  "matches": [
    {
      "slots": { "team-1-pos-1": "char-abc" },
      "notes": { "team-1-pos-1": "giữ buồng", "team-1-pos-4": "chừa cho X" }
    }
  ]
}
```

Cách khác là giữ `matches` như cũ và thêm một mảng `notes` song song ở cấp trên. Bị loại: hai mảng
song song có thể lệch độ dài, và không có gì trong kiểu dữ liệu ngăn được điều đó. Gộp trong một
object thì "trận thứ i" chỉ có một chỗ để đọc.

Đây là **breaking change của API**, chấp nhận được: consumer duy nhất là `apps/web` trong cùng repo.

Schema dùng chung (`packages/shared/schemas/formation.schema.ts`):

```ts
/** Độ dài tối đa của một ghi chú — vừa bề ngang ô nhập trên lưới. */
export const NOTE_MAX_LENGTH = 60;

export const notesSchema = z.record(
  z.string().min(1),
  z.string().trim().min(1).max(NOTE_MAX_LENGTH)
);

export const matchSchema = z.object({
  slots: assignmentSchema,
  notes: notesSchema,
});

export const saveFormationSchema = z.object({
  matches: z.array(matchSchema).min(1).max(2),
});
```

Note rỗng **không** có khoá — giống hệt cách ô trống không có khoá trong `slots`. `.trim()` đảm bảo
một ô chỉ chứa khoảng trắng bị Zod từ chối chứ không lưu thành note rỗng; frontend phải tự bỏ khoá
của note rỗng trước khi gửi (`toWire`).

### 6. Frontend: gộp assignment và notes thành `MatchDraft`

```ts
/** Ghi chú theo ô. Ô không có ghi chú thì không có khoá. */
export type Notes = Record<string, string>;

/** Một trận trong nháp: ai đứng đâu, và ghi chú của từng ô. */
export interface MatchDraft {
  assignment: Assignment;
  notes: Notes;
}
```

`drafts` trong store đổi từ `Record<string, Assignment[]>` sang `Record<string, MatchDraft[]>`. Lý do
gộp thay vì thêm một slice `noteDrafts` song song: dirty-check và save đều phải xử lý hai thứ này như
một khối. Tách ra là tự tạo ra một trạng thái không hợp lệ (nháp có note nhưng không có đội hình).

Đây là phần **tốn công nhất** của spec — `MatchDraft` lan qua store, `lib/wire.ts`,
`lib/formation-diff.ts`, `lib/prefill.ts` và `hooks/use-formation-screen.ts` — chứ không phải ô nhập
text.

### 7. Prefill copy cả note

Khi copy đội hình từ trận trước sang trận chưa xếp, note đi theo nguyên vẹn — kể cả note của ô mà
người đứng đó đã báo nghỉ (người bị gỡ, note ở lại). Đúng với quyết định 1: note mô tả vị trí, không
mô tả người.

`addMatch` (clone trận 1 sang trận 2) cũng clone note. `clearActiveDraft` ("Xoá hết") xoá cả note.

### 8. Chiều ngang: mở rộng toàn app

`app/layout.tsx` và `components/shared/site-header.tsx`: `max-w-5xl` → `max-w-[100rem]` (1600px). Đổi
cả hai để header vẫn thẳng hàng với nội dung.

`FormationGrid`: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` → `grid-cols-1 md:grid-cols-2
xl:grid-cols-3 2xl:grid-cols-5`. Mỗi cột giờ chứa hai thứ nên cần ~300px mới đọc được; giữ 5 cột ở
màn 1280px sẽ bóp nát cả tên lẫn note. Trên màn ≥1600px vẫn là **2 hàng × 5 cột**.

## Thay đổi theo file

### `packages/shared`

- `schemas/formation.schema.ts` — thêm `NOTE_MAX_LENGTH`, `notesSchema`, `matchSchema`; đổi
  `saveFormationSchema`; thêm type `MatchInput`. Giữ `assignmentSchema` (được `matchSchema` dùng lại).

### `apps/api`

- `prisma/schema.prisma` — `characterId` thành nullable, thêm `note`, sửa comment bất biến.
- `prisma/migrations/<timestamp>_formation_slot_notes/migration.sql` — hai câu ALTER ở mục 4.
- `modules/team-builder/entities/formation.entity.ts` — `matches` đổi thành
  `{ slots: Record<string, string>; notes: Record<string, string> }[]`.
- `modules/team-builder/team-builder.service.ts`:
  - `getFormations` — map mỗi match thành `{ slots, notes }`, bỏ qua `characterId` null khi dựng
    `slots` và `note` null khi dựng `notes`.
  - `saveFormation` — lọc `characterId` lạ như hiện tại; dựng `slots.create` từ hợp của slotId có
    người và slotId có note, mỗi hàng mang `characterId ?? null` và `note ?? null`.
- `modules/team-builder/team-builder.controller.ts` — không đổi logic, chỉ đổi kiểu tham số.

### `apps/web`

- `features/team-builder/types/formation.ts` — thêm `Notes`, `MatchDraft`.
- `features/team-builder/types/session-formation.ts` — thêm `WireMatch`, `SessionFormation.matches`
  đổi kiểu.
- `features/team-builder/store/formation-store.ts` — `drafts` đổi kiểu; thêm action
  `setNote(sessionId, matchIndex, slotId, text)`; `drop()` chỉ thay `assignment` của match đó.
- `features/team-builder/lib/wire.ts` — `toWire`/`fromWire` xử lý cả `notes`; note rỗng/toàn khoảng
  trắng bị bỏ khoá khi gửi lên.
- `features/team-builder/lib/formation-diff.ts` — dirty khi `assignment` **hoặc** `notes` khác bản đã
  lưu.
- `features/team-builder/lib/prefill.ts` — `PrefillResult` mang thêm `notes`.
- `features/team-builder/hooks/use-formation-screen.ts` — theo kiểu mới; `addMatch` clone note,
  `clearActiveDraft` xoá note; expose `notes` của match đang mở và handler `setNote`.
- `features/team-builder/api/team-builder-api.ts` — `SaveFormationInput.matches` đổi kiểu.
- `features/team-builder/components/formation-grid.tsx` — nhận thêm `notes` + `onNoteChange`, đổi
  breakpoint lưới.
- `features/team-builder/components/team-column.tsx` — truyền note của từng ô xuống.
- `features/team-builder/components/slot-cell.tsx` — chia hai nửa, chuyển `setNodeRef` sang nửa trái.
- `features/team-builder/components/slot-note-input.tsx` — **mới**. `Input` của shadcn,
  `h-8 text-xs`, `maxLength={NOTE_MAX_LENGTH}`, placeholder "Ghi chú", `disabled` khi read-only.
- `app/layout.tsx`, `components/shared/site-header.tsx` — `max-w-[100rem]`.

## Test

Cập nhật cho kiểu dữ liệu mới: `lib/__tests__/wire.test.ts`, `formation-diff.test.ts`,
`prefill.test.ts`, `store/__tests__/formation-store.test.ts`,
`apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`.

Case mới:

1. `toWire` bỏ khoá của note rỗng và note chỉ có khoảng trắng.
2. `fromWire` dựng lại note đúng ô; note của slotId không còn trong bố cục bị bỏ (giống `assignment`).
3. Sửa note làm ngày trở thành dirty; sửa rồi sửa về như cũ thì hết dirty.
4. `setNote` chỉ chạm đúng match đang mở, không đụng match kia.
5. Prefill copy note, kể cả note của ô có người bị gỡ vì báo nghỉ.
6. Service: ô **chỉ có note** (không có người) lưu được và đọc lại đúng.
7. Service: `characterId` không còn trong bang bị lọc, nhưng note của ô đó vẫn giữ.

## Ngoài phạm vi

- Note ở cấp team hoặc cấp trận (chỉ có note theo ô).
- Rich text, xuống dòng, emoji picker — một dòng text thuần.
- Lịch sử chỉnh sửa note.
- Hiển thị note ở màn Điểm danh.
