# Copy đội hình từ ngày này sang ngày khác — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút "Copy từ {ngày nguồn}" vào toolbar màn Xếp team — copy đội hình + ghi chú của ngày
liền trước (ngày đầu tuần lấy ngày cuối tuần trước) vào trận đang mở, bỏ những người không điểm danh
"Có" cho ngày đích.

**Architecture:** Toàn bộ nằm ở `apps/web/features/team-builder`, không đụng backend. Phần "chép một
trận, bỏ người vắng" được tách khỏi `buildPrefill` thành `lib/copy-match.ts` để điền-tự-động và nút
copy dùng chung một luật. Phần "ngày nào là nguồn" là một hàm thuần trong `lib/copy-source.ts`. Một
nhánh hook mới `useFormationCopy` nối hai thứ đó với nhau, giữ đúng chiều dữ liệu một chiều của màn
hình (week → selection → draft → pool → **copy** → dnd) và ghi vào nháp qua callback của
`useFormationDraft`, đúng như `seedFrom` đang làm.

**Tech Stack:** Next.js App Router · TanStack Query · Zustand · shadcn/ui (Dialog, Button) · sonner
(toast) · Vitest + Testing Library · pnpm workspace.

**Spec:** [docs/superpowers/specs/2026-09-01-copy-formation-between-sessions-design.md](../specs/2026-09-01-copy-formation-between-sessions-design.md)

## Global Constraints

- **TDD**: mỗi task viết test trước, chạy cho nó đỏ, rồi mới viết code cho xanh. Test mô tả **hành vi**.
- Chữ hiển thị cho người dùng bằng **tiếng Việt**; tên file, định danh, commit message bằng tiếng Anh.
  Tên test viết **tiếng Việt**, theo đúng các file test sẵn có trong feature này.
- Comment/JSDoc trong `apps/web/features/team-builder` viết **tiếng Anh**. Mọi hàm export đều có
  JSDoc: mục đích, từng `@param`, `@returns`.
- Không đụng `apps/api`, `packages/shared`, `prisma/`, `docs/architecture.md` — spec §6 nói rõ không
  có endpoint/migration/env mới.
- Server state → TanStack Query, nháp → Zustand. **Không** ghi response API vào store.
- `useFormationDraft` là writer duy nhất của `drafts`; hook khác chỉ đề xuất qua callback.
- Dữ liệu bất biến: mọi hàm trả object/array mới, không sửa tại chỗ.
- Nhánh `feat/copy-formation-between-sessions`, mỗi task một commit, **không** dòng `Co-Authored-By`.
- Lệnh kiểm tra cuối: `pnpm --filter web test`, `pnpm --filter web build`.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/web/features/team-builder/lib/copy-match.ts` | Chép một trận, bỏ người không điểm danh, đếm số người bị bỏ |
| `apps/web/features/team-builder/lib/__tests__/copy-match.test.ts` | Test luật trên |
| `apps/web/features/team-builder/lib/copy-source.ts` | Tìm ngày/trận nguồn: ngày liền trước, lùi một tuần cho ngày đầu tuần |
| `apps/web/features/team-builder/lib/__tests__/copy-source.test.ts` | Test luật tìm nguồn |
| `apps/web/features/team-builder/hooks/use-formation-copy.ts` | Nhánh copy của màn hình: nguồn, nhãn nút, hành động copy |
| `apps/web/features/team-builder/hooks/__tests__/use-formation-copy.test.ts` | Test hook trên |
| `apps/web/features/team-builder/components/copy-formation-dialog.tsx` | Dialog xác nhận ghi đè |
| `apps/web/features/team-builder/components/__tests__/formation-toolbar.test.tsx` | Test nhãn/disabled của nút copy |

**Sửa**

| File | Đổi gì |
|---|---|
| `apps/web/features/team-builder/lib/prefill.ts` | Gọi lại `copyMatch` thay vì tự lọc người vắng |
| `apps/web/features/team-builder/lib/week-status.ts` | Thêm `findPreviousWeekStart` |
| `apps/web/features/team-builder/lib/__tests__/week-status.test.ts` | Test hàm mới |
| `apps/web/features/team-builder/hooks/use-formations.ts` | Thêm tham số `enabled` |
| `apps/web/features/team-builder/hooks/use-formation-draft.ts` | Expose `matchesBySession`, thêm `copyIntoActiveMatch` |
| `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts` | Test `copyIntoActiveMatch` |
| `apps/web/features/team-builder/hooks/use-formation-pool.ts` | Expose `presentIds` |
| `apps/web/features/team-builder/hooks/use-formation-screen.ts` | Nối nhánh `copy` |
| `apps/web/features/team-builder/components/formation-toolbar.tsx` | Nút "Copy từ {nguồn}" |
| `apps/web/features/team-builder/components/team-builder-screen.tsx` | Dialog xác nhận + nối props |

---

### Task 1: Tách luật "chép một trận, bỏ người vắng" ra dùng chung

`buildPrefill` đang tự lọc người vắng trong vòng lặp của nó. Nút copy cần đúng luật đó, nên luật
được tách ra một file riêng và `buildPrefill` gọi lại — spec §7.

**Files:**
- Create: `apps/web/features/team-builder/lib/copy-match.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/copy-match.test.ts`
- Modify: `apps/web/features/team-builder/lib/prefill.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface CopiedMatch {
    assignment: Assignment;
    notes: Notes;
    droppedCount: number;
  }

  export function copyMatch(
    match: MatchDraft,
    presentIds: Set<string>,
    slots: Slot[]
  ): CopiedMatch;
  ```

- [ ] **Step 1: Viết test đỏ**

Create `apps/web/features/team-builder/lib/__tests__/copy-match.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { MatchDraft, Slot } from "../../types/formation";
import { copyMatch } from "../copy-match";

const SLOTS: Slot[] = [
  { id: "team-1-pos-1", team: 1, position: 1 },
  { id: "team-1-pos-2", team: 1, position: 2 },
  { id: "team-1-pos-3", team: 1, position: 3 },
];

