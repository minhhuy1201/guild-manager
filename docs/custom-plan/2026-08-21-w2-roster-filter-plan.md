# W2 — Một vị từ lọc roster · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** khái niệm "lọc danh sách nhân vật theo từ khoá và lưu phái" được nói **một lần** ở một
vị từ thuần có test, thay cho ba bản đã phân kỳ. Kèm theo đó là một lỗi người dùng gặp được được vá:
màn Quản lý thành viên hiện **tìm được theo ID trong game**, đúng như hai màn kia đã hứa.

**Kiến trúc:** một hàm thuần `matchesRosterFilter` ở `apps/web/lib/roster-filter.ts` (ba feature dùng,
không feature nào sở hữu), và một component trình bày `RosterFilterBar` ở `components/shared/` nhận
`value`/`onChange` nên không biết state nằm ở đâu. Ba store bộ lọc **giữ nguyên chỗ cũ** — chúng chỉ
trở thành adapter ở phía caller.

**Tech stack:** Next.js 16 (React 19), Zustand, Vitest 4, Tailwind 4 + shadcn/ui.

**Spec:** [`docs/custom-spec/2026-08-21-w2-roster-filter-design.md`](../custom-spec/2026-08-21-w2-roster-filter-design.md)
· bối cảnh: [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md)

**Phạm vi:** `apps/web` — `lib/`, `components/shared/`, ba feature (`attendance`, `team-builder`,
`members`). `apps/api` và `packages/shared` **không đổi**.

## Bốn điểm kế hoạch chốt khác spec

1. **`RosterCandidate` được đặt tên, `PoolCandidate` ở lại.** Spec viết
   `Pick<Character, "id" | "name" | "guildClass">` thẳng trong chữ ký. `characterSchema`
   (`packages/shared/schemas/character.schema.ts:35-42`) hiện có **đúng ba** field đó, nên `Pick<>`
   bằng chính `Character` — viết `Pick<>` là để chữ ký nói rõ vị từ chỉ đọc ba field, không phải để
   cắt bớt. Đặt tên nó thành `RosterCandidate` để chỗ gọi đọc được. `PoolCandidate` của team-builder
   **không** bị xoá: nó là ràng buộc generic của `selectPoolCharacters`, cùng shape nên truyền vào
   được nhờ structural typing — xoá nó là đổi thêm một thứ spec không yêu cầu.
2. **Hai store đổi hai setter thành một `setFilter`.** `RosterFilterBar` trả về cả object
   `RosterFilter` trong một lần `onChange`; nếu store vẫn giữ `setSearch` + `setGuildClasses` thì
   adapter phải so từng field để biết cái nào đổi — đúng thứ "clever" mà `coding-style.md` cấm. Cả
   hai setter chỉ có **một** chỗ gọi mỗi cái (hai component filter, xem lệnh grep ở Task 6 Bước 1),
   nên đổi là an toàn.
3. **`members-panel` dùng vị từ chung nhưng KHÔNG dùng `RosterFilterBar`.** Thanh lọc của nó khác
   thật: nằm cùng hàng với nút "Thêm thành viên", không có `<Label>`, `w-64`/`w-48` thay vì lưới hai
   cột. Spec, mục Rủi ro, nói thẳng: "nếu một bên có nút/nhãn riêng thì để nó ở ngoài
   `RosterFilterBar`, đừng nhét prop vào". Bảng "Thay đổi cụ thể" của spec cũng chỉ liệt
   `attendance-filters` và `pool-filters` cho `RosterFilterBar`.
4. **`members-panel` giữ hai `useState` riêng, không gộp thành một `RosterFilter` state.** `keyword`
   thô còn được dùng cho `resetKey` phân trang và `isFiltering`; gộp thành một object rồi lại tách ra
   dùng không bớt được dòng nào. Vị từ nhận `{ search: keyword, guildClasses }` dựng tại chỗ.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/w2-roster-filter`. Không `git push`,
  không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Text hiển thị là tiếng Việt; identifier, tên file, doc comment của code mới là tiếng Anh.** Khi
  **chuyển chỗ** một comment hoặc một chuỗi tiếng Việt sẵn có thì bê nguyên văn, không dịch, không
  sửa dấu ba chấm.
- **Chuẩn hoá hai phía bằng `.toLowerCase()`, không bỏ dấu tiếng Việt.** Không `localeCompare`, không
  `normalize("NFD")` — hiện không bản nào làm, thêm vào là đổi hành vi ngoài phạm vi spec.
- **Doc comment tiếng Anh cho mọi hàm/component mới**: mục đích, từng param, giá trị trả về.
- **Không đụng tới phân trang** của `members-panel` (`resetKey`, `useTablePagination`).
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter web typecheck` · `pnpm --filter web lint` · `pnpm --filter web test`
  - chạy một file: `pnpm --filter web test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/web/lib/roster-filter.ts` | `RosterFilter`, `RosterCandidate`, `matchesRosterFilter` |
