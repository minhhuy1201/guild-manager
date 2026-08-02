# Guild war formation builder — Design

Ngày: 2026-08-02 · Phạm vi: `apps/web` (không đụng `apps/api`, không đụng schema/DB).

## Bối cảnh

Feature `features/team-builder/` đã tồn tại nhưng chỉ là khung rỗng: `team-builder-screen.tsx`
render một Card với dòng "Chức năng xếp team đang được xây dựng.". Route `/xep-team` đã có
(`app/xep-team/page.tsx`), đã chặn quyền — proxy chặn trước, page kiểm tra `getSession()` lần nữa.

Spec này dựng màn hình kéo–thả xếp đội hình bang chiến vào đúng khung đó. Route và guard
**giữ nguyên, không sửa**.

Dữ liệu thành viên lấy từ API đã chạy thật `/attendance/characters` (`useCharacters` trong
`features/attendance`). `Character` hiện là `{ id, name, guildClass }` — **không có `level`**,
và game không có khái niệm role tank/dps/healer, chỉ có **lưu phái** (`GuildClass`).

Backend **chưa có endpoint nào** cho team-builder. Lưu đội hình nằm ngoài phạm vi spec này.

## Quyết định kiến trúc

### 1. Tách LAYOUT khỏi ASSIGNMENT

```ts
// features/team-builder/types/formation.ts
import type { GuildClass } from "@shared/enums";

/** Một ô trong đội hình. Vị trí cố định, không do người dùng đổi. */
export interface Slot {
  /** ID ô, dạng "team-3-pos-2" */
  id: string;
  /** Số thứ tự team, 1..10 */
  team: number;
  /** Vị trí trong team, 1..6 (mỗi team là 1 cột × 6 hàng) */
  position: number;
  /** Lưu phái được phép. Bỏ trống = nhận mọi lưu phái. */
  allowedClasses?: GuildClass[];
}

/** Bố cục đội hình — dữ liệu tĩnh, người dùng không sửa trong màn này. */
export interface Formation {
  id: string;
  name: string;
  slots: Slot[];
}

/** Ai đang đứng ở ô nào. Đây là thứ duy nhất người dùng thao tác. */
export type Assignment = Record<string, string | null>; // slotId -> characterId
```

`slots` để **phẳng**, việc gom nhóm theo `team` xảy ra lúc render (`useMemo` trong
`formation-grid.tsx`). Nhờ vậy đổi từ 10 team × 6 sang 5v5 hay 20 team chỉ cần đổi hàm sinh mock;
store, logic drag và test không đổi dòng nào.

**Lệch khỏi mô tả ban đầu (`Slot = { id, row, col, role? }`) — có chủ đích:**

- `row`/`col` → `team`/`position`: bố cục chốt là 10 team, mỗi team 1 cột × 6 hàng, nên `col`
  luôn bằng 1 và không mang thông tin. Vị trí của team-block trên màn hình là **derived**:
  team 1–5 ở hàng trên, team 6–10 ở hàng dưới.
- `role?: 'tank' | 'dps' | 'healer'` → `allowedClasses?: GuildClass[]`: domain của game không có
  ba role đó. Dùng `GuildClass` cho phép tái sử dụng `GUILD_CLASS_LABEL` và `GUILD_CLASS_IMAGE`
  đã có, và không phải thêm enum mới vào `packages/shared` mà backend cũng sẽ phải biết.

### 2. Pool là derived state

Không có mảng `pool` nào được lưu. `hooks/use-pool.ts` tính lại mỗi lần render:

```ts
const assignedIds = new Set(Object.values(assignment).filter(Boolean));
const pool = characters.filter((c) => !assignedIds.has(c.id));
```

Hệ quả trực tiếp: ghi đè một ô đang có người **tự động** đẩy người cũ về pool, không cần bước
xử lý riêng. Không thể có trạng thái pool và assignment lệch nhau.

Sau khi lọc theo `assignedIds`, hook áp tiếp bộ lọc tìm kiếm và lưu phái, rồi trả về danh sách
cuối cùng cho `member-pool.tsx`.

### 3. Logic drag là hàm thuần, store chỉ là vỏ

