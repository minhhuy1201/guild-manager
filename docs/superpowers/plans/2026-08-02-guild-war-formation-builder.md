# Guild War Formation Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng màn hình kéo–thả xếp đội hình bang chiến (10 team × 6 người) vào feature `apps/web/features/team-builder/` đang là khung rỗng.

**Architecture:** Bố cục (`Formation.slots`) tách hoàn toàn khỏi phân công (`Assignment = Record<slotId, characterId | null>`). Danh sách chờ (pool) là **derived state**, tính lại từ `assignment` mỗi lần render, không lưu song song. Toàn bộ logic 6 case kéo–thả nằm trong hàm thuần ở `lib/`, không phụ thuộc React hay Zustand — store và component chỉ là vỏ gọi vào đó, nên test chạy được ở môi trường `node` không cần jsdom.

**Tech Stack:** Next.js 16 (App Router) · React 19.2 · TypeScript strict · `@dnd-kit/core` 6.3.1 · Zustand 5 · TanStack Query 5 · shadcn/ui trên `@base-ui/react` (style `base-nova`) · Tailwind 4 · Vitest 4 (`environment: "node"`)

## Global Constraints

- **Branch:** repo đang ở `main`. Quy ước của người dùng cấm commit thẳng lên branch được bảo vệ. Trước bước commit đầu tiên: hoặc tạo branch `feat/guild-war-formation-builder`, hoặc người dùng tự commit. **Hỏi trước, đừng tự commit lên `main`.**
- **Ngôn ngữ:** mọi text hiển thị cho người dùng là **tiếng Việt**. Code, comment và JSDoc viết **tiếng Anh**.
- **JSDoc bắt buộc** cho mọi hàm exported: mục đích, từng `@param`, `@returns`.
- **TypeScript strict, cấm `any`.** `data.current` của dnd-kit là `Record<string, unknown>` — phải đi qua type guard, không ép kiểu.
- **shadcn ở repo này chạy trên `@base-ui/react`, KHÔNG phải Radix.** Không chép component từ trang shadcn bản Radix. Sinh bằng CLI của repo.
- **Không import trực tiếp file nội bộ của feature khác** — chỉ qua `index.ts` (barrel).
- **Không** `@dnd-kit/sortable`, **không** HTML5 drag API, **không** `react-beautiful-dnd`.
- **Không** dùng `<Table>` của shadcn cho lưới đội hình — dùng CSS Grid.
- Layout grid: mỗi team là **1 cột × 6 hàng**; 10 team xếp thành **2 hàng × 5 team-block** ở breakpoint `lg`.
- Ngoài phạm vi: gọi API lưu đội hình, optimistic update, rollback, debounce, test component (repo chưa có jsdom).
- File: `kebab-case`. Component: `PascalCase`. Hook: `useCamelCase`. Hằng: `UPPER_SNAKE_CASE`.
- Chạy lệnh từ **thư mục gốc repo** (`/home/huykirito1201/personal/guild-manager`).

## File Structure

| File | Trách nhiệm |
|---|---|
| `features/team-builder/types/formation.ts` | Kiểu dữ liệu thuần: `Slot`, `Formation`, `Assignment`, `DragSource`, `DropTarget` |
| `features/team-builder/lib/mock-formation.ts` | Sinh 60 slot từ 1 template 6 vị trí |
| `features/team-builder/lib/assignment.ts` | Reducer thuần — 6 case kéo–thả |
| `features/team-builder/lib/validation.ts` | Kiểm tra lưu phái hợp lệ + câu lý do tiếng Việt |
| `features/team-builder/lib/dnd-data.ts` | Type guard đọc `data.current` của dnd-kit |
| `features/team-builder/lib/pool.ts` | Lọc pool thuần (derived + search + lưu phái) |
| `features/team-builder/store/formation-store.ts` | Zustand: `assignment` + actions |
| `features/team-builder/store/pool-filter-store.ts` | Zustand: `search` + `guildClasses` |
| `features/team-builder/hooks/use-pool.ts` | Vỏ React mỏng bọc `lib/pool.ts` |
| `features/team-builder/components/member-card.tsx` | Hiển thị 1 thành viên (thuần, không dnd) |
| `features/team-builder/components/draggable-member.tsx` | Bọc `MemberCard` bằng `useDraggable` |
| `features/team-builder/components/slot-placeholder.tsx` | Nội dung ô trống (nhãn lưu phái được phép) |
| `features/team-builder/components/slot-cell.tsx` | 1 ô — `useDroppable` |
| `features/team-builder/components/team-column.tsx` | 1 team — tiêu đề + 6 ô dọc |
| `features/team-builder/components/formation-grid.tsx` | Lưới 10 team-block |
| `features/team-builder/components/pool-filters.tsx` | Ô tìm kiếm + chọn lưu phái |
| `features/team-builder/components/member-pool.tsx` | Vùng pool — `useDroppable` + `ScrollArea` |
| `features/team-builder/components/team-builder-screen.tsx` | Container: `DndContext`, `DragOverlay`, `onDragEnd` |
| `components/ui/scroll-area.tsx` | shadcn CLI sinh |
| `features/attendance/index.ts` | **Sửa** — thêm export `useCharacters` + type `Character` |

**Tại sao tách `lib/pool.ts` khỏi `hooks/use-pool.ts`:** vitest ở repo chạy `environment: "node"`, không render được hook. Đẩy toàn bộ phép lọc xuống hàm thuần cho phép test thật; hook chỉ còn `useMemo` bọc lại.

---

### Task 1: Dependency, ScrollArea, kiểu dữ liệu và mock đội hình

**Files:**
- Create: `apps/web/features/team-builder/types/formation.ts`
- Create: `apps/web/features/team-builder/lib/mock-formation.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/mock-formation.test.ts`
- Create: `apps/web/components/ui/scroll-area.tsx` (do CLI sinh)
- Modify: `apps/web/package.json` (do trình quản lý gói sửa)

**Interfaces:**
- Consumes: `GuildClass` từ `@shared/enums`
- Produces: `Slot`, `Formation`, `Assignment`, `DragSource`, `DropTarget` (types/formation.ts); `TEAM_COUNT`, `SLOTS_PER_TEAM`, `buildSlotId(team, position)`, `createMockFormation()` (lib/mock-formation.ts)

- [ ] **Step 1: Cài `@dnd-kit/core`**

```bash
pnpm --filter web add @dnd-kit/core@^6.3.1
```

Chỉ gói `core`. **Không** cài `@dnd-kit/sortable`.

- [ ] **Step 2: Sinh component ScrollArea bằng CLI của repo**

```bash
pnpm --filter web exec shadcn add scroll-area
```

Lệnh này đọc `apps/web/components.json` (style `base-nova`) nên sẽ sinh bản dựa trên `@base-ui/react/scroll-area` — gói đó đã có trong `node_modules`. Xác nhận file `apps/web/components/ui/scroll-area.tsx` xuất hiện và **import từ `@base-ui/react/scroll-area`**, không phải `@radix-ui/*`.

- [ ] **Step 3: Viết file kiểu dữ liệu**

Tạo `apps/web/features/team-builder/types/formation.ts`:

```ts
import type { GuildClass } from "@shared/enums";

/**
 * One cell of the war formation. Position is fixed layout data — users never edit it.
 */
export interface Slot {
  /** Slot id, shaped like "team-3-pos-2" */
  id: string;
  /** Team number, 1..10 */
  team: number;
  /** Row inside the team, 1..6 (each team is a single column of six rows) */
  position: number;
  /** Guild classes allowed here. Omitted or empty means every class is allowed. */
  allowedClasses?: GuildClass[];
}

/**
 * Formation layout — static data. Kept flat on purpose: grouping by team happens
 * at render time, so changing team count only touches the mock builder.
 */
export interface Formation {
  /** Formation id */
  id: string;
  /** Display name shown to the user */
  name: string;
  /** Every slot of every team, flat */
  slots: Slot[];
}

/** Who stands in which slot. The only thing the user actually edits. */
export type Assignment = Record<string, string | null>;

/** Where a drag started from. */
export type DragSource = { kind: "pool" } | { kind: "slot"; slotId: string };

/** Where a drag was released. `null` means outside every droppable area. */
export type DropTarget = { kind: "slot"; slotId: string } | { kind: "pool" } | null;
```