| `apps/web/lib/__tests__/roster-filter.test.ts` | bảng ca lọc (§Kiểm thử của spec) |
| `apps/web/components/shared/roster-filter-bar.tsx` | `RosterFilterBar` |

**Sửa**

| File | Việc |
|---|---|
| `features/team-builder/lib/pool.ts` | bỏ `PoolFilter`, gọi `matchesRosterFilter` |
| `features/team-builder/lib/__tests__/pool.test.ts` | tách ca lọc sang file mới, thêm ca giao nhau |
| `features/attendance/hooks/use-attendance.ts:78-89` | `useFilteredCharacters` gọi vị từ chung |
| `features/members/components/members-panel.tsx:41-50` | **hành vi đổi: tìm được theo ID** |
| `features/attendance/store/attendance-filter-store.ts` | hai setter → `setFilter(scope, value)` |
| `features/team-builder/store/pool-filter-store.ts` | hai setter → `setFilter(value)` |
| `features/attendance/components/attendance-filters.tsx` | dùng `RosterFilterBar` |
| `features/team-builder/components/pool-filters.tsx` | dùng `RosterFilterBar` |
| `apps/web/docs/frontend.md` §5 | một mục cho `RosterFilterBar`/`matchesRosterFilter` |

**Không đụng tới:** `member-pool.tsx`, `attendance-grid.tsx`, `attendance-log-table.tsx`,
`use-formation-pool.ts` — chúng đọc store hoặc gọi `selectPoolCharacters`, cả hai giữ nguyên chữ ký.

---

### Task 0: Nhánh làm việc

- [x] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: đang ở `main`, working tree sạch (trừ file kế hoạch này). Nếu bẩn: dừng, hỏi người
dùng.

- [x] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/w2-roster-filter
git rev-parse --abbrev-ref HEAD
```

- [x] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter web test
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: `matchesRosterFilter` — một vị từ, một chỗ

**Files:**
- Create: `apps/web/lib/roster-filter.ts`
- Test: `apps/web/lib/__tests__/roster-filter.test.ts`

**Interfaces:**
- Produces: `RosterFilter { search: string; guildClasses: GuildClass[] }`,
  `RosterCandidate = Pick<Character, "id" | "name" | "guildClass">`,
  `matchesRosterFilter(character: RosterCandidate, filter: RosterFilter): boolean`

- [x] **Bước 1: Viết test đỏ**

`apps/web/lib/__tests__/roster-filter.test.ts` (môi trường node mặc định — hàm thuần, không JSX):

```ts
import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import { matchesRosterFilter, type RosterCandidate } from "../roster-filter";

const MEO: RosterCandidate = {
  id: "MeoMap01",
  name: "Mèo Mập",
  guildClass: GuildClass.THIET_Y,
};

describe("matchesRosterFilter", () => {
  it("bộ lọc rỗng thì nhận mọi nhân vật", () => {
    expect(matchesRosterFilter(MEO, { search: "", guildClasses: [] })).toBe(true);
  });

  it("khớp tên, không phân biệt hoa thường", () => {
    expect(matchesRosterFilter(MEO, { search: "mÈo", guildClasses: [] })).toBe(true);
  });

  it("khớp ID trong game, không phân biệt hoa thường", () => {
    expect(matchesRosterFilter(MEO, { search: "meomap", guildClasses: [] })).toBe(true);
  });

  it("không khớp tên lẫn ID thì loại", () => {
    expect(matchesRosterFilter(MEO, { search: "long", guildClasses: [] })).toBe(false);
  });

  it("khớp tên nhưng khác lưu phái thì vẫn loại", () => {
    const filter = { search: "mèo", guildClasses: [GuildClass.TO_VAN] };

    expect(matchesRosterFilter(MEO, filter)).toBe(false);
  });

  it("nhận khi lưu phái nằm trong danh sách đang lọc", () => {
    const filter = { search: "", guildClasses: [GuildClass.THIET_Y, GuildClass.TO_VAN] };

    expect(matchesRosterFilter(MEO, filter)).toBe(true);
  });

  it("từ khoá chỉ có khoảng trắng thì coi như không lọc", () => {
    expect(matchesRosterFilter(MEO, { search: "   ", guildClasses: [] })).toBe(true);
  });

  it("cắt khoảng trắng thừa quanh từ khoá thật", () => {
    expect(matchesRosterFilter(MEO, { search: "  mập  ", guildClasses: [] })).toBe(true);
  });
});
```

- [x] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- roster-filter
```