const SOURCE: MatchDraft = {
  assignment: {
    "team-1-pos-1": "char-1",
    "team-1-pos-2": "char-2",
    "team-1-pos-3": null,
  },
  notes: { "team-1-pos-2": "giữ cửa" },
};

describe("copyMatch", () => {
  it("giữ đúng vị trí của người vẫn đánh trận này", () => {
    const result = copyMatch(SOURCE, new Set(["char-1", "char-2"]), SLOTS);

    expect(result.assignment).toEqual({
      "team-1-pos-1": "char-1",
      "team-1-pos-2": "char-2",
      "team-1-pos-3": null,
    });
    expect(result.droppedCount).toBe(0);
  });

  it("bỏ người không điểm danh và đếm số người bị bỏ", () => {
    const result = copyMatch(SOURCE, new Set(["char-1"]), SLOTS);

    expect(result.assignment["team-1-pos-2"]).toBeNull();
    expect(result.droppedCount).toBe(1);
  });

  it("giữ ghi chú của ô ngay cả khi người ở ô đó bị bỏ", () => {
    const result = copyMatch(SOURCE, new Set([]), SLOTS);

    expect(result.notes).toEqual({ "team-1-pos-2": "giữ cửa" });
  });

  it("mọi ô của bố cục đều có khoá, kể cả ô nguồn không nhắc tới", () => {
    const result = copyMatch(
      { assignment: { "team-1-pos-1": "char-1" }, notes: {} },
      new Set(["char-1"]),
      SLOTS
    );

    expect(Object.keys(result.assignment)).toEqual([
      "team-1-pos-1",
      "team-1-pos-2",
      "team-1-pos-3",
    ]);
  });

  it("không sửa trận nguồn", () => {
    const source: MatchDraft = {
      assignment: { "team-1-pos-1": "char-1" },
      notes: { "team-1-pos-1": "note" },
    };
    copyMatch(source, new Set([]), SLOTS);

    expect(source.assignment).toEqual({ "team-1-pos-1": "char-1" });
    expect(source.notes).toEqual({ "team-1-pos-1": "note" });
  });
});
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- copy-match`
Expected: FAIL — không resolve được `../copy-match`.

- [ ] **Step 3: Viết `lib/copy-match.ts`**

```ts
import type { Assignment, MatchDraft, Notes, Slot } from "../types/formation";

/** One match copied onto another battle, absentees already dropped. */
export interface CopiedMatch {
  /** Who stands where, one key per slot of the current layout */
  assignment: Assignment;
  /** Notes copied across untouched, keyed by slot id */
  notes: Notes;
  /** How many people were dropped for not attending the target battle */
  droppedCount: number;
}

/**
 * Copy one match onto a battle, keeping only the people attending it.
 * Notes travel across untouched, the note of a dropped occupant included: a
 * note describes the position, not the person.
 * @param match - The match being copied from
 * @param presentIds - Ids of characters attending the target battle
 * @param slots - Slots of the current layout
 * @returns The copied line-up and how many people it dropped
 */
export function copyMatch(
  match: MatchDraft,
  presentIds: Set<string>,
  slots: Slot[]
): CopiedMatch {
  const assignment: Assignment = {};
  let droppedCount = 0;

  for (const slot of slots) {
    const characterId = match.assignment[slot.id] ?? null;

    if (characterId === null) {
      assignment[slot.id] = null;
      continue;
    }

    if (presentIds.has(characterId)) {
      assignment[slot.id] = characterId;
    } else {
      assignment[slot.id] = null;
      droppedCount += 1;
    }
  }

  return { assignment, notes: { ...match.notes }, droppedCount };
}
```

- [ ] **Step 4: Sửa `buildPrefill` gọi lại `copyMatch`**

Trong `lib/prefill.ts`, thay khối `for (const slot of slots)` (dòng 58–77) bằng:

```ts
  const previous: MatchDraft = {
    assignment: fromWire(sourceMatch.slots, slots),
    // Notes travel across untouched, including the note of a slot whose occupant is absent: a note
    // describes the position, not the person.
    notes: fromWireNotes(sourceMatch.notes, slots),
  };
  const copied = copyMatch(previous, presentIds, slots);

  return {
    assignment: copied.assignment,
    notes: copied.notes,
    sourceLabel,
    droppedCount: copied.droppedCount,
  };
```

Thêm `import { copyMatch } from "./copy-match";`, bỏ các khai báo `assignment` / `droppedCount` cũ.

- [ ] **Step 5: Chạy test cho xanh**

Run: `pnpm --filter web test -- copy-match prefill`
Expected: PASS cả hai file — `prefill.test.ts` giữ nguyên, không sửa một dòng nào.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/lib/copy-match.ts \
        apps/web/features/team-builder/lib/__tests__/copy-match.test.ts \
        apps/web/features/team-builder/lib/prefill.ts
git commit -m "refactor(web): extract the copy-a-match rule out of buildPrefill"
```

---

### Task 2: Tìm ngày nguồn (`copy-source.ts` + `findPreviousWeekStart`)

Hai hàm thuần cho luật ở spec §2: duyệt ngược trong tuần, không có thì lùi đúng một tuần.

**Files:**
- Create: `apps/web/features/team-builder/lib/copy-source.ts`
- Create: `apps/web/features/team-builder/lib/__tests__/copy-source.test.ts`
- Modify: `apps/web/features/team-builder/lib/week-status.ts`
- Modify: `apps/web/features/team-builder/lib/__tests__/week-status.test.ts`

**Interfaces:**
- Consumes: `MatchDraft` từ `../types/formation`.
- Produces:
  ```ts
  export interface CopyCandidate {
    sessionId: string;
    label: string;
    matches: MatchDraft[];
  }

  export interface CopySource {
    sessionId: string;
    label: string;   // đã kèm "· trận N" khi ngày đó có nhiều trận
    match: MatchDraft;
  }

  export function findCopySource(
    weekCandidates: CopyCandidate[],
    targetSessionId: string,
    previousWeekCandidates: CopyCandidate[]
  ): CopySource | null;

  export function findPreviousWeekStart(
    weeks: FormationWeek[],
    weekStart: string
  ): string | null;
  ```