- [ ] **Step 4: Viết test cho hàm sinh mock (chưa có hàm — test phải fail)**

Tạo `apps/web/features/team-builder/lib/__tests__/mock-formation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import {
  SLOTS_PER_TEAM,
  TEAM_COUNT,
  buildSlotId,
  createMockFormation,
} from "../mock-formation";

describe("createMockFormation", () => {
  it("sinh đủ 10 team × 6 slot", () => {
    const formation = createMockFormation();
    expect(formation.slots).toHaveLength(TEAM_COUNT * SLOTS_PER_TEAM);
  });

  it("id của slot là duy nhất", () => {
    const ids = createMockFormation().slots.map((slot) => slot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mỗi team có đúng 6 vị trí đánh số 1..6", () => {
    const formation = createMockFormation();
    for (let team = 1; team <= TEAM_COUNT; team += 1) {
      const positions = formation.slots
        .filter((slot) => slot.team === team)
        .map((slot) => slot.position)
        .sort((a, b) => a - b);
      expect(positions).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("áp cùng một ràng buộc lưu phái cho mọi team ở cùng vị trí", () => {
    const formation = createMockFormation();
    const firstPositions = formation.slots.filter((slot) => slot.position === 1);
    expect(firstPositions).toHaveLength(TEAM_COUNT);
    for (const slot of firstPositions) {
      expect(slot.allowedClasses).toEqual([GuildClass.THIET_Y]);
    }
  });

  it("để vị trí 5 và 6 tự do, không ràng buộc lưu phái", () => {
    const formation = createMockFormation();
    const free = formation.slots.filter((slot) => slot.position >= 5);
    for (const slot of free) {
      expect(slot.allowedClasses).toBeUndefined();
    }
  });

  it("buildSlotId khớp với id trong formation", () => {
    const formation = createMockFormation();
    expect(formation.slots[0].id).toBe(buildSlotId(1, 1));
    expect(formation.slots.at(-1)?.id).toBe(buildSlotId(TEAM_COUNT, SLOTS_PER_TEAM));
  });
});
```

- [ ] **Step 5: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/mock-formation.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../mock-formation`.

- [ ] **Step 6: Viết hàm sinh mock**

Tạo `apps/web/features/team-builder/lib/mock-formation.ts`:

```ts
import { GuildClass } from "@shared/enums";

import type { Formation, Slot } from "../types/formation";

/** Number of teams in the war formation. */
export const TEAM_COUNT = 10;

/** Number of slots inside a single team. */
export const SLOTS_PER_TEAM = 6;

/**
 * Class constraint per position inside a team, applied to all ten teams.
 * `undefined` means the position accepts every guild class.
 *
 * These values are a demo starting point, not a game rule — they exist so all
 * three slot visuals (valid, wrong class, unconstrained) are reachable.
 * Editing this array is enough; nothing else depends on the specific classes.
 */
const POSITION_TEMPLATE: readonly (readonly GuildClass[] | undefined)[] = [
  [GuildClass.THIET_Y],
  [GuildClass.TO_VAN],
  [GuildClass.CUU_LINH, GuildClass.HUYET_HA],
  [GuildClass.LONG_NGAM, GuildClass.TOAI_MONG],
  undefined,
  undefined,
];

/**
 * Build the stable id of a slot from its coordinates.
 * @param team - Team number, 1..TEAM_COUNT
 * @param position - Row inside the team, 1..SLOTS_PER_TEAM
 * @returns Slot id, e.g. "team-3-pos-2"
 */
export function buildSlotId(team: number, position: number): string {
  return `team-${team}-pos-${position}`;
}

/**
 * Build the demo formation: TEAM_COUNT teams of SLOTS_PER_TEAM slots each,
 * every team sharing the same per-position class constraints.
 * @returns A formation with TEAM_COUNT * SLOTS_PER_TEAM flat slots
 */
export function createMockFormation(): Formation {
  const slots: Slot[] = [];

  for (let team = 1; team <= TEAM_COUNT; team += 1) {
    for (let position = 1; position <= SLOTS_PER_TEAM; position += 1) {
      const allowed = POSITION_TEMPLATE[position - 1];
      slots.push({
        id: buildSlotId(team, position),
        team,
        position,
        ...(allowed ? { allowedClasses: [...allowed] } : {}),
      });
    }
  }

  return { id: "guild-war-default", name: "Đội hình bang chiến", slots };
}
```

- [ ] **Step 7: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/mock-formation.test.ts
```

Kỳ vọng: PASS, 6 test.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/components/ui/scroll-area.tsx apps/web/features/team-builder/types apps/web/features/team-builder/lib
git commit -m "feat(ui): add formation types and mock layout for team builder"
```

---

### Task 2: Reducer thuần cho 6 case kéo–thả

Đây là trái tim của tính năng. Mọi quyết định "thả vào đâu thì xảy ra gì" nằm ở đây, không ở component.

**Files:**
- Create: `apps/web/features/team-builder/lib/assignment.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/assignment.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `DragSource`, `DropTarget`, `Slot` từ `../types/formation`
- Produces:
  - `createEmptyAssignment(slots: Slot[]): Assignment`
  - `findSlotOf(assignment: Assignment, characterId: string): string | null`
  - `assign(assignment: Assignment, slotId: string, characterId: string): Assignment`
  - `unassign(assignment: Assignment, slotId: string): Assignment`
  - `swap(assignment: Assignment, slotIdA: string, slotIdB: string): Assignment`
  - `applyDrop(assignment: Assignment, source: DragSource, characterId: string, target: DropTarget): Assignment`

- [ ] **Step 1: Viết test cho cả 6 case + 2 case bảo vệ**