Toàn bộ quyết định của 6 case nằm trong `lib/assignment.ts` — không import React, không import
Zustand. Store gọi vào đó. Test chạy trực tiếp trên hàm thuần, không cần render component
(vitest ở repo này cấu hình `environment: "node"`, chỉ include `**/__tests__/**/*.test.ts`).

```ts
/** Nguồn của thao tác kéo: từ pool, hoặc từ một ô cụ thể. */
export type DragSource = { kind: "pool" } | { kind: "slot"; slotId: string };

/** Đích thả: một ô, vùng pool, hoặc null khi thả ra ngoài mọi vùng. */
export type DropTarget = { kind: "slot"; slotId: string } | { kind: "pool" } | null;

export function applyDrop(
  assignment: Assignment,
  source: DragSource,
  characterId: string,
  target: DropTarget
): Assignment;
```

Các hàm dựng nên nó, cũng thuần và cũng export:

- `assign(assignment, slotId, characterId)` — đặt người vào ô, **đồng thời quét và xoá mọi ô khác
  đang giữ `characterId`**. Đây là chốt chặn duy nhất ngăn một người xuất hiện ở hai ô.
- `unassign(assignment, slotId)`
- `swap(assignment, slotIdA, slotIdB)`
- `createEmptyAssignment(slots)` — dùng cho khởi tạo và cho `reset()`.

Bảng xử lý của `applyDrop`:

| Nguồn | Đích | Xử lý |
|---|---|---|
| Pool | Ô trống | `assign` |
| Pool | Ô có người | `assign` (ghi đè; người cũ về pool do pool là derived) |
| Ô | Ô trống | `assign` — hàm tự xoá ô nguồn |
| Ô | Ô có người | `swap` |
| Ô | Pool | `unassign(ô nguồn)` |
| Bất kỳ | `null` (ngoài vùng) | trả về **chính object `assignment` truyền vào** |

Trường hợp cuối trả lại đúng reference cũ, không tạo object mới, nên `set()` của Zustand không
kích hoạt re-render thừa.

### 4. Encode dữ liệu vào draggable / droppable

- `useDraggable({ id: characterId, data: { type: "member", characterId, from: slotId ?? "pool" } })`
- `useDroppable({ id: slotId, data: { type: "slot", slotId } })` cho từng ô
- `useDroppable({ id: "pool", data: { type: "pool" } })` cho vùng pool

`onDragEnd` đọc `active.data.current` và `over?.data.current`, dựng `DragSource` + `DropTarget`,
gọi `applyDrop`. Handler không chứa nhánh `if` nghiệp vụ nào — chỉ dịch sự kiện dnd-kit sang
kiểu dữ liệu của mình.

Hai `data` này được khai báo qua interface có kiểu rõ ràng và đọc lại bằng hàm parse có type guard;
không dùng `any`, không ép kiểu bừa (dnd-kit trả `data.current` kiểu `Record<string, unknown>`).

### 5. Dependency

Cài **`@dnd-kit/core@^6.3.1`** (peer `react >= 16.8`, chạy được với React 19.2 của repo).

**Không cài `@dnd-kit/sortable`.** Nó phục vụ sắp xếp lại thứ tự phần tử trong danh sách; ở đây ô
là vị trí cố định và pool không có thứ tự cần giữ. `useDraggable` + `useDroppable` + `DragOverlay`
từ `core` phủ đủ cả 6 case. Thêm `sortable` là dependency không ai gọi tới.

Không dùng HTML5 drag API, không dùng `react-beautiful-dnd`.

Thêm `components/ui/scroll-area.tsx` sinh bằng `npx shadcn@latest add scroll-area`. Lưu ý shadcn ở
repo này chạy trên `@base-ui/react` (style `base-nova`), **không phải Radix** — phải sinh bằng CLI
để ra đúng biến thể, không chép từ trang shadcn bản Radix.

## Cấu trúc file