- [ ] **Step 1: Viết test đỏ cho `findCopySource`**

Create `apps/web/features/team-builder/lib/__tests__/copy-source.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { MatchDraft } from "../../types/formation";
import { findCopySource, type CopyCandidate } from "../copy-source";

/**
 * Build a match holding one person.
 * @param characterId - Who stands in the first slot
 * @returns A match draft
 */
function filled(characterId: string): MatchDraft {
  return { assignment: { "team-1-pos-1": characterId }, notes: {} };
}

const EMPTY: MatchDraft = { assignment: { "team-1-pos-1": null }, notes: {} };

/**
 * Build one candidate day.
 * @param sessionId - Id of the battle
 * @param label - Display label
 * @param matches - Matches of the day
 * @returns A copy candidate
 */
function day(
  sessionId: string,
  label: string,
  matches: MatchDraft[]
): CopyCandidate {
  return { sessionId, label, matches };
}

const TUESDAY = day("tue", "Thứ 3 · 20:30", [filled("char-1")]);
const THURSDAY = day("thu", "Thứ 5 · 20:30", [EMPTY]);
const SATURDAY = day("sat", "Thứ 7 · Bang Chiến", [EMPTY]);

describe("findCopySource", () => {
  it("lấy ngày gần nhất trước đó có đội hình trong cùng tuần", () => {
    const source = findCopySource([TUESDAY, THURSDAY, SATURDAY], "sat", []);

    expect(source?.sessionId).toBe("tue");
    expect(source?.match).toEqual(filled("char-1"));
  });

  it("bỏ qua ngày chỉ có ghi chú, không có người", () => {
    const noteOnly = day("wed", "Thứ 4 · 20:30", [
      { assignment: { "team-1-pos-1": null }, notes: { "team-1-pos-1": "x" } },
    ]);
    const source = findCopySource([TUESDAY, noteOnly, SATURDAY], "sat", []);

    expect(source?.sessionId).toBe("tue");
  });

  it("lấy trận cuối của ngày nguồn và ghi rõ số trận trong nhãn", () => {
    const twoMatches = day("tue", "Thứ 3 · 20:30", [
      filled("char-1"),
      filled("char-9"),
    ]);
    const source = findCopySource([twoMatches, SATURDAY], "sat", []);

    expect(source?.match).toEqual(filled("char-9"));
    expect(source?.label).toBe("Thứ 3 · 20:30 · trận 2");
  });

  it("ngày một trận thì nhãn chỉ là tên ngày", () => {
    const source = findCopySource([TUESDAY, SATURDAY], "sat", []);

    expect(source?.label).toBe("Thứ 3 · 20:30");
  });

  it("không có ngày nào trước đó thì lùi sang tuần trước, lấy ngày cuối cùng có đội hình", () => {
    const lastWeek = [
      day("prev-tue", "Thứ 3 · 20:30", [filled("char-7")]),
      day("prev-sat", "Thứ 7 · Bang Chiến", [filled("char-8")]),
    ];
    const source = findCopySource([THURSDAY, SATURDAY], "thu", lastWeek);

    expect(source?.sessionId).toBe("prev-sat");
    expect(source?.match).toEqual(filled("char-8"));
  });

  it("tuần trước mà ngày cuối chưa xếp thì lùi tiếp lên ngày trước nữa", () => {
    const lastWeek = [
      day("prev-tue", "Thứ 3 · 20:30", [filled("char-7")]),
      day("prev-sat", "Thứ 7 · Bang Chiến", [EMPTY]),
    ];
    const source = findCopySource([THURSDAY], "thu", lastWeek);

    expect(source?.sessionId).toBe("prev-tue");
  });

  it("trong tuần đã có nguồn thì không đụng tới tuần trước", () => {
    const lastWeek = [day("prev-sat", "Thứ 7 · Bang Chiến", [filled("char-8")])];
    const source = findCopySource([TUESDAY, SATURDAY], "sat", lastWeek);

    expect(source?.sessionId).toBe("tue");
  });

  it("không tuần nào có đội hình thì trả null", () => {
    expect(findCopySource([THURSDAY, SATURDAY], "sat", [])).toBeNull();
  });

  it("ngày đích không nằm trong tuần thì trả null", () => {
    expect(findCopySource([TUESDAY, SATURDAY], "khong-co", [])).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- copy-source`
Expected: FAIL — không resolve được `../copy-source`.

- [ ] **Step 3: Viết `lib/copy-source.ts`**