Tạo `apps/web/features/team-builder/lib/__tests__/assignment.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { Assignment } from "../../types/formation";
import {
  applyDrop,
  createEmptyAssignment,
  findSlotOf,
} from "../assignment";
import { SLOTS_PER_TEAM, TEAM_COUNT, createMockFormation } from "../mock-formation";

const SLOT_A = "team-1-pos-1";
const SLOT_B = "team-1-pos-2";
const SLOT_C = "team-2-pos-1";

/** Small assignment used by the drop tests: three slots, all empty. */
function emptyThreeSlots(): Assignment {
  return { [SLOT_A]: null, [SLOT_B]: null, [SLOT_C]: null };
}

describe("createEmptyAssignment", () => {
  it("sinh một khóa null cho mỗi slot của đội hình", () => {
    const assignment = createEmptyAssignment(createMockFormation().slots);
    expect(Object.keys(assignment)).toHaveLength(TEAM_COUNT * SLOTS_PER_TEAM);
    expect(Object.values(assignment).every((value) => value === null)).toBe(true);
  });
});

describe("findSlotOf", () => {
  it("trả về ô đang giữ nhân vật, hoặc null khi nhân vật ở pool", () => {
    const assignment = { ...emptyThreeSlots(), [SLOT_B]: "char-1" };
    expect(findSlotOf(assignment, "char-1")).toBe(SLOT_B);
    expect(findSlotOf(assignment, "char-2")).toBeNull();
  });
});

describe("applyDrop", () => {
  it("case 1 — pool → ô trống: đặt nhân vật vào ô", () => {
    const result = applyDrop(
      emptyThreeSlots(),
      { kind: "pool" },
      "char-1",
      { kind: "slot", slotId: SLOT_A }
    );
    expect(result[SLOT_A]).toBe("char-1");
  });

  it("case 2 — pool → ô có người: ghi đè, người cũ không còn ở ô nào", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-old" };

    const result = applyDrop(
      before,
      { kind: "pool" },
      "char-new",
      { kind: "slot", slotId: SLOT_A }
    );

    expect(result[SLOT_A]).toBe("char-new");
    expect(findSlotOf(result, "char-old")).toBeNull();
  });

  it("case 3 — ô → ô trống: ô nguồn thành null, ô đích nhận người", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "slot", slotId: SLOT_B }
    );

    expect(result[SLOT_A]).toBeNull();
    expect(result[SLOT_B]).toBe("char-1");
  });

  it("case 4 — ô → ô có người: hai người đổi chỗ, không ai bị mất", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1", [SLOT_B]: "char-2" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "slot", slotId: SLOT_B }
    );

    expect(result[SLOT_A]).toBe("char-2");
    expect(result[SLOT_B]).toBe("char-1");
  });

  it("case 5 — ô → pool: ô nguồn thành null", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "pool" }
    );

    expect(result[SLOT_A]).toBeNull();
  });

  it("case 6 — thả ngoài mọi vùng: trả về đúng object cũ, không tạo reference mới", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(before, { kind: "slot", slotId: SLOT_A }, "char-1", null);

    expect(result).toBe(before);
  });

  it("bảo vệ — kéo từ pool một người đang đứng ở ô khác: không nhân bản", () => {
    const before = { ...emptyThreeSlots(), [SLOT_C]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "pool" },
      "char-1",
      { kind: "slot", slotId: SLOT_A }
    );

    expect(result[SLOT_A]).toBe("char-1");
    expect(result[SLOT_C]).toBeNull();
    expect(Object.values(result).filter((id) => id === "char-1")).toHaveLength(1);
  });

  it("bảo vệ — thả vào chính ô đang đứng: không thay đổi gì", () => {
    const before = { ...emptyThreeSlots(), [SLOT_A]: "char-1" };

    const result = applyDrop(
      before,
      { kind: "slot", slotId: SLOT_A },
      "char-1",
      { kind: "slot", slotId: SLOT_A }
    );

    expect(result).toBe(before);
  });

  it("bảo vệ — kéo từ pool rồi thả lại vào pool: không thay đổi gì", () => {
    const before = emptyThreeSlots();

    const result = applyDrop(before, { kind: "pool" }, "char-1", { kind: "pool" });

    expect(result).toBe(before);
  });

  it("không sửa assignment truyền vào (immutable)", () => {
    const before = emptyThreeSlots();

    applyDrop(before, { kind: "pool" }, "char-1", { kind: "slot", slotId: SLOT_A });

    expect(before[SLOT_A]).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/assignment.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../assignment`.

- [ ] **Step 3: Viết reducer**

Tạo `apps/web/features/team-builder/lib/assignment.ts`:

```ts
import type { Assignment, DragSource, DropTarget, Slot } from "../types/formation";

/**
 * Build an assignment where every slot of the formation is empty.
 * @param slots - All slots of the formation
 * @returns Assignment mapping every slot id to null
 */
export function createEmptyAssignment(slots: Slot[]): Assignment {
  return Object.fromEntries(slots.map((slot) => [slot.id, null]));
}

/**
 * Find which slot currently holds a character.
 * @param assignment - Current assignment
 * @param characterId - Character to look for
 * @returns The slot id holding the character, or null when they are in the pool
 */
export function findSlotOf(assignment: Assignment, characterId: string): string | null {
  const entry = Object.entries(assignment).find(([, value]) => value === characterId);
  return entry ? entry[0] : null;
}

/**
 * Put a character into a slot, clearing whichever other slot they occupied.
 * Clearing the previous slot is what makes duplicating a character impossible,
 * whichever direction the drag came from.
 * @param assignment - Current assignment
 * @param slotId - Slot receiving the character
 * @param characterId - Character being placed
 * @returns A new assignment
 */
export function assign(
  assignment: Assignment,
  slotId: string,
  characterId: string
): Assignment {
  const next = { ...assignment };
  const previousSlotId = findSlotOf(assignment, characterId);

  if (previousSlotId !== null) next[previousSlotId] = null;
  next[slotId] = characterId;

  return next;
}

/**
 * Empty a slot, sending whoever stood there back to the pool.
 * The pool is derived from the assignment, so no second update is needed.
 * @param assignment - Current assignment
 * @param slotId - Slot to clear
 * @returns A new assignment
 */
export function unassign(assignment: Assignment, slotId: string): Assignment {
  return { ...assignment, [slotId]: null };
}

/**
 * Exchange the occupants of two slots.
 * @param assignment - Current assignment
 * @param slotIdA - First slot
 * @param slotIdB - Second slot
 * @returns A new assignment
 */
export function swap(
  assignment: Assignment,
  slotIdA: string,
  slotIdB: string
): Assignment {
  return {
    ...assignment,
    [slotIdA]: assignment[slotIdB] ?? null,
    [slotIdB]: assignment[slotIdA] ?? null,
  };
}

/**
 * Resolve one drag-and-drop gesture into the next assignment.
 * This is the single place the six drop cases are decided; callers only
 * translate their own events into DragSource / DropTarget.
 *
 * Returns the exact input object (not a copy) for no-op gestures, so a Zustand
 * `set` with the result does not trigger a needless re-render.
 * @param assignment - Current assignment
 * @param source - Where the drag started
 * @param characterId - Character being dragged
 * @param target - Where it was released, or null when outside every droppable
 * @returns The next assignment, or the input unchanged for a no-op
 */
export function applyDrop(
  assignment: Assignment,
  source: DragSource,
  characterId: string,
  target: DropTarget
): Assignment {
  if (target === null) return assignment;

  if (target.kind === "pool") {
    if (source.kind === "pool") return assignment;
    return unassign(assignment, source.slotId);
  }

  if (source.kind === "slot") {
    if (source.slotId === target.slotId) return assignment;
    if (assignment[target.slotId]) return swap(assignment, source.slotId, target.slotId);
  }

  return assign(assignment, target.slotId, characterId);
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/assignment.test.ts
```

Kỳ vọng: PASS, 11 test.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/lib
git commit -m "feat(ui): add pure assignment reducer for formation drag and drop"
```

---

### Task 3: Kiểm tra ràng buộc lưu phái

**Files:**
- Create: `apps/web/features/team-builder/lib/validation.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/validation.test.ts`

**Interfaces:**
- Consumes: `Slot` từ `../types/formation`; `GuildClass`, `GUILD_CLASS_LABEL` từ `@shared/enums`
- Produces:
  - `isValidPlacement(slot: Slot, guildClass: GuildClass): boolean`
  - `invalidPlacementReason(slot: Slot): string`

Hàm nhận `GuildClass` chứ **không** nhận cả `Character`: giữ `lib/` không phụ thuộc feature `attendance`, nên test chạy được ở môi trường `node` mà không kéo theo component React nào.

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import type { Slot } from "../../types/formation";
import { invalidPlacementReason, isValidPlacement } from "../validation";

const constrainedSlot: Slot = {
  id: "team-1-pos-1",
  team: 1,
  position: 1,
  allowedClasses: [GuildClass.THIET_Y, GuildClass.TO_VAN],
};

const freeSlot: Slot = { id: "team-1-pos-5", team: 1, position: 5 };

describe("isValidPlacement", () => {
  it("chấp nhận lưu phái nằm trong danh sách cho phép", () => {
    expect(isValidPlacement(constrainedSlot, GuildClass.THIET_Y)).toBe(true);
  });

  it("từ chối lưu phái ngoài danh sách cho phép", () => {
    expect(isValidPlacement(constrainedSlot, GuildClass.LONG_NGAM)).toBe(false);
  });

  it("ô không ràng buộc thì nhận mọi lưu phái", () => {
    expect(isValidPlacement(freeSlot, GuildClass.LONG_NGAM)).toBe(true);
  });

  it("mảng ràng buộc rỗng cũng coi là không ràng buộc", () => {
    const slot: Slot = { ...freeSlot, allowedClasses: [] };
    expect(isValidPlacement(slot, GuildClass.LONG_NGAM)).toBe(true);
  });
});

describe("invalidPlacementReason", () => {
  it("liệt kê tên tiếng Việt của các lưu phái được phép", () => {
    expect(invalidPlacementReason(constrainedSlot)).toBe("Ô này dành cho Thiết Y, Tố Vấn");
  });

  it("trả chuỗi rỗng cho ô không ràng buộc", () => {
    expect(invalidPlacementReason(freeSlot)).toBe("");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/validation.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../validation`.