Kết quả mong đợi: FAIL — `../roster-filter` không tồn tại.

- [x] **Bước 3: Cài đặt**

`apps/web/lib/roster-filter.ts`:

```ts
import type { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

/**
 * The three fields the roster filter reads off a character.
 * Spelled as a `Pick` so the contract stays "these three and nothing else"
 * even if `Character` grows, and so any object of that shape — the team
 * builder's `PoolCandidate` included — can be passed in.
 */
export type RosterCandidate = Pick<Character, "id" | "name" | "guildClass">;

/** Roster filter: a keyword and a set of guild classes. */
export interface RosterFilter {
  /** Raw keyword as typed; the predicate trims and lowercases it itself. */
  search: string;
  /** Guild classes to keep. An empty array means every class. */
  guildClasses: GuildClass[];
}

/**
 * Whether a character passes the roster filter.
 * The keyword matches on NAME or in-game ID; both sides are lowercased before
 * comparing, because people type whatever case they like. An id is a Vietnamese
 * slug, so searching by id is what tells two same-named members apart.
 * @param character - Character under test (only id, name and guildClass are read)
 * @param filter - Filter currently applied
 * @returns True when the character passes both halves of the filter
 */
export function matchesRosterFilter(
  character: RosterCandidate,
  filter: RosterFilter
): boolean {
  if (
    filter.guildClasses.length > 0 &&
    !filter.guildClasses.includes(character.guildClass)
  ) {
    return false;
  }

  const keyword = filter.search.trim().toLowerCase();
  if (keyword.length === 0) return true;

  return (
    character.name.toLowerCase().includes(keyword) ||
    character.id.toLowerCase().includes(keyword)
  );
}
```

- [x] **Bước 4: Chạy test cho chắc là xanh**

```bash
pnpm --filter web test -- roster-filter
pnpm --filter web typecheck
```

- [x] **Bước 5: Commit**

```bash
pnpm --filter web lint
git rev-parse --abbrev-ref HEAD
git add apps/web/lib/roster-filter.ts apps/web/lib/__tests__/roster-filter.test.ts
git commit -m "feat(web): add matchesRosterFilter as the one roster filter predicate"
```

---

### Task 2: `selectPoolCharacters` co lại còn phần riêng của nó

Bản 2 là bản **đúng và có test** — nên nó đi trước hai bản kia: nếu `pool.test.ts` còn xanh sau khi
thay ruột thì `matchesRosterFilter` đúng bằng bản gốc.

**Files:**
- Modify: `apps/web/features/team-builder/lib/pool.ts`
- Test: `apps/web/features/team-builder/lib/__tests__/pool.test.ts`

**Interfaces:**
- Consumes: `matchesRosterFilter`, `RosterFilter` (Task 1)
- `selectPoolCharacters(characters, assignment, filter)` giữ nguyên tên và thứ tự tham số; tham số
  thứ ba đổi kiểu từ `PoolFilter` sang `RosterFilter` (cùng shape, chỗ gọi không phải sửa).
- `PoolFilter` **bị xoá**; `PoolCandidate` **ở lại** (xem "chốt khác spec" §1).

- [x] **Bước 1: Sửa `pool.ts`**

Bỏ `interface PoolFilter` và import `GuildClass` nếu không còn ai dùng (`PoolCandidate` vẫn dùng, nên
giữ):