```ts
import type { MatchDraft } from "../types/formation";

/** One battle day offered as a copy source, with the matches currently shown for it. */
export interface CopyCandidate {
  /** Id of the battle */
  sessionId: string;
  /** Display label of the battle, e.g. "Thứ 7 · Bang Chiến" */
  label: string;
  /** Matches of that day — the draft where one exists, the saved copy otherwise */
  matches: MatchDraft[];
}

/** The match a copy would be taken from. */
export interface CopySource {
  /** Id of the battle it comes from */
  sessionId: string;
  /** Label naming the day, and the match too when that day holds more than one */
  label: string;
  /** The match itself */
  match: MatchDraft;
}

/**
 * Whether a day holds a line-up worth copying. Judged by the PEOPLE placed, not
 * the notes: a day carrying only notes has nothing to copy across.
 * @param candidate - The day being judged
 * @returns true when at least one slot of one match holds someone
 */
function hasLineUp(candidate: CopyCandidate): boolean {
  return candidate.matches.some((match) =>
    Object.values(match.assignment).some(Boolean)
  );
}

/**
 * Turn a day into the source it offers: its last match, which is the line-up
 * closest to the present.
 * @param candidate - The day being copied from
 * @returns The match and the label naming it
 */
function toSource(candidate: CopyCandidate): CopySource {
  const match = candidate.matches[candidate.matches.length - 1];
  const label =
    candidate.matches.length > 1
      ? `${candidate.label} · trận ${candidate.matches.length}`
      : candidate.label;

  return { sessionId: candidate.sessionId, label, match };
}

/**
 * Find the line-up a battle would be copied from: the nearest earlier day of its
 * own week that holds one, falling back to the last such day of the previous
 * week — which is how the first battle of a new week reaches back to the Guild
 * War that closed the old one.
 * @param weekCandidates - Days of the week on screen, ordered by battle time
 * @param targetSessionId - Battle the copy would land on
 * @param previousWeekCandidates - Days of the week before it, ordered by battle time
 * @returns The source, or null when neither week holds a line-up
 */
export function findCopySource(
  weekCandidates: CopyCandidate[],
  targetSessionId: string,
  previousWeekCandidates: CopyCandidate[]
): CopySource | null {
  const targetIndex = weekCandidates.findIndex(
    (candidate) => candidate.sessionId === targetSessionId
  );
  if (targetIndex < 0) return null;

  const inWeek = weekCandidates
    .slice(0, targetIndex)
    .reverse()
    .find(hasLineUp);
  if (inWeek) return toSource(inWeek);

  // Only ONE week back: a line-up two weeks old is stale enough that copying it
  // does more harm than good.
  const lastWeek = [...previousWeekCandidates].reverse().find(hasLineUp);

  return lastWeek ? toSource(lastWeek) : null;
}
```

- [ ] **Step 4: Viết test đỏ cho `findPreviousWeekStart`**

Thêm vào cuối `apps/web/features/team-builder/lib/__tests__/week-status.test.ts` (thêm
`findPreviousWeekStart` vào dòng import sẵn có; file đó không import type `FormationWeek` và cũng
không cần — object literal khớp cấu trúc là đủ):

```ts
describe("findPreviousWeekStart", () => {
  const WEEKS = [
    { weekStart: "2026-08-24T00:00:00.000Z", weekEnd: "", isActive: false },
    { weekStart: "2026-08-17T00:00:00.000Z", weekEnd: "", isActive: true },
    { weekStart: "2026-08-10T00:00:00.000Z", weekEnd: "", isActive: false },
  ];

  it("trả về tuần liền trước trong danh sách", () => {
    expect(findPreviousWeekStart(WEEKS, "2026-08-17T00:00:00.000Z")).toBe(
      "2026-08-10T00:00:00.000Z"
    );
  });

  it("tuần cũ nhất thì không có tuần trước", () => {
    expect(findPreviousWeekStart(WEEKS, "2026-08-10T00:00:00.000Z")).toBeNull();
  });

  it("tuần không có trong danh sách vẫn lấy được tuần cũ hơn gần nhất", () => {
    expect(findPreviousWeekStart(WEEKS, "2026-08-31T00:00:00.000Z")).toBe(
      "2026-08-24T00:00:00.000Z"
    );
  });

  it("danh sách rỗng thì trả null", () => {
    expect(findPreviousWeekStart([], "2026-08-17T00:00:00.000Z")).toBeNull();
  });
});
```

- [ ] **Step 5: Viết `findPreviousWeekStart` trong `lib/week-status.ts`**

```ts
/**
 * Monday of the week before the one on screen, among the weeks that still hold
 * data. Read off the list rather than subtracting seven days: the list is the
 * answer to "which week still has anything in it".
 * @param weeks - Weeks that still hold formation data, newest first
 * @param weekStart - Monday of the week on screen
 * @returns Monday of the newest week older than it, or null when there is none
 */
export function findPreviousWeekStart(
  weeks: FormationWeek[],
  weekStart: string
): string | null {
  const target = new Date(weekStart).getTime();
  const previous = weeks.find(
    (week) => new Date(week.weekStart).getTime() < target
  );

  return previous?.weekStart ?? null;
}
```

- [ ] **Step 6: Chạy test cho xanh**

Run: `pnpm --filter web test -- copy-source week-status`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/team-builder/lib/copy-source.ts \
        apps/web/features/team-builder/lib/__tests__/copy-source.test.ts \
        apps/web/features/team-builder/lib/week-status.ts \
        apps/web/features/team-builder/lib/__tests__/week-status.test.ts
git commit -m "feat(web): find the day a formation would be copied from"
```

---

### Task 3: Nháp nhận được một trận copy, pool trả ra `presentIds`

Nhánh copy cần đọc "các trận đang hiển thị của từng ngày" và "ai điểm danh Có cho ngày đang mở", rồi
ghi kết quả vào **trận đang mở**. Cả ba thứ đó nằm ở hai hook sẵn có.

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formation-draft.ts`
- Modify: `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts`
- Modify: `apps/web/features/team-builder/hooks/use-formation-pool.ts`

**Interfaces:**
- Produces (thêm vào `FormationDraftState`):
  ```ts
  /** Matches shown for every day of the week: the draft where one exists, the saved copy otherwise */
  matchesBySession: Record<string, MatchDraft[]>;
  /** Overwrite the match currently open with a copied line-up */
  copyIntoActiveMatch: (match: MatchDraft) => void;
  ```
- Produces (thêm vào `FormationPoolState`):
  ```ts
  /** Ids of characters who said they are coming to the open battle */
  presentIds: Set<string>;
  ```

- [ ] **Step 1: Viết test đỏ**

Thêm vào `apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts` (theo đúng
cách các test sẵn có trong file đó dựng hook — đọc file trước để bám mẫu `renderFormationHook` và
`makeSession`):