- [ ] **Step 3: Viết hàm kiểm tra**

Tạo `apps/web/features/team-builder/lib/validation.ts`:

```ts
import { GUILD_CLASS_LABEL, type GuildClass } from "@shared/enums";

import type { Slot } from "../types/formation";

/**
 * Check whether a guild class satisfies a slot's class constraint.
 * Used only for highlighting — dropping is never blocked.
 * @param slot - Slot being filled
 * @param guildClass - Guild class of the character placed there
 * @returns true when the slot has no constraint or the class is allowed
 */
export function isValidPlacement(slot: Slot, guildClass: GuildClass): boolean {
  const allowed = slot.allowedClasses;
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(guildClass);
}

/**
 * Build the Vietnamese tooltip text explaining a slot's class constraint.
 * @param slot - Slot being explained
 * @returns Sentence listing the allowed classes, or an empty string when unconstrained
 */
export function invalidPlacementReason(slot: Slot): string {
  const allowed = slot.allowedClasses ?? [];
  if (allowed.length === 0) return "";

  const names = allowed.map((guildClass) => GUILD_CLASS_LABEL[guildClass]).join(", ");
  return `Ô này dành cho ${names}`;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/validation.test.ts
```

Kỳ vọng: PASS, 6 test.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/lib
git commit -m "feat(ui): add guild class placement validation for formation slots"
```

---

### Task 4: Đọc dữ liệu kéo–thả của dnd-kit an toàn kiểu

dnd-kit trả `active.data.current` kiểu `Record<string, unknown> | undefined`. Task này dựng type guard để `onDragEnd` không phải ép kiểu.

**Files:**
- Create: `apps/web/features/team-builder/lib/dnd-data.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/dnd-data.test.ts`

**Interfaces:**
- Consumes: `DragSource`, `DropTarget` từ `../types/formation`
- Produces:
  - `POOL_DROPPABLE_ID` (hằng `"pool"`)
  - `MemberDragData`, `SlotDropData`, `PoolDropData` (interface)
  - `isMemberDragData(value: unknown): value is MemberDragData`
  - `toDragSource(data: MemberDragData): DragSource`
  - `toDropTarget(value: unknown): DropTarget`

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/dnd-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  POOL_DROPPABLE_ID,
  isMemberDragData,
  toDragSource,
  toDropTarget,
} from "../dnd-data";

describe("isMemberDragData", () => {
  it("nhận dữ liệu kéo hợp lệ", () => {
    expect(
      isMemberDragData({ type: "member", characterId: "char-1", from: "pool" })
    ).toBe(true);
  });

  it("từ chối undefined, null và object sai hình dạng", () => {
    expect(isMemberDragData(undefined)).toBe(false);
    expect(isMemberDragData(null)).toBe(false);
    expect(isMemberDragData({ type: "slot", slotId: "team-1-pos-1" })).toBe(false);
    expect(isMemberDragData({ type: "member", characterId: 1, from: "pool" })).toBe(false);
  });
});

describe("toDragSource", () => {
  it("đổi from = \"pool\" thành nguồn pool", () => {
    expect(
      toDragSource({ type: "member", characterId: "char-1", from: POOL_DROPPABLE_ID })
    ).toEqual({ kind: "pool" });
  });

  it("đổi from = slot id thành nguồn slot", () => {
    expect(
      toDragSource({ type: "member", characterId: "char-1", from: "team-2-pos-3" })
    ).toEqual({ kind: "slot", slotId: "team-2-pos-3" });
  });
});

describe("toDropTarget", () => {
  it("đọc được vùng pool", () => {
    expect(toDropTarget({ type: "pool" })).toEqual({ kind: "pool" });
  });

  it("đọc được một ô", () => {
    expect(toDropTarget({ type: "slot", slotId: "team-1-pos-1" })).toEqual({
      kind: "slot",
      slotId: "team-1-pos-1",
    });
  });

  it("trả null khi thả ngoài vùng hoặc dữ liệu sai hình dạng", () => {
    expect(toDropTarget(undefined)).toBeNull();
    expect(toDropTarget(null)).toBeNull();
    expect(toDropTarget({ type: "slot" })).toBeNull();
    expect(toDropTarget({ type: "member", characterId: "char-1" })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/dnd-data.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../dnd-data`.

- [ ] **Step 3: Viết type guard**

Tạo `apps/web/features/team-builder/lib/dnd-data.ts`:

```ts
import type { DragSource, DropTarget } from "../types/formation";

/**
 * Droppable id of the member pool. Slot ids are shaped "team-N-pos-M",
 * so this value can never collide with one.
 */
export const POOL_DROPPABLE_ID = "pool";

/** Payload attached to a draggable member card. */
export interface MemberDragData {
  type: "member";
  /** Character being dragged */
  characterId: string;
  /** Slot id the character currently sits in, or POOL_DROPPABLE_ID */
  from: string;
}

/** Payload attached to a droppable slot. */
export interface SlotDropData {
  type: "slot";
  /** Slot receiving the drop */
  slotId: string;
}

/** Payload attached to the droppable pool area. */
export interface PoolDropData {
  type: "pool";
}

/**
 * Narrow the untyped `active.data.current` of dnd-kit to a member payload.
 * @param value - Raw drag data from dnd-kit
 * @returns true when the value is a well-formed member payload
 */
export function isMemberDragData(value: unknown): value is MemberDragData {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;
  return (
    data.type === "member" &&
    typeof data.characterId === "string" &&
    typeof data.from === "string"
  );
}

/**
 * Translate a member payload into the drag source the reducer expects.
 * @param data - Member payload read from the drag event
 * @returns Pool source, or slot source carrying the origin slot id
 */
export function toDragSource(data: MemberDragData): DragSource {
  return data.from === POOL_DROPPABLE_ID
    ? { kind: "pool" }
    : { kind: "slot", slotId: data.from };
}

/**
 * Narrow the untyped `over?.data.current` of dnd-kit into a drop target.
 * @param value - Raw drop data from dnd-kit, undefined when released outside
 * @returns The drop target, or null for an out-of-bounds or malformed drop
 */
export function toDropTarget(value: unknown): DropTarget {
  if (typeof value !== "object" || value === null) return null;

  const data = value as Record<string, unknown>;

  if (data.type === "pool") return { kind: "pool" };
  if (data.type === "slot" && typeof data.slotId === "string") {
    return { kind: "slot", slotId: data.slotId };
  }

  return null;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/dnd-data.test.ts
```

Kỳ vọng: PASS, 7 test.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/lib
git commit -m "feat(ui): add type guards for formation drag and drop payloads"
```

---

### Task 5: Lọc pool (derived state) bằng hàm thuần

**Files:**
- Create: `apps/web/features/team-builder/lib/pool.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/pool.test.ts`

**Interfaces:**
- Consumes: `Assignment` từ `../types/formation`; `GuildClass` từ `@shared/enums`
- Produces:
  - `PoolCandidate` (interface: `{ id: string; name: string; guildClass: GuildClass }`)
  - `PoolFilter` (interface: `{ search: string; guildClasses: GuildClass[] }`)
  - `selectPoolCharacters<T extends PoolCandidate>(characters: T[], assignment: Assignment, filter: PoolFilter): T[]`

Hàm dùng generic `T extends PoolCandidate` để nhận `Character` của feature `attendance` mà **không** phải import type đó vào `lib/`.

- [ ] **Step 1: Viết test**

Tạo `apps/web/features/team-builder/lib/__tests__/pool.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GuildClass } from "@shared/enums";

import type { Assignment } from "../../types/formation";
import { selectPoolCharacters, type PoolCandidate } from "../pool";

const CHARACTERS: PoolCandidate[] = [
  { id: "MeoMap01", name: "Mèo Mập", guildClass: GuildClass.THIET_Y },
  { id: "LongNho02", name: "Long Nhỏ", guildClass: GuildClass.LONG_NGAM },
  { id: "ToVan03", name: "Tố Vân", guildClass: GuildClass.TO_VAN },
];