```
apps/web/features/team-builder/
├── types/formation.ts                 # Slot, Formation, Assignment, DragSource, DropTarget
├── lib/
│   ├── assignment.ts                  # applyDrop, assign, unassign, swap, createEmptyAssignment
│   ├── validation.ts                  # isValidPlacement, invalidPlacementReason
│   ├── mock-formation.ts              # POSITION_TEMPLATE + createMockFormation()
│   └── __tests__/assignment.test.ts   # test 6 case + 2 case bảo vệ
├── store/
│   ├── formation-store.ts             # Zustand: assignment + assign/unassign/swap/reset/applyDrop
│   └── pool-filter-store.ts           # Zustand: search + guildClasses
├── hooks/use-pool.ts                  # derived pool + áp bộ lọc
├── components/
│   ├── team-builder-screen.tsx        # SỬA file đang có — container, DndContext, DragOverlay
│   ├── formation-grid.tsx             # grid-cols-5, 2 hàng team-block
│   ├── team-column.tsx                # 1 team: tiêu đề + 6 SlotCell theo chiều dọc
│   ├── slot-cell.tsx                  # useDroppable
│   ├── member-card.tsx                # useDraggable
│   ├── member-pool.tsx                # useDroppable id="pool" + ScrollArea
│   └── pool-filters.tsx               # Input search + Select lưu phái
└── index.ts                           # giữ nguyên, chỉ export TeamBuilderScreen
```

Ngoài feature, đúng hai thay đổi:

- Thêm `apps/web/components/ui/scroll-area.tsx` (CLI sinh).
- `apps/web/features/attendance/index.ts`: thêm `export { useCharacters }` và
  `export type { Character }`. Cần vì `apps/web/CLAUDE.md` cấm import trực tiếp file nội bộ của
  feature khác — chỉ được đi qua barrel.

Không tạo `features/team-builder/api/`: lần này không gọi API nào của riêng feature.

## Component

**`team-builder-screen.tsx`** (Client Component) — `useCharacters()` lấy danh sách, dựng
`DndContext` với `PointerSensor` (kèm `activationConstraint: { distance: 8 }` để click vào card
không bị hiểu nhầm thành kéo), `onDragStart` lưu `activeCharacter` vào `useState` cục bộ,
`onDragEnd` gọi store. Render `FormationGrid` trên, `MemberPool` dưới, `DragOverlay` bọc ngoài.

Xử lý trạng thái query theo đúng pattern của `attendance-screen.tsx`: `isPending` → skeleton,
`isError` → `components/shared/error-state.tsx` kèm nút thử lại.

**`formation-grid.tsx`** — `useMemo` gom `formation.slots` theo `team`, render
`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5`. Ở `lg` cho ra đúng 2 hàng × 5 team-block
như yêu cầu; màn hẹp thì xuống 3 rồi 2 cột thay vì tràn ngang. Dùng CSS Grid, **không** dùng
`<Table>` của shadcn.

**`team-column.tsx`** — `Card` chứa tiêu đề "Team 1" và 6 `SlotCell` xếp dọc (`flex flex-col gap-2`).

**`slot-cell.tsx`** — `useDroppable`. Ba trạng thái hình:

- Trống: viền đứt (`border-dashed`), hiện nhãn lưu phái được phép nếu có ràng buộc.
- Đang rê qua (`isOver`): `ring-2 ring-primary`.
- Có người sai lưu phái: `border-destructive` + `Tooltip` ghi lý do, ví dụ
  "Ô này dành cho Thiết Y, Tố Vấn".

**`member-card.tsx`** — `useDraggable`. Hiển thị theo đúng cách `character-name.tsx` đang làm:
`Avatar` ảnh lưu phái từ `GUILD_CLASS_IMAGE` + tên nhân vật, `Tooltip` là tên lưu phái. Nhận prop
`isOverlay` để bản render trong `DragOverlay` bỏ `useDraggable` và bỏ hiệu ứng mờ.

**`member-pool.tsx`** — `useDroppable` id `"pool"`. Header hiện số lượng ("Còn 23 thành viên"),
thân là `ScrollArea` chiều cao cố định chứa lưới card. Rỗng do lọc và rỗng do đã xếp hết là hai
thông báo khác nhau.

**`pool-filters.tsx`** — sao đúng bố cục của `attendance-filters.tsx`: `Input` có icon `Search`
bên trái, và `Select multiple` hiện icon lưu phái, `alignItemWithTrigger={false}`.

## Validation