```ts
import type { GuildClass } from "@guild/shared/enums";

import { matchesRosterFilter, type RosterFilter } from "@/lib/roster-filter";
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

/**
 * Derive the pool: everyone not currently placed in the formation, then
 * narrowed by the filters. Nothing is stored — this runs on every render, so
 * the pool can never drift out of sync with the assignment.
 *
 * Only the "already placed" half lives here; the keyword and class halves are
 * the shared `matchesRosterFilter`, so this screen cannot drift from the others.
 * @param characters - Full guild roster
 * @param assignment - Current slot assignment
 * @param filter - Search keyword and guild class filter
 * @returns Characters still available, in roster order
 */
export function selectPoolCharacters<T extends PoolCandidate>(
  characters: T[],
  assignment: Assignment,
  filter: RosterFilter
): T[] {
  const assignedIds = new Set(
    Object.values(assignment).filter((id): id is string => id !== null)
  );

  return characters.filter(
    (character) =>
      !assignedIds.has(character.id) && matchesRosterFilter(character, filter)
  );
}
```

- [x] **Bước 2: Chạy test cũ, chưa sửa gì — phải xanh nguyên**

```bash
pnpm --filter web test -- pool
```

Kết quả mong đợi: PASS **cả bảy ca**, không sửa một dòng test nào. Nếu đỏ: `matchesRosterFilter` khác
bản gốc — sửa vị từ ở Task 1 và bổ sung ca cho `roster-filter.test.ts`, đừng sửa `pool.test.ts` cho
vừa.

- [x] **Bước 3: Tách test — ca lọc thuần chuyển đi, ca giao nhau ở lại**

Bốn ca chỉ nói về từ khoá/lưu phái đã có bản tương đương ở `roster-filter.test.ts` → xoá khỏi
`pool.test.ts`. Viết lại cả file như sau:

```ts
import { describe, expect, it } from "vitest";
import { GuildClass } from "@guild/shared/enums";

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

  it("người đã xếp thì không hiện, kể cả khi khớp từ khoá", () => {
    const assignment: Assignment = { ...EMPTY, "team-1-pos-1": "MeoMap01" };

    const pool = selectPoolCharacters(CHARACTERS, assignment, {
      search: "mèo",
      guildClasses: [],
    });

    expect(pool).toHaveLength(0);
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

Bốn ca bị xoá: "tìm theo tên…", "tìm theo ID trong game…", "bỏ qua khoảng trắng thừa…", "lọc theo lưu
phái…" — cả bốn đã có ở `roster-filter.test.ts` (Task 1, Bước 1).

- [x] **Bước 4: Chạy lại cả hai file**

```bash
pnpm --filter web test -- pool
pnpm --filter web test -- roster-filter
pnpm --filter web typecheck
pnpm --filter web lint
```

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/team-builder/lib
git commit -m "refactor(web): keep only the assignment rule in selectPoolCharacters

The keyword and guild-class halves move to matchesRosterFilter, and the four
pool tests that only covered them move to roster-filter.test.ts. What stays
here is the one rule the pool owns: an already-placed member is not in it."
```

---

### Task 3: `useFilteredCharacters` trở thành caller

Task này **không đổi hành vi** — bản 1 và bản 2 vốn giống nhau từng vế.

**Files:**
- Modify: `apps/web/features/attendance/hooks/use-attendance.ts:78-89`

**Interfaces:**
- Consumes: `matchesRosterFilter` (Task 1)
- `useFilteredCharacters(scope)` giữ nguyên chữ ký và giá trị trả về `Character[]`.

- [x] **Bước 1: Sửa thân hook**

Thay khối `useMemo` ở `:78-89` bằng:

```ts
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);

  return useMemo(
    () =>
      (characters ?? []).filter((character) =>
        matchesRosterFilter(character, filter)
      ),
    [characters, filter]
  );
```

Hai selector `…[scope].search` / `…[scope].guildClasses` gộp lại thành một: sau Task 6 store trả
thẳng một `RosterFilter`, và `setFilter` chỉ thay đúng nhánh của scope đang đổi nên tham chiếu vẫn
ổn định giữa hai lần render (cùng lý do đã ghi ở Task 6 Bước 3).

Thêm import ở đầu file:

```ts
import { matchesRosterFilter } from "@/lib/roster-filter";
```