const NO_FILTER = { search: "", guildClasses: [] };

/** Assignment where nobody is placed yet. */
const EMPTY: Assignment = { "team-1-pos-1": null, "team-1-pos-2": null };

describe("selectPoolCharacters", () => {
  it("trả về tất cả khi chưa ai được xếp và không lọc gì", () => {
    expect(selectPoolCharacters(CHARACTERS, EMPTY, NO_FILTER)).toHaveLength(3);
  });

  it("loại người đã được xếp vào đội hình", () => {
    const assignment: Assignment = { ...EMPTY, "team-1-pos-1": "MeoMap01" };

    const pool = selectPoolCharacters(CHARACTERS, assignment, NO_FILTER);

    expect(pool.map((character) => character.id)).toEqual(["LongNho02", "ToVan03"]);
  });

  it("tìm theo tên, không phân biệt hoa thường", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "mèo",
      guildClasses: [],
    });

    expect(pool.map((character) => character.id)).toEqual(["MeoMap01"]);
  });

  it("tìm theo ID trong game, không phân biệt hoa thường", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "longnho",
      guildClasses: [],
    });

    expect(pool.map((character) => character.id)).toEqual(["LongNho02"]);
  });

  it("bỏ qua khoảng trắng thừa ở từ khóa", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "   ",
      guildClasses: [],
    });

    expect(pool).toHaveLength(3);
  });

  it("lọc theo lưu phái, mảng rỗng nghĩa là tất cả", () => {
    const pool = selectPoolCharacters(CHARACTERS, EMPTY, {
      search: "",
      guildClasses: [GuildClass.TO_VAN, GuildClass.THIET_Y],
    });

    expect(pool.map((character) => character.id)).toEqual(["MeoMap01", "ToVan03"]);
  });

  it("áp đồng thời cả tìm kiếm, lưu phái và loại người đã xếp", () => {
    const assignment: Assignment = { ...EMPTY, "team-1-pos-1": "MeoMap01" };

    const pool = selectPoolCharacters(CHARACTERS, assignment, {
      search: "o",
      guildClasses: [GuildClass.THIET_Y],
    });

    expect(pool).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/pool.test.ts
```

Kỳ vọng: FAIL — không resolve được module `../pool`.

- [ ] **Step 3: Viết hàm lọc**

Tạo `apps/web/features/team-builder/lib/pool.ts`:

```ts
import type { GuildClass } from "@shared/enums";

import type { Assignment } from "../types/formation";

/** Minimal shape the pool needs from a character. */
export interface PoolCandidate {
  /** In-game id */
  id: string;
  /** Character name */
  name: string;
  /** Guild class */
  guildClass: GuildClass;
}

/** Current pool filter values. */
export interface PoolFilter {
  /** Free-text search over name and in-game id */
  search: string;
  /** Guild classes to keep. An empty array means every class. */
  guildClasses: GuildClass[];
}

/**
 * Derive the pool: everyone not currently placed in the formation, then
 * narrowed by the filters. Nothing is stored — this runs on every render, so
 * the pool can never drift out of sync with the assignment.
 * @param characters - Full guild roster
 * @param assignment - Current slot assignment
 * @param filter - Search keyword and guild class filter
 * @returns Characters still available, in roster order
 */
export function selectPoolCharacters<T extends PoolCandidate>(
  characters: T[],
  assignment: Assignment,
  filter: PoolFilter
): T[] {
  const assignedIds = new Set(
    Object.values(assignment).filter((id): id is string => id !== null)
  );
  const keyword = filter.search.trim().toLowerCase();

  return characters.filter((character) => {
    if (assignedIds.has(character.id)) return false;

    if (
      filter.guildClasses.length > 0 &&
      !filter.guildClasses.includes(character.guildClass)
    ) {
      return false;
    }

    if (keyword.length === 0) return true;

    return (
      character.name.toLowerCase().includes(keyword) ||
      character.id.toLowerCase().includes(keyword)
    );
  });
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
pnpm --filter web test features/team-builder/lib/__tests__/pool.test.ts
```

Kỳ vọng: PASS, 7 test.

- [ ] **Step 5: Chạy toàn bộ test của web**

```bash
pnpm --filter web test
```

Kỳ vọng: PASS — 4 file mới của team-builder cộng với các file test có sẵn của `attendance` và `lib`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/lib
git commit -m "feat(ui): derive member pool from formation assignment"
```

---

### Task 6: Zustand store và mở barrel của feature attendance

**Files:**
- Create: `apps/web/features/team-builder/store/formation-store.ts`
- Create: `apps/web/features/team-builder/store/pool-filter-store.ts`
- Create: `apps/web/features/team-builder/hooks/use-pool.ts`
- Modify: `apps/web/features/attendance/index.ts`

**Interfaces:**
- Consumes: `applyDrop`, `assign`, `createEmptyAssignment`, `swap`, `unassign` (Task 2); `createMockFormation` (Task 1); `selectPoolCharacters`, `PoolCandidate` (Task 5)
- Produces:
  - `useFormationStore` — state `{ formation: Formation; assignment: Assignment }`, actions `assign(slotId, characterId)`, `unassign(slotId)`, `swap(slotIdA, slotIdB)`, `drop(source, characterId, target)`, `reset()`
  - `usePoolFilterStore` — state `{ search: string; guildClasses: GuildClass[] }`, actions `setSearch(value)`, `setGuildClasses(value)`
  - `usePool<T extends PoolCandidate>(characters: T[]): T[]`
  - Từ `@/features/attendance`: `useCharacters`, type `Character`

- [ ] **Step 1: Mở barrel của attendance**

Sửa `apps/web/features/attendance/index.ts`, thêm hai dòng vào cuối:

```ts
export { useCharacters } from "./hooks/use-attendance";
export type { Character } from "./types/attendance";
```

Cần thiết vì `apps/web/CLAUDE.md` cấm import trực tiếp file nội bộ của feature khác — team-builder chỉ được đi qua barrel này.

- [ ] **Step 2: Viết store đội hình**

Tạo `apps/web/features/team-builder/store/formation-store.ts`:

```ts
import { create } from "zustand";

import {
  applyDrop,
  assign,
  createEmptyAssignment,
  swap,
  unassign,
} from "../lib/assignment";
import { createMockFormation } from "../lib/mock-formation";
import type { Assignment, DragSource, DropTarget, Formation } from "../types/formation";

/** Layout is static demo data for now, built once at module load. */
const FORMATION = createMockFormation();

interface FormationState {
  /** Slot layout — never edited by the user in this screen */
  formation: Formation;
  /** Who stands where */
  assignment: Assignment;
  /** Place a character into a slot, clearing their previous slot */
  assign: (slotId: string, characterId: string) => void;
  /** Empty a slot, sending its occupant back to the pool */
  unassign: (slotId: string) => void;
  /** Exchange the occupants of two slots */
  swap: (slotIdA: string, slotIdB: string) => void;
  /** Resolve one drag gesture through the pure reducer */
  drop: (source: DragSource, characterId: string, target: DropTarget) => void;
  /** Clear every slot */
  reset: () => void;
}

/**
 * Client state of the formation builder (Zustand).
 * Holds UI state only — the guild roster is server data and stays in TanStack Query.
 * Every action delegates to the pure reducer in `lib/assignment.ts`; this store
 * adds no rules of its own.
 */
export const useFormationStore = create<FormationState>((set) => ({
  formation: FORMATION,
  assignment: createEmptyAssignment(FORMATION.slots),
  assign: (slotId, characterId) =>
    set((state) => ({ assignment: assign(state.assignment, slotId, characterId) })),
  unassign: (slotId) =>
    set((state) => ({ assignment: unassign(state.assignment, slotId) })),
  swap: (slotIdA, slotIdB) =>
    set((state) => ({ assignment: swap(state.assignment, slotIdA, slotIdB) })),
  drop: (source, characterId, target) =>
    set((state) => ({
      assignment: applyDrop(state.assignment, source, characterId, target),
    })),
  reset: () => set({ assignment: createEmptyAssignment(FORMATION.slots) }),
}));
```

- [ ] **Step 3: Viết store bộ lọc pool**

Tạo `apps/web/features/team-builder/store/pool-filter-store.ts`:

```ts
import { create } from "zustand";
import type { GuildClass } from "@shared/enums";

interface PoolFilterState {
  /** Search keyword over character name and in-game id */
  search: string;
  /** Guild classes being filtered. An empty array means every class. */
  guildClasses: GuildClass[];
  setSearch: (value: string) => void;
  setGuildClasses: (value: GuildClass[]) => void;
}

/**
 * Pool filter state for the formation builder (Zustand).
 * One screen only, so unlike the attendance filter store it needs no scoping.
 */
export const usePoolFilterStore = create<PoolFilterState>((set) => ({
  search: "",
  guildClasses: [],
  setSearch: (value) => set({ search: value }),
  setGuildClasses: (value) => set({ guildClasses: value }),
}));
```

- [ ] **Step 4: Viết hook pool**

Tạo `apps/web/features/team-builder/hooks/use-pool.ts`:

```ts
"use client";

import { useMemo } from "react";

import { selectPoolCharacters, type PoolCandidate } from "../lib/pool";
import { useFormationStore } from "../store/formation-store";
import { usePoolFilterStore } from "../store/pool-filter-store";

/**
 * React wrapper over `selectPoolCharacters`. Reads the assignment and the
 * filters from their stores, keeps the result memoised. All the actual
 * filtering lives in the pure function so it stays unit-testable.
 * @param characters - Full guild roster from the server
 * @returns Characters still available to place, already filtered
 */
export function usePool<T extends PoolCandidate>(characters: T[]): T[] {
  const assignment = useFormationStore((state) => state.assignment);
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);

  return useMemo(
    () => selectPoolCharacters(characters, assignment, { search, guildClasses }),
    [characters, assignment, search, guildClasses]
  );
}
```

- [ ] **Step 5: Kiểm tra không làm hỏng gì**

```bash
pnpm --filter web test && pnpm --filter web lint
```

Kỳ vọng: test PASS như Task 5, lint không lỗi.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/store apps/web/features/team-builder/hooks apps/web/features/attendance/index.ts
git commit -m "feat(ui): add formation and pool filter stores for team builder"
```

---

### Task 7: Thẻ thành viên — bản hiển thị và bản kéo được

**Files:**
- Create: `apps/web/features/team-builder/components/member-card.tsx`
- Create: `apps/web/features/team-builder/components/draggable-member.tsx`

**Interfaces:**
- Consumes: `Character` từ `@/features/attendance`; `MemberDragData` từ `../lib/dnd-data`; `GUILD_CLASS_LABEL` từ `@shared/enums`; `GUILD_CLASS_IMAGE` từ `@/lib/guild-class`
- Produces:
  - `MemberCard({ character, invalidReason?, className? })`
  - `DraggableMember({ character, from, invalidReason? })` — `from` là slot id hoặc `POOL_DROPPABLE_ID`

Tách hai file vì `DragOverlay` cần bản **không** gọi `useDraggable` — gọi hook có điều kiện là lỗi React, nên không gộp bằng prop `isOverlay` được.

- [ ] **Step 1: Viết thẻ hiển thị**

Tạo `apps/web/features/team-builder/components/member-card.tsx`:

```tsx
import { GUILD_CLASS_LABEL } from "@shared/enums";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Character } from "@/features/attendance";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  /** Character to display */
  character: Character;
  /** Why this placement breaks the slot's class rule. Empty or omitted means valid. */
  invalidReason?: string;
  /** Extra classes for the outer element */
  className?: string;
}

/**
 * A guild member shown as a compact card: class avatar plus character name.
 * Purely presentational — no drag behaviour, so it can also render inside DragOverlay.
 * When `invalidReason` is set the card gets a destructive border and a tooltip.
 * @param character - Character to display
 * @param invalidReason - Reason the placement is invalid, if any
 * @param className - Extra classes for the outer element
 * @returns The member card, wrapped in a tooltip when invalid
 */
export function MemberCard({ character, invalidReason, className }: MemberCardProps) {
  const classLabel = GUILD_CLASS_LABEL[character.guildClass];

  const card = (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-card px-2 py-1.5 shadow-sm",
        invalidReason && "border-destructive",
        className
      )}
    >
      <Avatar size="sm">
        <AvatarImage src={GUILD_CLASS_IMAGE[character.guildClass]} alt={classLabel} />
        <AvatarFallback>{classLabel[0]}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">{character.name}</span>
    </div>
  );

  if (!invalidReason) return card;

  return (
    <Tooltip>
      <TooltipTrigger render={card} />
      <TooltipContent>{invalidReason}</TooltipContent>
    </Tooltip>
  );
}
```

`TooltipTrigger` nhận prop `render` — đó là API của `@base-ui/react`, giống cách `features/attendance/components/character-name.tsx` đang dùng. Không phải `asChild` của Radix.

- [ ] **Step 2: Viết bản kéo được**

Tạo `apps/web/features/team-builder/components/draggable-member.tsx`:

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";

import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import type { MemberDragData } from "../lib/dnd-data";
import { MemberCard } from "./member-card";

interface DraggableMemberProps {
  /** Character to display */
  character: Character;
  /** Slot id the character currently sits in, or POOL_DROPPABLE_ID */
  from: string;
  /** Reason the current placement is invalid, if any */
  invalidReason?: string;
}

/**
 * A member card the user can pick up. Encodes its origin in the drag payload so
 * `onDragEnd` can tell a pool card apart from a card already inside a slot.
 * Renders no transform: the moving preview is handled by DragOverlay instead.
 * @param character - Character to display
 * @param from - Origin of the drag: a slot id, or POOL_DROPPABLE_ID
 * @param invalidReason - Reason the current placement is invalid, if any
 * @returns Draggable wrapper around a MemberCard
 */
export function DraggableMember({
  character,
  from,
  invalidReason,
}: DraggableMemberProps) {
  const data: MemberDragData = {
    type: "member",
    characterId: character.id,
    from,
  };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: character.id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none", isDragging && "opacity-40")}
    >
      <MemberCard character={character} invalidReason={invalidReason} />
    </div>
  );
}
```