```ts
describe("copyIntoActiveMatch", () => {
  it("ghi đè trận đang mở bằng đội hình được copy", () => {
    const sessions = [makeSession("thu-3"), makeSession("thu-5")];
    const { result } = renderFormationHook(
      () => useFormationDraft(sessions, "thu-5", true, () => {}),
      { formation: { activeSessionId: "thu-5" } }
    );

    act(() =>
      result.current.copyIntoActiveMatch({
        assignment: { "team-1-pos-1": "char-1" },
        notes: { "team-1-pos-1": "giữ cửa" },
      })
    );

    expect(result.current.assignment["team-1-pos-1"]).toBe("char-1");
    expect(result.current.notes).toEqual({ "team-1-pos-1": "giữ cửa" });
    expect(result.current.dirty).toBe(true);
  });

  it("không đụng tới trận còn lại của ngày", () => {
    const sessions = [makeSession("thu-5")];
    const { result } = renderFormationHook(
      () => useFormationDraft(sessions, "thu-5", true, () => {}),
      {
        formation: {
          activeSessionId: "thu-5",
          activeMatchIndex: 1,
          drafts: {
            "thu-5": [
              { assignment: { "team-1-pos-1": "char-9" }, notes: {} },
              { assignment: { "team-1-pos-1": null }, notes: {} },
            ],
          },
        },
      }
    );

    act(() =>
      result.current.copyIntoActiveMatch({
        assignment: { "team-1-pos-1": "char-1" },
        notes: {},
      })
    );

    expect(result.current.matches[0].assignment["team-1-pos-1"]).toBe("char-9");
    expect(result.current.matches[1].assignment["team-1-pos-1"]).toBe("char-1");
  });

  it("không làm gì khi chưa mở ngày nào", () => {
    const { result } = renderFormationHook(() =>
      useFormationDraft([], null, true, () => {})
    );

    act(() =>
      result.current.copyIntoActiveMatch({ assignment: {}, notes: {} })
    );

    expect(result.current.dirty).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- use-formation-draft`
Expected: FAIL — `result.current.copyIntoActiveMatch is not a function`.

- [ ] **Step 3: Thêm `copyIntoActiveMatch` vào `use-formation-draft.ts`**

Đặt ngay dưới `clearActiveDraft`:

```ts
  /**
   * Overwrite the match currently open with a copied line-up, leaving the
   * other match of the day alone. The copy already carries a key per slot, so
   * it replaces the match outright rather than merging into it — merging two
   * line-ups produces a third one nobody laid out.
   * @param match - The line-up to write, already stripped of absentees
   */
  function copyIntoActiveMatch(match: MatchDraft) {
    if (!activeSessionId) return;

    const next = matches.map((current, index) =>
      index === activeMatchIndex ? match : current
    );
    setDraft(activeSessionId, next);
  }
```

Thêm `matchesBySession` và `copyIntoActiveMatch` vào cả `FormationDraftState` (có JSDoc như khối
Interfaces ở trên) lẫn object `return`.

- [ ] **Step 4: Expose `presentIds` từ `use-formation-pool.ts`**

`presentIds` đã được `useMemo` sẵn ở đầu hook — chỉ cần thêm nó vào interface
`FormationPoolState` (kèm JSDoc) và vào object `return`.

- [ ] **Step 5: Chạy test cho xanh**

Run: `pnpm --filter web test -- use-formation-draft use-formation-pool`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder/hooks/use-formation-draft.ts \
        apps/web/features/team-builder/hooks/__tests__/use-formation-draft.test.ts \
        apps/web/features/team-builder/hooks/use-formation-pool.ts
git commit -m "feat(web): let the draft receive a copied match"
```

---

### Task 4: Nhánh hook `useFormationCopy`

Nối "tìm nguồn" với "ghi vào nháp", và là chỗ duy nhất fetch đội hình tuần trước.

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formations.ts`
- Create: `apps/web/features/team-builder/hooks/use-formation-copy.ts`
- Create: `apps/web/features/team-builder/hooks/__tests__/use-formation-copy.test.ts`
- Modify: `apps/web/features/team-builder/hooks/use-formation-screen.ts`

**Interfaces:**
- Consumes: `copyMatch` (Task 1), `findCopySource` / `findPreviousWeekStart` (Task 2),
  `matchesBySession` / `copyIntoActiveMatch` / `presentIds` (Task 3), `toastSuccess` từ
  `@/components/shared/toast`, `FORMATION` từ `../lib/mock-formation`.
- Produces:
  ```ts
  export interface FormationCopyState {
    sourceLabel: string | null;
    canCopy: boolean;
    copy: () => void;
  }

  export function useFormationCopy(
    sessions: SessionFormation[],
    activeSessionId: string | null,
    editable: boolean,
    weeks: FormationWeek[],
    weekStart: string,
    matchesBySession: Record<string, MatchDraft[]>,
    presentIds: Set<string>,
    copyIntoActiveMatch: (match: MatchDraft) => void
  ): FormationCopyState;
  ```
  và `FormationScreenState.copy: FormationCopyState`.

- [ ] **Step 1: Thêm `enabled` vào `useFormations`**

```ts
/**
 * Saved formations for every battle of one week.
 * This is the server copy — user edits live as drafts in the Zustand store.
 * @param weekStart - Monday of the week to read; omit for the open week
 * @param enabled - Whether the request may run; false parks the query
 * @returns TanStack query holding the week's sessions and their formations
 */
export function useFormations(weekStart?: string, enabled = true) {
  return useQuery({
    queryKey: teamBuilderKeys.formations(weekStart),
    queryFn: () => fetchFormations(weekStart),
    enabled,
  });
}
```

- [ ] **Step 2: Viết test đỏ**

Create `apps/web/features/team-builder/hooks/__tests__/use-formation-copy.test.ts`:

```ts
// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormationWeek } from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { fetchFormations } from "../../api/team-builder-api";
import { useFormationCopy } from "../use-formation-copy";
import { makeSession, renderFormationHook } from "./render-formation-hook";

vi.mock("../../api/team-builder-api", () => ({
  fetchFormationWeeks: vi.fn(),
  fetchFormations: vi.fn(),
  saveFormation: vi.fn(),
}));

vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const fetchFormationsMock = vi.mocked(fetchFormations);
const toastSuccessMock = vi.mocked(toastSuccess);

const THIS_WEEK = "2026-08-17T00:00:00.000Z";
const LAST_WEEK = "2026-08-10T00:00:00.000Z";

const WEEKS: FormationWeek[] = [
  { weekStart: THIS_WEEK, weekEnd: "", isActive: true },
  { weekStart: LAST_WEEK, weekEnd: "", isActive: false },
];

const SESSIONS = [makeSession("thu-3"), makeSession("thu-5")];

/** Matches shown for the week: Thứ 3 has a line-up, Thứ 5 is empty. */
const MATCHES = {
  "thu-3": [{ assignment: { "team-1-pos-1": "char-1" }, notes: { "team-1-pos-1": "giữ cửa" } }],
  "thu-5": [{ assignment: { "team-1-pos-1": null }, notes: {} }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useFormationCopy", () => {
  it("nhãn nút nói rõ ngày nguồn trong cùng tuần", () => {
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        true,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set(["char-1"]),
        () => {}
      )
    );

    expect(result.current.sourceLabel).toBe("Trận thu-3");
    expect(result.current.canCopy).toBe(true);
    expect(fetchFormationsMock).not.toHaveBeenCalled();
  });

  it("copy ghi đội hình đã lọc người vắng vào nháp và báo toast", () => {
    const copyInto = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        true,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set([]),
        copyInto
      )
    );

    act(() => result.current.copy());

    expect(copyInto).toHaveBeenCalledWith(
      expect.objectContaining({
        assignment: expect.objectContaining({ "team-1-pos-1": null }),
        notes: { "team-1-pos-1": "giữ cửa" },
      })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Đã copy từ Trận thu-3 · bỏ 1 người không đánh trận này. Chưa lưu."
    );
  });

  it("không ai bị bỏ thì câu thông báo không có vế đó", () => {
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        true,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set(["char-1"]),
        () => {}
      )
    );

    act(() => result.current.copy());

    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Đã copy từ Trận thu-3. Chưa lưu."
    );
  });

  it("trận đầu tuần lấy nguồn từ tuần trước", async () => {
    fetchFormationsMock.mockResolvedValue([
      makeSession("prev-sat", {
        label: "Thứ 7 · Bang Chiến",
        matches: [{ slots: { "team-1-pos-1": "char-2" }, notes: {} }],
      }),
    ]);

    const { result } = renderFormationHook(() =>
      useFormationCopy(
        [SESSIONS[0]],
        "thu-3",
        true,
        WEEKS,
        THIS_WEEK,
        { "thu-3": [{ assignment: { "team-1-pos-1": null }, notes: {} }] },
        new Set(["char-2"]),
        () => {}
      )
    );

    await waitFor(() =>
      expect(result.current.sourceLabel).toBe("Thứ 7 · Bang Chiến")
    );
    expect(fetchFormationsMock).toHaveBeenCalledWith(LAST_WEEK);
  });

  it("ngày đã đánh xong thì không copy được", () => {
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        SESSIONS,
        "thu-5",
        false,
        WEEKS,
        THIS_WEEK,
        MATCHES,
        new Set(["char-1"]),
        () => {}
      )
    );

    expect(result.current.canCopy).toBe(false);
  });

  it("không có nguồn nào thì không có nhãn và copy là no-op", () => {
    const copyInto = vi.fn();
    const { result } = renderFormationHook(() =>
      useFormationCopy(
        [SESSIONS[1]],
        "thu-5",
        true,
        [WEEKS[0]],
        THIS_WEEK,
        MATCHES,
        new Set([]),
        copyInto
      )
    );

    act(() => result.current.copy());

    expect(result.current.sourceLabel).toBeNull();
    expect(result.current.canCopy).toBe(false);
    expect(copyInto).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- use-formation-copy`
Expected: FAIL — không resolve được `../use-formation-copy`.

- [ ] **Step 4: Viết `hooks/use-formation-copy.ts`**