Doc comment của hook giữ nguyên nguyên văn — nó vẫn đang mô tả đúng ("So khớp tên/ID trong game không
phân biệt hoa/thường").

- [x] **Bước 2: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: PASS, không sửa test nào.

- [x] **Bước 3: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/attendance/hooks/use-attendance.ts
git commit -m "refactor(web): filter attendance characters through matchesRosterFilter"
```

---

### Task 4: `members-panel` — vá lỗi không tìm được theo ID

Đây là task **đổi hành vi**, và là lý do spec tồn tại: bản 3 thiếu hẳn vế `id`, nên gõ ID ở màn Quản
lý thành viên thì không ra gì, còn gõ đúng ID đó ở màn Điểm danh thì ra.

**Files:**
- Modify: `apps/web/features/members/components/members-panel.tsx:32-50`, `:70`

**Interfaces:**
- Consumes: `matchesRosterFilter` (Task 1)
- Không đổi gì ở interface public của component.

- [x] **Bước 1: Sửa phép lọc (`:45-50`)**

```tsx
  const members = allMembers.filter((member) =>
    matchesRosterFilter(member, { search: keyword, guildClasses })
  );
```

Thêm import:

```tsx
import { matchesRosterFilter } from "@/lib/roster-filter";
```

`normalized`, `allMembers`, `isFiltering`, `resetKey` và `useTablePagination` (`:41-58`) **giữ nguyên
từng dòng** — `normalized` vẫn được `resetKey` và `isFiltering` dùng, và phân trang ngoài phạm vi
spec.

- [x] **Bước 2: Sửa doc comment của component (`:32`) cho khớp hành vi mới**

```tsx
/**
 * Bảng quản lý thành viên: tìm theo tên hoặc ID, lọc lưu phái, thêm/sửa/xoá.
 * Cả bang chỉ vài chục người nên lọc và phân trang ngay ở client.
 * @returns Panel quản lý thành viên
 */
```

- [x] **Bước 3: Sửa placeholder ô nhập (`:70`) cho khớp lời hứa**

```tsx
              placeholder="Tên thành viên hoặc ID..."
```

Đúng nguyên văn chuỗi hai màn kia đang dùng (`attendance-filters.tsx:45`, `pool-filters.tsx:33`) — ba
ô nhập cùng một hành vi thì phải cùng một lời hứa.

- [x] **Bước 4: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [x] **Bước 5: Kiểm tay**

```bash
pnpm --filter web dev
```

Mở trang Thành viên: gõ một ID trong game (ví dụ lấy từ bảng seed) → ra đúng người đó. Gõ tên viết
hoa → vẫn ra. Gõ vài dấu cách → ra cả danh sách. Chọn lưu phái + gõ ID của người khác lưu phái →
rỗng. Đổi từ khoá → phân trang nhảy về trang 1 như cũ.

- [x] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/members/components/members-panel.tsx
git commit -m "fix(web): let the members table find a character by in-game id

The members panel had its own copy of the roster filter and that copy was
missing the id half, so typing an id here found nothing while the same id
worked on the attendance screen. It now calls matchesRosterFilter, and the
placeholder and the doc comment say what the field actually searches."
```

---

### Task 5: `RosterFilterBar` — một cây JSX cho hai màn

**Files:**
- Create: `apps/web/components/shared/roster-filter-bar.tsx`

**Interfaces:**
- Produces: `RosterFilterBar({ value, onChange, idPrefix })`
- Consumes: `RosterFilter` (Task 1), `GuildClassFilterSelect` (sẵn có)

- [x] **Bước 1: So kỹ hai cây JSX trước khi gộp**

```bash
diff <(sed -n '32,58p' apps/web/features/attendance/components/attendance-filters.tsx) \
     <(sed -n '22,46p' apps/web/features/team-builder/components/pool-filters.tsx)
```

Kết quả mong đợi — đúng hai khác biệt, và cả hai đều **ở ngoài** phần sắp gộp:

1. `attendance-filters` bọc thêm `<Card><CardContent className="grid gap-4 sm:grid-cols-2">`;
   `pool-filters` chỉ có `<div className="grid gap-4 sm:grid-cols-2">`.
2. Id là `${scope}-search` / `${scope}-guild-class` bên attendance, `pool-search` /
   `pool-guild-class` bên pool.

Khác biệt 1 → `Card` ở lại `attendance-filters`, `RosterFilterBar` tự mang lưới hai cột. Khác biệt 2
→ chính là prop `idPrefix`. Nếu `diff` ra khác biệt **thứ ba**: dừng, báo người dùng — spec (mục Rủi
ro) cấm nhét prop để nuốt một khác biệt thật.

- [x] **Bước 2: Cài đặt**

`apps/web/components/shared/roster-filter-bar.tsx`:

```tsx
"use client";

import { Search } from "lucide-react";

import { GuildClassFilterSelect } from "@/components/shared/guild-class-filter-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RosterFilter } from "@/lib/roster-filter";

interface RosterFilterBarProps {
  /** Filter values currently applied. */
  value: RosterFilter;
  /** Called with the whole next filter whenever either half changes. */
  onChange: (next: RosterFilter) => void;
  /** Prefix for the input ids — several screens can share one page. */
  idPrefix: string;
}

/**
 * Search box and guild class picker for a roster list.
 *
 * Controlled and storage-agnostic on purpose: a scoped Zustand store, an
 * unscoped one and a plain useState are all just adapters at the call site,
 * because the three screens hold this filter for different lifetimes.
 * @param value - Filter values currently applied
 * @param onChange - Receives the whole next filter
 * @param idPrefix - Prefix making the input ids unique on the page
 * @returns Two-column filter row
 */
export function RosterFilterBar({
  value,
  onChange,
  idPrefix,
}: RosterFilterBarProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-search`}>Tìm kiếm</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${idPrefix}-search`}
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            placeholder="Tên thành viên hoặc ID..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-guild-class`}>Lưu phái</Label>
        <GuildClassFilterSelect
          id={`${idPrefix}-guild-class`}
          value={value.guildClasses}
          onChange={(guildClasses) => onChange({ ...value, guildClasses })}
        />
      </div>
    </div>
  );
}
```

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

Không có test riêng: repo không có component test (`frontend.md` §8), và component này không có logic
nào ngoài việc chuyển tiếp giá trị. Phần có thể sai — vị từ lọc — đã có test ở Task 1.

- [x] **Bước 4: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/components/shared/roster-filter-bar.tsx
git commit -m "feat(web): add RosterFilterBar as the shared roster filter row"
```