`touch-none` là bắt buộc: thiếu nó thì trên thiết bị cảm ứng trình duyệt cuộn trang thay vì bắt đầu kéo.

- [ ] **Step 3: Kiểm tra lint**

```bash
pnpm --filter web lint
```

Kỳ vọng: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(ui): add member card and draggable member for team builder"
```

---

### Task 8: Ô, cột team và lưới đội hình

**Files:**
- Create: `apps/web/features/team-builder/components/slot-placeholder.tsx`
- Create: `apps/web/features/team-builder/components/slot-cell.tsx`
- Create: `apps/web/features/team-builder/components/team-column.tsx`
- Create: `apps/web/features/team-builder/components/formation-grid.tsx`

**Interfaces:**
- Consumes: `Slot` (Task 1); `isValidPlacement`, `invalidPlacementReason` (Task 3); `SlotDropData` (Task 4); `useFormationStore` (Task 6); `DraggableMember` (Task 7); `Character` từ `@/features/attendance`
- Produces:
  - `SlotPlaceholder({ slot })`
  - `SlotCell({ slot, character? })`
  - `TeamColumn({ team, slots, charactersById })`
  - `FormationGrid({ charactersById })`

- [ ] **Step 1: Viết nội dung ô trống**

Tạo `apps/web/features/team-builder/components/slot-placeholder.tsx`:

```tsx
import { GUILD_CLASS_LABEL } from "@shared/enums";

import type { Slot } from "../types/formation";

interface SlotPlaceholderProps {
  /** The empty slot being described */
  slot: Slot;
}

/**
 * Content of an empty slot: the allowed guild classes, or a neutral hint when
 * the slot takes anyone.
 * @param slot - The empty slot being described
 * @returns Muted label describing what belongs in this slot
 */