```ts
"use client";

import { useMemo } from "react";
import type { FormationWeek, SessionFormation } from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { copyMatch } from "../lib/copy-match";
import { findCopySource, type CopyCandidate } from "../lib/copy-source";
import { FORMATION } from "../lib/mock-formation";
import { findPreviousWeekStart } from "../lib/week-status";
import { fromWireMatches } from "../lib/wire";
import type { MatchDraft } from "../types/formation";
import { useFormations } from "./use-formations";

/** The copy button's branch: where it would copy from, and the action itself. */
export interface FormationCopyState {
  /** Label of the day the button would copy from, null when there is nothing to copy */
  sourceLabel: string | null;
  /** Whether the button may be pressed */
  canCopy: boolean;
  /** Copy the source into the open match; a no-op when there is no source */
  copy: () => void;
}

/**
 * Copying a line-up onto the open battle. The source is picked automatically —
 * the nearest earlier day holding one, reaching back into the previous week for
 * the first battle of a new week. The previous week is fetched ONLY when the
 * week on screen offers no source of its own, so an ordinary day costs no extra
 * request.
 *
 * Like the prefill, this hook proposes and `useFormationDraft` writes: the copy
 * leaves through `copyIntoActiveMatch` rather than touching the store.
 * @param sessions - Battles of the week on screen, ordered by battle time
 * @param activeSessionId - Battle whose tab is open, null when there is none
 * @param editable - Whether the open battle still accepts edits
 * @param weeks - Weeks that still hold formation data, newest first
 * @param weekStart - Monday of the week on screen
 * @param matchesBySession - Matches shown for each day: the draft, or the saved copy
 * @param presentIds - Ids of characters attending the open battle
 * @param copyIntoActiveMatch - Draft handler that overwrites the open match
 * @returns The source's label, whether copying is possible, and the action
 */
export function useFormationCopy(
  sessions: SessionFormation[],
  activeSessionId: string | null,
  editable: boolean,
  weeks: FormationWeek[],
  weekStart: string,
  matchesBySession: Record<string, MatchDraft[]>,
  presentIds: Set<string>,
  copyIntoActiveMatch: (match: MatchDraft) => void
): FormationCopyState {
  const weekCandidates: CopyCandidate[] = useMemo(
    () =>
      sessions.map((session) => ({
        sessionId: session.sessionId,
        label: session.label,
        matches:
          matchesBySession[session.sessionId] ??
          fromWireMatches(session.matches, FORMATION.slots),
      })),
    [sessions, matchesBySession]
  );

  const previousWeekStart = weekStart
    ? findPreviousWeekStart(weeks, weekStart)
    : null;
  // Only the FIRST battle of the week ever looks outside it, so no other day
  // costs a request.
  const isFirstOfWeek =
    weekCandidates.findIndex(
      (candidate) => candidate.sessionId === activeSessionId
    ) === 0;
  const needsPreviousWeek = Boolean(
    editable && isFirstOfWeek && previousWeekStart
  );

  const previousQuery = useFormations(
    previousWeekStart ?? undefined,
    needsPreviousWeek
  );
  // A parked query still shares its cache entry with the open week when there is
  // no previous week to key on, so the data is only trusted once it was asked for.
  const previousSessions = previousWeekStart ? (previousQuery.data ?? []) : [];

  const previousCandidates: CopyCandidate[] = useMemo(
    () =>
      previousSessions.map((session) => ({
        sessionId: session.sessionId,
        label: session.label,
        // Another week is never on screen, so it never has a draft: switching
        // weeks clears them.
        matches: fromWireMatches(session.matches, FORMATION.slots),
      })),
    [previousSessions]
  );

  const source = activeSessionId
    ? findCopySource(weekCandidates, activeSessionId, previousCandidates)
    : null;

  /** Copy the source line-up into the open match and say what it did. */
  function copy() {
    if (!source || !editable) return;

    const copied = copyMatch(source.match, presentIds, FORMATION.slots);
    copyIntoActiveMatch({
      assignment: copied.assignment,
      notes: copied.notes,
    });

    const dropped =
      copied.droppedCount > 0
        ? ` · bỏ ${copied.droppedCount} người không đánh trận này`
        : "";
    toastSuccess(`Đã copy từ ${source.label}${dropped}. Chưa lưu.`);
  }

  return {
    sourceLabel: source?.label ?? null,
    canCopy: Boolean(editable && source),
    copy,
  };
}
```

- [ ] **Step 5: Nối nhánh vào `use-formation-screen.ts`**

Thêm `copy: FormationCopyState;` vào `FormationScreenState` (JSDoc: *Where the copy button would copy
from, and the action*), và sau `pool`:

```ts
  const copy = useFormationCopy(
    selection.sessions,
    selection.activeSessionId,
    selection.editable,
    week.weeks,
    week.weekStart,
    draft.matchesBySession,
    pool.presentIds,
    draft.copyIntoActiveMatch
  );
```

Cập nhật câu JSDoc "sáu nhánh" của hook thành bảy, và thứ tự phụ thuộc thành
`week → selection → draft → pool → copy → dnd`. Trả `copy` trong object return.

- [ ] **Step 6: Chạy test cho xanh**

Run: `pnpm --filter web test -- use-formation-copy use-formation-week`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/team-builder/hooks/use-formations.ts \
        apps/web/features/team-builder/hooks/use-formation-copy.ts \
        apps/web/features/team-builder/hooks/__tests__/use-formation-copy.test.ts \
        apps/web/features/team-builder/hooks/use-formation-screen.ts
git commit -m "feat(web): add the copy branch to the formation screen"
```

---

### Task 5: Nút copy và dialog xác nhận

**Files:**
- Modify: `apps/web/features/team-builder/components/formation-toolbar.tsx`
- Create: `apps/web/features/team-builder/components/__tests__/formation-toolbar.test.tsx`
- Create: `apps/web/features/team-builder/components/copy-formation-dialog.tsx`
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx`

**Interfaces:**
- Consumes: `FormationCopyState` (Task 4).
- Produces: `FormationToolbarProps` thêm `copySourceLabel: string | null`, `canCopy: boolean`,
  `onCopy: () => void`; `CopyFormationDialogProps { open, sourceLabel, onOpenChange, onConfirm }`.

- [ ] **Step 1: Viết test đỏ cho toolbar**

Create `apps/web/features/team-builder/components/__tests__/formation-toolbar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormationToolbar } from "../formation-toolbar";

/**
 * Render the toolbar with sensible defaults.
 * @param overrides - Props to change from the defaults
 * @returns Nothing
 */
function renderToolbar(
  overrides: Partial<React.ComponentProps<typeof FormationToolbar>> = {}
) {
  render(
    <FormationToolbar
      dirty={false}
      saving={false}
      editable
      copySourceLabel="Thứ 7 · Bang Chiến"
      canCopy
      onCopy={() => {}}
      onSave={() => {}}
      onReset={() => {}}
      {...overrides}
    />
  );
}

describe("FormationToolbar — nút copy", () => {
  it("nói rõ ngày nguồn trên nhãn nút", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: /Copy từ Thứ 7 · Bang Chiến/ })
    ).toBeEnabled();
  });

  it("không có nguồn thì nút bị khoá và về nhãn chung", () => {
    renderToolbar({ copySourceLabel: null, canCopy: false });

    expect(screen.getByRole("button", { name: /Copy đội hình/ })).toBeDisabled();
  });

  it("bấm nút thì gọi onCopy", async () => {
    const onCopy = vi.fn();
    renderToolbar({ onCopy });

    await userEvent.click(screen.getByRole("button", { name: /Copy từ/ }));

    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("đang lưu thì không copy được", () => {
    renderToolbar({ saving: true });

    expect(screen.getByRole("button", { name: /Copy từ/ })).toBeDisabled();
  });

  it("ngày đã đánh xong thì không có nút nào", () => {
    renderToolbar({ editable: false });

    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test cho nó đỏ**

Run: `pnpm --filter web test -- formation-toolbar`
Expected: FAIL — `FormationToolbar` chưa nhận `copySourceLabel`/`canCopy`/`onCopy`.

- [ ] **Step 3: Thêm nút vào `formation-toolbar.tsx`**

Thêm ba prop (kèm JSDoc trong interface và trong khối `@param` của component), import
`ClipboardCopy` từ `lucide-react`, và đặt nút **trước** nút "Đặt lại":

```tsx
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        disabled={!canCopy || saving}
      >
        <ClipboardCopy />
        {copySourceLabel ? `Copy từ ${copySourceLabel}` : "Copy đội hình"}
      </Button>