---

### Task 6: Hai màn dùng `RosterFilterBar`, hai store đổi sang `setFilter`

**Files:**
- Modify: `apps/web/features/attendance/store/attendance-filter-store.ts`
- Modify: `apps/web/features/attendance/components/attendance-filters.tsx`
- Modify: `apps/web/features/team-builder/store/pool-filter-store.ts`
- Modify: `apps/web/features/team-builder/components/pool-filters.tsx`

**Interfaces:**
- Consumes: `RosterFilterBar` (Task 5), `RosterFilter` (Task 1)
- `useAttendanceFilterStore`: `setSearch`/`setGuildClasses` → `setFilter(scope, value: RosterFilter)`.
  `filters` giữ nguyên tên và shape (`Record<AttendanceFilterScope, RosterFilter>`).
- `usePoolFilterStore`: `setSearch`/`setGuildClasses` → `setFilter(value: RosterFilter)`. Hai field
  `search`/`guildClasses` **ở nguyên chỗ cũ** — `use-formation-pool.ts:61-62`,
  `member-pool.tsx:49-50` và `render-formation-hook.ts:51` đều đọc thẳng chúng.

- [x] **Bước 1: Kiểm chứng hai setter chỉ có hai chỗ gọi**

```bash
grep -rn "setSearch\|setGuildClasses" apps/web --include="*.ts*" | grep -v node_modules
```

Kết quả mong đợi: chỉ hai file store, hai file filter component, và `members-panel.tsx:37`/`:78` (đó
là `useState` cục bộ của màn Thành viên, trùng tên chứ không liên quan). Nếu có chỗ thứ ba: dừng, báo
người dùng.

- [x] **Bước 2: `attendance-filter-store.ts` — một action**

`AttendanceFilterValue` bị thay bằng `RosterFilter` (cùng shape, giờ đã có một chỗ khai báo):

```ts
import { create } from "zustand";

import type { RosterFilter } from "@/lib/roster-filter";

/** Màn đang dùng bộ lọc — mỗi màn giữ state riêng, không ảnh hưởng nhau. */
export type AttendanceFilterScope = "attendance" | "history";

interface AttendanceFilterState {
  /** Bộ lọc của từng màn, tra theo scope */
  filters: Record<AttendanceFilterScope, RosterFilter>;
  setFilter: (scope: AttendanceFilterScope, value: RosterFilter) => void;
}

/** Bộ lọc rỗng dùng làm giá trị khởi tạo cho mỗi màn. */
const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

/**
 * Store UI state cho bộ lọc điểm danh (Zustand).
 * State tách theo scope nên lọc ở màn Điểm danh không kéo theo màn Lịch sử và ngược lại.
 * Chỉ giữ client/UI state — KHÔNG chứa server data (records nằm ở TanStack Query).
 */
export const useAttendanceFilterStore = create<AttendanceFilterState>((set) => ({
  filters: {
    attendance: EMPTY_FILTER,
    history: EMPTY_FILTER,
  },
  setFilter: (scope, value) =>
    set((state) => ({ filters: { ...state.filters, [scope]: value } })),
}));
```