export function SlotPlaceholder({ slot }: SlotPlaceholderProps) {
  const allowed = slot.allowedClasses ?? [];

  const label =
    allowed.length === 0
      ? "Ô trống"
      : allowed.map((guildClass) => GUILD_CLASS_LABEL[guildClass]).join(" / ");

  return (
    <span className="truncate px-2 text-xs text-muted-foreground">{label}</span>
  );
}
```

- [ ] **Step 2: Viết ô**

Tạo `apps/web/features/team-builder/components/slot-cell.tsx`:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";

import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import type { SlotDropData } from "../lib/dnd-data";
import { invalidPlacementReason, isValidPlacement } from "../lib/validation";
import type { Slot } from "../types/formation";
import { DraggableMember } from "./draggable-member";
import { SlotPlaceholder } from "./slot-placeholder";

interface SlotCellProps {
  /** Slot this cell renders */
  slot: Slot;
  /** Character currently standing here, if any */
  character?: Character;
}

/**
 * One droppable cell of the formation. Never rejects a drop — a character of the
 * wrong guild class is accepted and flagged instead, since the admin arranging
 * the formation may be breaking the rule on purpose.
 * @param slot - Slot this cell renders
 * @param character - Character currently standing here, if any
 * @returns Droppable cell holding either a draggable member or a placeholder
 */
export function SlotCell({ slot, character }: SlotCellProps) {
  const data: SlotDropData = { type: "slot", slotId: slot.id };
  const { setNodeRef, isOver } = useDroppable({ id: slot.id, data });

  const invalidReason =
    character && !isValidPlacement(slot, character.guildClass)
      ? invalidPlacementReason(slot)
      : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-11 items-center rounded-md transition-colors",
        !character && "border border-dashed border-border bg-muted/30",
        isOver && "ring-2 ring-primary"
      )}
    >
      {character ? (
        <DraggableMember
          character={character}
          from={slot.id}
          invalidReason={invalidReason}
        />
      ) : (
        <SlotPlaceholder slot={slot} />
      )}
    </div>
  );
}
```

Chiều cao cố định `h-11` cho cả ô đầy và ô trống — không có ô nào co giãn khi kéo thả, nên lưới không nhảy.

- [ ] **Step 3: Viết cột team**

Tạo `apps/web/features/team-builder/components/team-column.tsx`:

```tsx
import type { Character } from "@/features/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Slot } from "../types/formation";
import { SlotCell } from "./slot-cell";

interface TeamColumnProps {
  /** Team number shown in the header */
  team: number;
  /** The six slots of this team, already sorted by position */
  slots: Slot[];
  /** Occupant of each slot, keyed by slot id. A missing key means the slot is empty. */
  occupants: Map<string, Character>;
}

/**
 * One team of the formation: a single column of six slots stacked vertically.
 * Receives occupants already resolved by slot id — resolving them needs the
 * assignment, which only FormationGrid reads.
 * @param team - Team number shown in the header
 * @param slots - The six slots of this team, sorted by position
 * @param occupants - Occupant of each slot, keyed by slot id
 * @returns Card holding the team's slots
 */
export function TeamColumn({ team, slots, occupants }: TeamColumnProps) {
  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Team {team}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3">
        {slots.map((slot) => (
          <SlotCell key={slot.id} slot={slot} character={occupants.get(slot.id)} />
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Viết lưới đội hình**

Tạo `apps/web/features/team-builder/components/formation-grid.tsx`:

```tsx
"use client";

import { useMemo } from "react";

import type { Character } from "@/features/attendance";
import { useFormationStore } from "../store/formation-store";
import type { Slot } from "../types/formation";
import { TeamColumn } from "./team-column";

interface FormationGridProps {
  /** Full roster indexed by character id */
  charactersById: Map<string, Character>;
}

/**
 * The whole formation: ten team columns laid out with CSS Grid, five per row on
 * large screens. Slots are stored flat and grouped by team here, so changing the
 * team count only means changing the mock builder.
 * @param charactersById - Full roster indexed by character id
 * @returns Grid of team columns
 */
export function FormationGrid({ charactersById }: FormationGridProps) {
  const formation = useFormationStore((state) => state.formation);
  const assignment = useFormationStore((state) => state.assignment);

  const teams = useMemo(() => {
    const grouped = new Map<number, Slot[]>();

    for (const slot of formation.slots) {
      const slots = grouped.get(slot.team) ?? [];
      slots.push(slot);
      grouped.set(slot.team, slots);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([team, slots]) => ({
        team,
        slots: [...slots].sort((a, b) => a.position - b.position),
      }));
  }, [formation.slots]);

  const occupants = useMemo(() => {
    const map = new Map<string, Character>();

    for (const [slotId, characterId] of Object.entries(assignment)) {
      if (characterId === null) continue;
      const character = charactersById.get(characterId);
      if (character) map.set(slotId, character);
    }

    return map;
  }, [assignment, charactersById]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {teams.map(({ team, slots }) => (
        <TeamColumn key={team} team={team} slots={slots} occupants={occupants} />
      ))}
    </div>
  );
}
```

Ở `lg` cho ra đúng 2 hàng × 5 team-block như yêu cầu; màn hẹp hơn thì xuống 3 rồi 2 cột thay vì tràn ngang.

- [ ] **Step 5: Kiểm tra lint**

```bash
pnpm --filter web lint
```

Kỳ vọng: không lỗi.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(ui): add formation grid with droppable slots for team builder"
```

---

### Task 9: Bộ lọc và vùng pool

**Files:**
- Create: `apps/web/features/team-builder/components/pool-filters.tsx`
- Create: `apps/web/features/team-builder/components/member-pool.tsx`

**Interfaces:**
- Consumes: `usePoolFilterStore` (Task 6); `usePool` (Task 6); `POOL_DROPPABLE_ID`, `PoolDropData` (Task 4); `DraggableMember` (Task 7); `ScrollArea` (Task 1)
- Produces:
  - `PoolFilters()`
  - `MemberPool({ characters })` — `characters` là toàn bộ danh sách từ server

- [ ] **Step 1: Viết bộ lọc**

Tạo `apps/web/features/team-builder/components/pool-filters.tsx`. Bố cục sao theo `features/attendance/components/attendance-filters.tsx` để hai màn nhìn giống nhau:

```tsx
"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@shared/enums";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GUILD_CLASS_IMAGE } from "@/lib/guild-class";
import { usePoolFilterStore } from "../store/pool-filter-store";

/**
 * Search box and guild class picker narrowing the member pool.
 * Reads and writes the pool filter store directly.
 * @returns Filter row for the member pool
 */
export function PoolFilters() {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);
  const setSearch = usePoolFilterStore((state) => state.setSearch);
  const setGuildClasses = usePoolFilterStore((state) => state.setGuildClasses);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pool-search">Tìm kiếm</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pool-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên thành viên hoặc ID..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pool-guild-class">Lưu phái</Label>
        <Select
          multiple
          value={guildClasses}
          onValueChange={(value) => setGuildClasses(value)}
        >
          <SelectTrigger id="pool-guild-class" className="w-full">
            <SelectValue>
              {(value: GuildClass[]) => {
                if (value.length === 0) return "Tất cả lưu phái";
                if (value.length === 1)
                  return (
                    <span className="flex items-center gap-2">
                      <Image
                        src={GUILD_CLASS_IMAGE[value[0]]}
                        alt=""
                        width={20}
                        height={20}
                        className="size-5 rounded-sm object-cover"
                      />
                      {GUILD_CLASS_LABEL[value[0]]}
                    </span>
                  );
                return `${value.length} lưu phái`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {GUILD_CLASS_OPTIONS.map((guildClass) => (
              <SelectItem key={guildClass} value={guildClass}>
                <span className="flex items-center gap-2">
                  <Image
                    src={GUILD_CLASS_IMAGE[guildClass]}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-sm object-cover"
                  />
                  {GUILD_CLASS_LABEL[guildClass]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Viết vùng pool**

Tạo `apps/web/features/team-builder/components/member-pool.tsx`:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Character } from "@/features/attendance";
import { cn } from "@/lib/utils";
import { usePool } from "../hooks/use-pool";
import { POOL_DROPPABLE_ID, type PoolDropData } from "../lib/dnd-data";
import { DraggableMember } from "./draggable-member";
import { PoolFilters } from "./pool-filters";

interface MemberPoolProps {
  /** Full guild roster from the server */
  characters: Character[];
}

/**
 * Members not yet placed in the formation. The list is derived from the
 * assignment on every render, so dropping someone into a slot removes them here
 * without any extra bookkeeping. Dropping a card back onto this area frees their slot.
 * @param characters - Full guild roster from the server
 * @returns Card holding the filters and the available members
 */
export function MemberPool({ characters }: MemberPoolProps) {
  const data: PoolDropData = { type: "pool" };
  const { setNodeRef, isOver } = useDroppable({ id: POOL_DROPPABLE_ID, data });

  const pool = usePool(characters);
  const hasFilteredEverythingOut = pool.length === 0 && characters.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thành viên chưa xếp ({pool.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PoolFilters />

        <div
          ref={setNodeRef}
          className={cn(
            "rounded-md border border-dashed p-2 transition-colors",
            isOver && "border-primary bg-primary/5"
          )}
        >
          <ScrollArea className="h-64">
            {pool.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {hasFilteredEverythingOut
                  ? "Không có thành viên nào khớp bộ lọc."
                  : "Đã xếp hết thành viên vào đội hình."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 pr-3 md:grid-cols-3 lg:grid-cols-4">
                {pool.map((character) => (
                  <DraggableMember
                    key={character.id}
                    character={character}
                    from={POOL_DROPPABLE_ID}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
```