`isValidPlacement(slot, character)` trả `boolean`; `invalidPlacementReason(slot)` trả câu tiếng
Việt cho tooltip. Cả hai thuần, không phụ thuộc React.

**Không chặn drop.** Thả sai vẫn thành công, chỉ tô đỏ ô và giải thích lý do qua tooltip. Người
xếp đội hình là quản trị viên và có thể có lý do cố ý phá ràng buộc; chặn cứng sẽ biến gợi ý
thành rào cản.

Ràng buộc khai báo bằng **một template 6 vị trí** trong `mock-formation.ts`:

```ts
/**
 * Ràng buộc lưu phái theo vị trí trong team, áp cho cả 10 team.
 * `undefined` = vị trí tự do, nhận mọi lưu phái.
 */
const POSITION_TEMPLATE: readonly (readonly GuildClass[] | undefined)[] = [
  [GuildClass.THIET_Y],                          // vị trí 1 — chống đỡ
  [GuildClass.TO_VAN],                           // vị trí 2 — hồi phục
  [GuildClass.CUU_LINH, GuildClass.HUYET_HA],    // vị trí 3
  [GuildClass.LONG_NGAM, GuildClass.TOAI_MONG],  // vị trí 4
  undefined,                                     // vị trí 5 — tự do
  undefined,                                     // vị trí 6 — tự do
];
```

Bộ giá trị trên là **điểm khởi đầu để chạy demo**, không phải luật của game. Nó tồn tại để thấy
được cả ba trạng thái hình của ô (hợp lệ, sai lưu phái, tự do). Chỉnh lại mảng này là đủ, không
ảnh hưởng chỗ nào khác.

`createMockFormation()` lặp team 1..10 × position 1..6, sinh 60 `Slot` từ template đó. Đổi ràng
buộc chỉ sửa một mảng, không phải sửa 60 chỗ. Nếu sau này từng team cần ràng buộc khác nhau, đổi
chữ ký hàm sinh — phần còn lại không đụng tới.

## Test

`lib/__tests__/assignment.test.ts`, chạy bằng `pnpm --filter web test`. Test hàm thuần, không mock,
không render:

1. Pool → ô trống: người vào đúng ô.
2. Pool → ô có người: người mới vào ô, người cũ không còn ở ô nào (tức đã về pool).
3. Ô → ô trống: ô nguồn thành `null`, ô đích có người.
4. Ô → ô có người: hai người đổi chỗ, không ai mất.
5. Ô → pool: ô nguồn thành `null`.
6. Thả ra ngoài (`target === null`): trả về **đúng reference** object cũ (`toBe`, không phải
   `toEqual`).
7. Bảo vệ — kéo từ pool một người **đang đứng ở ô khác**: chỉ tồn tại ở ô mới, ô cũ thành `null`.
8. Bảo vệ — thả vào chính ô đang đứng: assignment không đổi.

Ngoài ra test `createEmptyAssignment` sinh đủ 60 khoá `null` từ mock formation.

Không viết test component trong lần này: vitest ở repo đang cấu hình `environment: "node"` và chưa
có jsdom hay testing-library; thêm hạ tầng đó là việc riêng, ngoài phạm vi spec này.

## Ngoài phạm vi

**Lưu đội hình.** Không tạo `api/`, không viết `useSaveFormation`, không optimistic update, không
rollback, không debounce. Backend chưa có endpoint nào; viết trước thì đó là code không chạy được
và không test được, và hình dạng thật của API sẽ do backend quyết chứ không phải đoán trước.

Màn hình vẫn có sẵn chỗ nối:

- Nút **"Đặt lại"** — hoạt động, gọi `reset()` của store.
- Nút **"Lưu đội hình"** — render `disabled` kèm tooltip "Chức năng đang được xây dựng".

Khi backend có `PUT /team-builder/formations/:id` (idempotent, nhận nguyên `Assignment`), phần bổ
sung là: `api/team-builder-api.ts` + `hooks/use-save-formation.ts` + bật nút. Store và logic drag
không phải đổi.

Cũng ngoài phạm vi: nhiều đội hình lưu song song, đổi preset số team trên UI, kéo thả trên mobile
bằng `TouchSensor`, và thêm `level` vào `Character`.