```

- [ ] **Step 4: Viết `copy-formation-dialog.tsx`**

Theo đúng khuôn `delete-match-dialog.tsx`:

```tsx
"use client";

import { ClipboardCopy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CopyFormationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Label of the day being copied from, null while there is no source */
  sourceLabel: string | null;
  /** Called when the user closes or confirms */
  onOpenChange: (open: boolean) => void;
  /** Overwrite the open match with the copied line-up */
  onConfirm: () => void;
}

/**
 * Confirm overwriting a match that already holds people. It names the source and
 * says plainly that nothing is written until Save, because the copy only lands
 * in the draft.
 * @param open - Whether the dialog is open
 * @param sourceLabel - Label of the day being copied from
 * @param onOpenChange - Called when the user closes or confirms
 * @param onConfirm - Overwrite the open match
 * @returns The confirmation dialog
 */
export function CopyFormationDialog({
  open,
  sourceLabel,
  onOpenChange,
  onConfirm,
}: CopyFormationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Ghi đè đội hình của trận đang mở?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Toàn bộ đội hình đang xếp sẽ được thay bằng đội hình của{" "}
            <span className="font-medium">{sourceLabel}</span>, bỏ những người
            không điểm danh &quot;Có&quot; cho trận này. Chưa có gì được lưu cho
            tới khi bạn bấm Lưu.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X />
              Huỷ
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              <ClipboardCopy />
              Copy đè
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Nối vào `team-builder-screen.tsx`**

Thêm `import { useState } from "react";` (gộp với `useEffect` sẵn có), import dialog, và:

```tsx
  const [confirmingCopy, setConfirmingCopy] = useState(false);

  // An empty match has nothing to lose, so it is copied over without a dialog.
  const activeMatchHasMembers = Object.values(screen.draft.assignment).some(
    Boolean
  );

  /** Copy straight into an empty match; ask first when it still holds people. */
  function handleCopy() {
    if (activeMatchHasMembers) {
      setConfirmingCopy(true);
      return;
    }

    screen.copy.copy();
  }
```

Truyền vào `FormationToolbar`: `copySourceLabel={screen.copy.sourceLabel}`,
`canCopy={screen.copy.canCopy}`, `onCopy={handleCopy}`. Đặt `CopyFormationDialog` cạnh
`FormationGrid` (trong cùng `div` bọc ngoài):

```tsx
        <CopyFormationDialog
          open={confirmingCopy}
          sourceLabel={screen.copy.sourceLabel}
          onOpenChange={setConfirmingCopy}
          onConfirm={screen.copy.copy}
        />
```

- [ ] **Step 6: Chạy toàn bộ test và build**

Run: `pnpm --filter web test`
Expected: PASS toàn bộ.

Run: `pnpm --filter web build`
Expected: build xanh, không lỗi type.

- [ ] **Step 7: Kiểm tra bằng tay**

`pnpm --filter api dev` + `pnpm --filter web dev`, vào `/xep-team` bằng tài khoản admin:

1. Mở một ngày giữa tuần đã có đội hình ở ngày trước đó ⇒ nút hiện "Copy từ {ngày đó}".
2. Bấm khi trận đang mở còn trống ⇒ copy thẳng, toast hiện, người không điểm danh "Có" không được xếp.
3. Bấm khi trận đang mở còn người ⇒ hiện dialog; "Huỷ" không đổi gì, "Copy đè" thay toàn bộ.
4. "Đặt lại" đưa về đúng bản đã lưu.
5. Mở trận **đầu tiên** của tuần mới ⇒ nút hiện "Copy từ Thứ 7 · Bang Chiến" của tuần trước.
6. Mở một ngày của tuần cũ (read-only) ⇒ không có nút nào.

- [ ] **Step 8: Commit**

```bash
git add apps/web/features/team-builder/components
git commit -m "feat(web): add a copy-formation button to the team builder toolbar"
```

---

## Self-Review

- **Spec §1** (nguồn tự động, không dropdown) → Task 2 `findCopySource`, Task 5 nhãn nút.
- **Spec §2** (ngày liền trước; ngày đầu tuần lấy ngày cuối tuần trước; ngày nguồn trống thì khoá
  nút; trận cuối; xét theo người) → Task 2, đủ test cho từng nhánh.
- **Spec §3** (nguồn là bản đang hiển thị) → Task 4: `weekCandidates` dựng từ `matchesBySession`
  (nháp nếu có); tuần trước luôn từ wire.
- **Spec §4** (ghi vào trận đang mở, ghi đè, lọc người vắng, giữ note, hỏi trước, chỉ là nháp) →
  Task 1 + Task 3 + Task 5.
- **Spec §5** (nút trong toolbar, nhãn nói rõ nguồn, disabled khi không có nguồn, toast) → Task 4
  (câu toast) + Task 5 (nút).
- **Spec §6** (không đụng backend, query có `enabled`, `previousWeekStart` lấy từ danh sách weeks) →
  Task 2 `findPreviousWeekStart` + Task 4.
- **Spec §7** (tách logic dùng chung) → Task 1.
- **Ngoài phạm vi**: không task nào đụng `addMatch`, `packages/shared`, `apps/api` hay
  `docs/architecture.md`.