Import `GuildClass` bỏ đi (không còn ai dùng trong file). Doc comment tiếng Việt sẵn có bê nguyên văn.

- [x] **Bước 3: `attendance-filters.tsx` — chỉ còn adapter**

```tsx
"use client";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

interface AttendanceFiltersProps {
  /** Màn đang dùng bộ lọc — mỗi màn giữ state riêng. */
  scope: AttendanceFilterScope;
}

/**
 * Thanh lọc: tìm kiếm theo tên/ID trong game và chọn lưu phái.
 * Đọc/ghi vào phần store ứng với `scope`, nên hai màn không dùng chung giá trị lọc.
 * @param scope - Màn đang dùng bộ lọc
 * @returns Card chứa các bộ lọc
 */
export function AttendanceFilters({ scope }: AttendanceFiltersProps) {
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);
  const setFilter = useAttendanceFilterStore((s) => s.setFilter);

  return (
    <Card>
      <CardContent>
        <RosterFilterBar
          idPrefix={scope}
          value={filter}
          onChange={(next) => setFilter(scope, next)}
        />
      </CardContent>
    </Card>
  );
}
```

Hai điểm phải giữ đúng:

- **`className="grid gap-4 sm:grid-cols-2"` rời khỏi `CardContent`** — lưới giờ nằm trong
  `RosterFilterBar`. Để lại sẽ thành lưới lồng lưới.
- **Selector giờ trả cả object `filters[scope]`.** Đây vẫn là một tham chiếu ổn định giữa hai lần
  render vì `setFilter` chỉ thay đúng nhánh của scope đang đổi; không cần `useShallow`.

- [x] **Bước 4: `pool-filter-store.ts` — một action**

```ts
import { create } from "zustand";
import type { GuildClass } from "@guild/shared/enums";

import type { RosterFilter } from "@/lib/roster-filter";

interface PoolFilterState {
  /** Search keyword over character name and in-game id */
  search: string;
  /** Guild classes being filtered. An empty array means every class. */
  guildClasses: GuildClass[];
  setFilter: (value: RosterFilter) => void;
}

/**
 * Pool filter state for the formation builder (Zustand).
 * One screen only, so unlike the attendance filter store it needs no scoping.
 */
export const usePoolFilterStore = create<PoolFilterState>((set) => ({
  search: "",
  guildClasses: [],
  setFilter: (value) =>
    set({ search: value.search, guildClasses: value.guildClasses }),
}));
```

Hai field ở lại dạng phẳng có chủ ý: ba chỗ đọc chúng bằng selector riêng từng field, và gộp thành
một object con sẽ bắt cả ba render lại khi chỉ một nửa bộ lọc đổi.

- [x] **Bước 5: `pool-filters.tsx` — chỉ còn adapter**

```tsx
"use client";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { usePoolFilterStore } from "../store/pool-filter-store";

/**
 * Search box and guild class picker narrowing the member pool.
 * Reads and writes the pool filter store directly.
 * @returns Filter row for the member pool
 */
export function PoolFilters() {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);
  const setFilter = usePoolFilterStore((state) => state.setFilter);

  return (
    <RosterFilterBar
      idPrefix="pool"
      value={{ search, guildClasses }}
      onChange={setFilter}
    />
  );
}
```

- [x] **Bước 6: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: PASS. `render-formation-hook.ts:51` đặt store bằng `setState({...poolFilter})` —
nó ghi thẳng `search`/`guildClasses` nên không dính vào việc đổi action.

- [x] **Bước 7: Kiểm tay**

```bash
pnpm --filter web dev
```

- Trang Điểm danh: gõ tên rồi gõ ID, cả hai đều lọc; chọn lưu phái vẫn lọc; label bấm vào thì focus
  đúng ô (`htmlFor` khớp `id`).
- Trang Lịch sử điểm danh: bộ lọc **riêng** — gõ ở đây không kéo theo trang Điểm danh và ngược lại.
- Trang Xếp team: ô lọc pool vẫn nằm gọn trong panel (không có viền Card mới), lọc vẫn đúng.