Hai thông báo rỗng khác nhau là có chủ đích: "lọc ra không còn ai" và "đã xếp hết" là hai tình huống khác nhau, gộp lại sẽ khiến người dùng tưởng mất dữ liệu.

- [ ] **Step 3: Kiểm tra lint**

```bash
pnpm --filter web lint
```

Kỳ vọng: không lỗi.

- [ ] **Step 4: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(ui): add filterable member pool for team builder"
```

---

### Task 10: Ghép màn hình bằng DndContext

Task cuối nối mọi thứ lại: lấy dữ liệu, dựng `DndContext`, xử lý `onDragEnd`, render `DragOverlay`.

**Files:**
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx` (thay toàn bộ nội dung khung rỗng hiện tại)

**Interfaces:**
- Consumes: `useCharacters`, `Character` từ `@/features/attendance`; `useFormationStore` (Task 6); `isMemberDragData`, `toDragSource`, `toDropTarget` (Task 4); `FormationGrid` (Task 8); `MemberPool` (Task 9); `MemberCard` (Task 7); `ErrorState` từ `@/components/shared/error-state`; `Skeleton` từ `@/components/ui/skeleton`
- Produces: `TeamBuilderScreen()` — đã được `features/team-builder/index.ts` export sẵn, **không cần sửa barrel**

- [ ] **Step 1: Thay nội dung màn hình**

Thay toàn bộ `apps/web/features/team-builder/components/team-builder-screen.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCharacters, type Character } from "@/features/attendance";
import { isMemberDragData, toDragSource, toDropTarget } from "../lib/dnd-data";
import { useFormationStore } from "../store/formation-store";
import { FormationGrid } from "./formation-grid";
import { MemberCard } from "./member-card";
import { MemberPool } from "./member-pool";

/**
 * Guild war formation builder (admin only). Owns the DndContext and translates
 * dnd-kit events into store actions; every rule about what a drop means lives in
 * `lib/assignment.ts`, so this handler stays free of business branches.
 * @returns The formation builder screen
 */
export function TeamBuilderScreen() {
  const { data, isPending, isError, error, refetch } = useCharacters();
  const drop = useFormationStore((state) => state.drop);
  const reset = useFormationStore((state) => state.reset);

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);

  const characters = useMemo(() => data ?? [], [data]);
  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters]
  );

  // A short distance threshold keeps a plain click on a card from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /**
   * Remember which character is moving so DragOverlay can preview it.
   * @param event - dnd-kit drag start event
   */
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (!isMemberDragData(data)) return;
    setActiveCharacter(charactersById.get(data.characterId) ?? null);
  }

  /**
   * Hand the finished gesture to the store. Malformed payloads and drops
   * outside every droppable both end up as no-ops.
   * @param event - dnd-kit drag end event
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveCharacter(null);

    const dragData = event.active.data.current;
    if (!isMemberDragData(dragData)) return;

    drop(
      toDragSource(dragData),
      dragData.characterId,
      toDropTarget(event.over?.data.current)
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            message={error?.message ?? "Không tải được danh sách thành viên."}
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCharacter(null)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Xếp đội hình bang chiến</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Đặt lại
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button type="button" size="sm" disabled>
                    Lưu đội hình
                  </Button>
                }
              />
              <TooltipContent>Chức năng đang được xây dựng</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <FormationGrid charactersById={charactersById} />
        <MemberPool characters={characters} />
      </div>

      <DragOverlay>
        {activeCharacter ? (
          <MemberCard character={activeCharacter} className="cursor-grabbing" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

Nút "Lưu đội hình" để `disabled` có chủ đích — backend chưa có endpoint, đây là chỗ nối API sau.

- [ ] **Step 2: Chạy lint và build**

```bash
pnpm --filter web lint && pnpm --filter web build
```

Kỳ vọng: lint không lỗi, build thành công. Build là bước kiểm tra kiểu thật sự — `eslint-config-next` không tự chạy `tsc`.

Nếu build báo `disabled` button không kích hoạt được tooltip: bọc `Button` trong một `<span>` rồi truyền span đó vào `render`, vì phần tử `disabled` không phát sự kiện chuột.

- [ ] **Step 3: Chạy lại toàn bộ test**

```bash
pnpm --filter web test
```

Kỳ vọng: PASS toàn bộ — 4 file test của team-builder cộng các file có sẵn.

- [ ] **Step 4: Kiểm tra thủ công trên trình duyệt**

```bash
pnpm --filter web dev
```

Đăng nhập bằng tài khoản quản trị viên rồi mở `http://localhost:3000/xep-team`. Xác nhận đủ 8 điều:

1. Lưới hiện 10 team-block, `lg` xếp 2 hàng × 5; mỗi team là 1 cột 6 ô.
2. Kéo một card từ pool lên ô trống → card vào ô, biến khỏi pool, số đếm ở tiêu đề pool giảm 1.
3. Kéo card từ pool lên ô **đã có người** → người mới vào ô, người cũ quay lại pool.
4. Kéo card giữa hai ô đều có người → hai người đổi chỗ, không ai biến mất.
5. Kéo card từ ô thả xuống vùng pool → ô trở lại trạng thái trống có viền đứt.
6. Thả card ra ngoài mọi vùng (ví dụ ra lề trang) → không có gì thay đổi.
7. Thả người **sai lưu phái** vào ô có ràng buộc (ví dụ Long Ngâm vào vị trí 1 vốn dành cho Thiết Y) → **vẫn thả được**, card viền đỏ, rê chuột lên hiện tooltip "Ô này dành cho Thiết Y".
8. Gõ vào ô tìm kiếm và chọn lưu phái → pool lọc đúng; người đã xếp không bao giờ xuất hiện lại trong pool.

Thêm một phép kiểm chứng quan trọng: xếp một người vào ô, rồi **tìm kiếm tên người đó** — họ không được xuất hiện trong pool. Đây là bằng chứng pool đúng là derived state chứ không phải bản sao.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/components/team-builder-screen.tsx
git commit -m "feat(ui): wire drag and drop formation builder screen"
```

---

## Ghi chú bàn giao

Khi backend có `PUT /team-builder/formations/:id` (idempotent, nhận nguyên `Assignment`), phần cần thêm là:

- `features/team-builder/api/team-builder-api.ts` — query key factory + hàm gọi qua `apiFetch`
- `features/team-builder/hooks/use-save-formation.ts` — `useMutation` + optimistic update + rollback
- Bật nút "Lưu đội hình" trong `team-builder-screen.tsx`, bỏ tooltip

Store, reducer và toàn bộ component **không phải sửa** — đó là mục đích của việc tách `Assignment` khỏi `Formation` ngay từ đầu.