- [x] **Bước 8: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/attendance apps/web/features/team-builder
git commit -m "refactor(web): render both roster filter rows from RosterFilterBar

The two stores swap their split setters for one setFilter, because the shared
bar reports the whole filter at once. Where the state lives stays per screen:
the attendance filter is scoped per tab, the pool filter resets per week."
```

---

### Task 7: Tài liệu và rà soát cuối

**Files:**
- Modify: `apps/web/docs/frontend.md` §5

- [x] **Bước 1: Ghi quy ước vào `frontend.md` §5**

Thêm `roster-filter-bar` vào danh sách "Current shared building blocks" (giữ thứ tự bảng chữ cái:
…, `query-boundary`, `roster-filter-bar`, `site-header`, …), rồi thêm một mục ngay sau "The query
group of a screen":

```markdown
### Filtering a roster list

"Tìm theo từ khoá và lưu phái" is said once, in `matchesRosterFilter`
(`lib/roster-filter.ts`). The keyword matches on **name or in-game id** — both sides lowercased,
Vietnamese diacritics left alone — and an empty `guildClasses` array means every class. Three
screens use it and none of them owns it, which is why it sits in `lib/` and not in a feature. It
stays out of `packages/shared`: that package holds shapes that cross the network, and this filter
never leaves the client.

A screen that also needs the *widget* uses `RosterFilterBar`
(`components/shared/roster-filter-bar.tsx`). It is controlled — `value` / `onChange` / `idPrefix` —
and deliberately knows nothing about where the state lives: a scoped Zustand store (attendance), an
unscoped one (team builder) and a plain `useState` (members) are all adapters at the call site,
because the three filters have different lifetimes. Do **not** merge them into one store. A screen
whose filter row looks genuinely different (members: no labels, inline with the create button)
keeps its own JSX and calls the predicate directly — a prop added to swallow a real difference is
worse than two rows.
```

- [x] **Bước 2: Rà không còn bản lọc viết tay nào**

```bash
grep -rn "toLowerCase().includes" apps/web --include="*.ts*" | grep -v node_modules
grep -rn "guildClasses.includes\|guildClasses.length" apps/web/features --include="*.ts*"
```

Kết quả mong đợi: lệnh 1 chỉ còn `lib/roster-filter.ts`. Lệnh 2 chỉ còn những chỗ dùng cho việc khác
(`isFiltering` ở `members-panel`, `resetKey`, `guild-class-filter-select`) — **không** còn chỗ nào
dựng lại phép lọc.

- [x] **Bước 3: Rà không còn kiểu trùng**

```bash
grep -rn "PoolFilter\b" apps/web --include="*.ts*" | grep -v node_modules
```

Kết quả mong đợi: chỉ `PoolFilterState`/`usePoolFilterStore` trong store — `interface PoolFilter` đã
biến mất.

- [x] **Bước 4: Kiểm tra toàn bộ**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: cả ba sạch. Dán số file/số test vào phần báo cáo — không tuyên bố "xong" khi chưa
nhìn thấy output.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/docs/frontend.md
git commit -m "docs(web): document the roster filter convention"
```

- [x] **Bước 6: Review và báo cáo**

Chạy `/code-review` trên nhánh, sửa những gì đáng sửa, rồi tóm tắt cho người dùng: các commit đã tạo,
output của `pnpm --filter web test`, lỗi đã vá ở màn Quản lý thành viên, và bốn điểm kế hoạch chốt
khác spec.

---

## Ngoài phạm vi (theo spec)

- **Gộp ba store bộ lọc.** Ba vòng đời khác nhau (bộ lọc điểm danh sống theo tab, bộ lọc xếp team
  reset theo tuần, bộ lọc thành viên chết theo component) — gộp là làm hỏng cả ba. Spec §3 đã loại.
- **Bỏ dấu tiếng Việt khi tìm** (`normalize("NFD")`). Hiện không bản nào làm; thêm vào là đổi hành vi
  cả ba màn. Spec ghi lại như một câu hỏi riêng.
- **Đưa vị từ sang `packages/shared`.** Đây là lọc phía client, backend không lọc gì cả.
- **`members-panel` dùng `RosterFilterBar`** — xem "chốt khác spec" §3.
- **Phân trang của `members-panel`** (`resetKey`, `useTablePagination`) — vị từ mới không đụng tới.
