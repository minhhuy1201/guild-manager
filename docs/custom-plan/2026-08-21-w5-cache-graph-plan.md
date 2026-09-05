# W5 — Đồ thị phụ thuộc cache thành dữ liệu · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** luật "ghi dữ liệu X thì màn nào cũ đi" được nêu **một lần**, dưới dạng dữ liệu, trong
`lib/cache-graph.ts`. Không feature nào còn liệt kê query key của feature khác; mỗi chỗ ghi chỉ nói
**mình vừa đổi cái gì** qua `useInvalidate(topic)`.

**Kiến trúc:** một mảng `CACHE_TOPICS` (nguồn duy nhất của tên chủ đề) sinh ra `CacheTopic`, và một
`Record<CacheTopic, () => QueryKey[]>` tên `CACHE_DEPENDENTS` ánh xạ chủ đề → danh sách key phải
invalidate. Giá trị là **thunk**, không phải mảng dựng sẵn: key factory được gọi lúc invalidate chứ
không lúc import, nên thứ tự nạp module không đẻ ra lỗi TDZ. Hook `useInvalidate` ở
`hooks/use-invalidate.ts` đọc đồ thị đó và trả về một hàm **ổn định danh tính** (`useCallback`), vì
một trong năm chỗ dùng nó đặt hàm đó vào dependency của `useEffect`.

**Tech stack:** Next.js 16 (React 19), TanStack Query 5, Vitest 4, `@testing-library/react` + `jsdom`
(đã có sẵn — xem `features/team-builder/hooks/__tests__/render-formation-hook.ts` làm mẫu render hook
trong `QueryClientProvider`).

**Spec:** [`docs/custom-spec/2026-08-21-w5-cache-graph-design.md`](../custom-spec/2026-08-21-w5-cache-graph-design.md)
· bối cảnh: [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md)

**Phạm vi:** `apps/web` — `lib/`, `hooks/`, và bốn feature (`members`, `settings`, `attendance`,
`team-builder`). `apps/api` và `packages/shared` **không đổi**. Không component nào đổi.

---

## Sáu điểm kế hoạch chốt khác spec

Task 1 sửa spec trước khi động vào code, vì mọi task sau đọc spec làm nguồn sự thật.

1. **Đồ thị import file key `*-keys.ts` của từng feature, không import `index.ts`.** Spec §2 nói
   `cache-graph.ts` "cố ý import key factory của cả bốn feature" nhưng không chốt đi đường nào. Đường
   qua barrel là đường **sai**, vì hai lý do đo được:
   - `features/attendance/index.ts` kéo theo một server action import `"server-only"` — chính
     `use-formation-week.test.ts:25-27` đang phải `vi.mock("server-only", () => ({}))` vì lý do đó.
     Cho `lib/cache-graph.ts` đi qua barrel là bắt **mọi** test có mutation phải mock theo.
   - Bốn feature đều import ngược lại `useInvalidate`, nên qua barrel là bốn vòng import
     (`members/index.ts` → `members-panel` → `use-member-mutations` → `use-invalidate` →
     `cache-graph` → `members/index.ts`). Thunk giữ cho nó không nổ, nhưng "không nổ" không phải lý do
     để tạo vòng.

   File `*-keys.ts` là module lá, không import gì cả: không vòng, không `server-only`, không kéo
   `apiFetch` vào. Đây cũng là ngoại lệ **duy nhất** với luật 5 của `frontend.md` §4 ("Never import
   another feature's internal file") và task 7 ghi nó xuống thành luật, không để nó là một lần phá lệ
   không ai biết.

2. **`attendanceKeys` tách ra `features/attendance/api/attendance-keys.ts` (task 2).** Ba feature kia
   đã để key factory ở file lá riêng (`members-keys.ts`, `battle-sessions-keys.ts`,
   `team-builder-keys.ts`); attendance là ngoại lệ duy nhất, key nằm chung trong `attendance-api.ts`
   cạnh năm hàm fetch. Không tách thì điểm 1 không thành: `cache-graph.ts` sẽ kéo `apiFetch` và
   `recordKey` vào chỉ để đọc bốn chuỗi. Đây là "prefer symmetry for parallel values" của
   `CLAUDE.md`, không phải mở rộng phạm vi.

3. **Đồ thị và hook ở hai file.** Spec §1 vẽ cả `CACHE_DEPENDENTS` lẫn `useInvalidate` trong
   `lib/cache-graph.ts`. Kế hoạch tách: `lib/cache-graph.ts` là dữ liệu thuần (không `"use client"`,
   không React, test chạy ở môi trường `node` — đúng điều spec §Kiểm thử muốn: "đồ thị là dữ liệu
   thuần nên test không cần `QueryClient`"), còn hook về `hooks/use-invalidate.ts` — đúng chỗ
   `frontend.md` §2 dành cho "cross-feature hooks". Cũng là luật một-hook-một-file của global
   `CLAUDE.md`.

4. **`useInvalidate` phải trả hàm ổn định qua `useCallback`.** Spec không nhắc. Nhưng
   `use-deadline-refresh.ts` gọi invalidate **trong `useEffect`**, nên hàm trả về đi vào dependency
   array; một hàm mới mỗi lần render sẽ đặt lại `setTimeout` sau mỗi lần render và deadline không bao
   giờ tới. Task 3 có test khoá đúng điều này.

5. **Năm chủ đề, không phải bốn — và hai chỗ ghi nữa cũng đi qua đồ thị.** Spec §4 bảo "kiểm trước khi
   gộp" cho `use-deadline-refresh`: tập của nó là `{sessions, records}`, tập của `schedule` là
   `{settingsKeys.all, sessions, records, teamBuilderKeys.all}` — **khác nhau**, nên thêm topic
   `"attendance-window"` như spec đề xuất, không ép vào `schedule`.

   Ngoài ra spec §1 khai hai topic `attendance` và `formation` mà bảng "Thay đổi cụ thể" không có chỗ
   nào dùng. Grep ra ba call site đang tự viết tay đúng hai tập đó:
   `use-attendance.ts:96` và `:111` (`attendanceKeys.records()`) và `use-save-formation.ts:20`
   (`teamBuilderKeys.all`). Task 5 chuyển cả ba. Để lại thì đồ thị có mục chết — đúng triệu chứng
   `attendanceKeys.weeks()` mà spec đang than.

6. **Không có luật lint nào cấm `lib/` import `features/`** (`apps/web/eslint.config.mjs` chỉ có
   `eslint-config-next`), nên rủi ro thứ hai của spec §Rủi ro **không xảy ra**: file ở lại `lib/`,
   không phải chuyển sang `features/shared-cache/`. Task 1 ghi kết quả kiểm này vào spec.

---

## Global Constraints

- **Text hiển thị cho người dùng là tiếng Việt**; identifier, tên file, doc comment trong code mới là
  tiếng Anh. Doc comment tiếng Việt đang có thì **giữ nguyên tiếng Việt khi chuyển chỗ** (task 3) —
  chuyển chỗ không phải viết lại.
- **Mọi function/hằng export có doc comment** nêu mục đích, từng param và giá trị trả về.
- Mọi lệnh chạy dạng `pnpm --filter web <script>` từ thư mục gốc repo.
- **Không đổi hành vi trên màn hình.** Sau toàn bộ kế hoạch, tập query bị invalidate ở mỗi chỗ ghi
  phải **y hệt** hôm nay. Cách duy nhất được phép để chuyển danh sách key là **copy nguyên văn** vào
  `CACHE_DEPENDENTS` rồi mới xoá code cũ (spec §Rủi ro).
- **Không thu hẹp mức invalidate** — `teamBuilderKeys.all` giữ nguyên mức thô (spec §Edge case,
  §Ngoài phạm vi).
- Commit theo Conventional Commits, tiếng Anh, mô tả viết thường, không dấu chấm cuối, **không** dòng
  attribution nào ở cuối.

---

## Bản đồ file

| File | Trạng thái | Trách nhiệm sau kế hoạch |
|---|---|---|
| `apps/web/lib/cache-graph.ts` | tạo | `CACHE_TOPICS`, `CacheTopic`, `CACHE_DEPENDENTS` — dữ liệu thuần, không React |
| `apps/web/lib/__tests__/cache-graph.test.ts` | tạo | test đồ thị, môi trường `node` |
| `apps/web/hooks/use-invalidate.ts` | tạo | `useInvalidate(topic)` → hàm ổn định danh tính |
| `apps/web/hooks/__tests__/use-invalidate.test.ts` | tạo | test hook, môi trường `jsdom` |
| `apps/web/features/attendance/api/attendance-keys.ts` | tạo | `attendanceKeys` (rời khỏi `attendance-api.ts`), bỏ `weeks()` |
| `apps/web/features/attendance/api/attendance-api.ts` | sửa | chỉ còn năm hàm fetch |
| `apps/web/features/members/hooks/use-member-mutations.ts` | sửa | `useInvalidate("roster")` |
| `apps/web/features/settings/hooks/use-session-mutations.ts` | sửa | `useInvalidate("schedule")` |
| `apps/web/features/attendance/hooks/use-deadline-refresh.ts` | sửa | `useInvalidate("attendance-window")` |
| `apps/web/features/attendance/hooks/use-attendance.ts` | sửa | `useInvalidate("attendance")` ở hai mutation |
| `apps/web/features/team-builder/hooks/use-save-formation.ts` | sửa | `useInvalidate("formation")` |
| `apps/web/features/attendance/index.ts` | sửa | thôi export `attendanceKeys` |
| `apps/web/features/team-builder/index.ts` | sửa | thôi export `teamBuilderKeys` |
| `apps/web/docs/frontend.md` | sửa | §4 luật 5 (ngoại lệ), §9 (anti-pattern), §2 (cây thư mục), §3 (luật `*-keys.ts`) |
| `docs/custom-spec/2026-08-21-w5-cache-graph-design.md` | sửa | task 1 đồng bộ sáu điểm trên |

---

### Task 0: Nhánh làm việc

**Files:** không đổi file nào.

- [x] **Bước 1: Kiểm nhánh hiện tại**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: `main`, working tree sạch. Nếu bẩn: dừng, hỏi người dùng.

- [x] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/w5-cache-graph
git rev-parse --abbrev-ref HEAD
```

Kết quả mong đợi: `refactor/w5-cache-graph`.

---

### Task 1: Đồng bộ spec với thực tế trước khi viết code

**Files:**
- Modify: `docs/custom-spec/2026-08-21-w5-cache-graph-design.md`

**Interfaces:**
- Consumes: không
- Produces: spec đã chốt năm topic (`roster`, `schedule`, `attendance`, `attendance-window`,
  `formation`), chốt đường import là `*-keys.ts`, chốt hai file `lib/cache-graph.ts` +
  `hooks/use-invalidate.ts`. Task 3 trở đi đọc spec này.

- [x] **Bước 1: Xác nhận lại bằng grep trước khi sửa spec**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web
grep -rn "attendanceKeys.weeks" --include="*.ts" --include="*.tsx" . | grep -v node_modules
grep -rn "invalidateQueries" --include="*.ts" --include="*.tsx" . | grep -v node_modules
grep -rn "import/no-restricted-paths\|no-restricted-imports" eslint.config.mjs
```

Kết quả mong đợi:
- `attendanceKeys.weeks` chỉ có **một** dòng — chỗ khai báo (`api/attendance-api.ts:22`). Không call
  site → xoá được.
- `invalidateQueries` có đúng **chín** dòng, ở năm file: `use-member-mutations.ts` (4),
  `use-session-mutations.ts` (4 — nhưng đếm theo lệnh gọi, không theo dòng), `use-deadline-refresh.ts`
  (2), `use-attendance.ts` (2), `use-save-formation.ts` (1). Nếu grep ra file thứ sáu: **dừng**, báo
  người dùng, vì đồ thị sẽ thiếu một chủ đề.
- Lệnh thứ ba **không ra dòng nào** → không luật lint nào cấm `lib/` → `features/`.

- [x] **Bước 2: Sửa spec §1 — năm topic, `CACHE_TOPICS` là nguồn tên**

Thay khối code ở §1 (`lib/cache-graph.ts`) bằng:

````markdown
```ts
// lib/cache-graph.ts

/** Mọi chủ đề dữ liệu mà một thao tác ghi có thể làm cũ đi. */
export const CACHE_TOPICS = [
  "roster",
  "schedule",
  "attendance",
  "attendance-window",
  "formation",
] as const;

/** Loại dữ liệu có thể bị một thao tác ghi làm cũ đi. */
export type CacheTopic = (typeof CACHE_TOPICS)[number];

/**
 * Query key nào phải invalidate khi một chủ đề bị ghi.
 * Đọc như một câu domain: "đổi lịch đánh thì lịch, điểm danh và đội hình đều cũ".
 * Giá trị là thunk để key factory chỉ chạy lúc invalidate, không lúc import.
 */
export const CACHE_DEPENDENTS: Record<CacheTopic, () => QueryKey[]> = {
  roster:               () => [memberKeys.all, attendanceKeys.characters(), attendanceKeys.records(), teamBuilderKeys.all],
  schedule:             () => [settingsKeys.all, attendanceKeys.sessions(), attendanceKeys.records(), teamBuilderKeys.all],
  attendance:           () => [attendanceKeys.records()],
  "attendance-window":  () => [attendanceKeys.sessions(), attendanceKeys.records()],
  formation:            () => [teamBuilderKeys.all],
};
```

```ts
// hooks/use-invalidate.ts

/**
 * Invalidate mọi query phụ thuộc một chủ đề vừa bị ghi.
 * Hàm trả về ổn định qua các lần render, vì `use-deadline-refresh` đặt nó vào
 * dependency của `useEffect`.
 * @param topic - Chủ đề dữ liệu vừa thay đổi
 * @returns Hàm gọi trong onSuccess của mutation
 */
export function useInvalidate(topic: CacheTopic): () => void;
```
````

- [x] **Bước 3: Sửa spec §2 — chốt đường import là `*-keys.ts`**

Sau đoạn "Vì sao không dùng chuỗi khoá thô…", thêm:

```markdown
Đường import là file key lá của từng feature (`features/<feature>/api/*-keys.ts`), **không** phải
`index.ts`. Barrel của attendance kéo theo một server action import `"server-only"`, và vì bốn
feature đều import ngược lại `useInvalidate` nên đi qua barrel là tạo bốn vòng import. File
`*-keys.ts` không import gì cả nên cả hai vấn đề biến mất. `attendanceKeys` vì thế tách khỏi
`attendance-api.ts` ra `features/attendance/api/attendance-keys.ts`, cho khớp ba feature kia.
```

- [x] **Bước 4: Sửa spec §4 — kết quả của phép "kiểm trước khi gộp"**

Thay toàn bộ §4 bằng:

```markdown
### 4. `use-deadline-refresh` cũng đi qua đồ thị

Đã kiểm: tập của nó là `{sessions, records}`, tập của `schedule` là
`{settingsKeys.all, sessions, records, teamBuilderKeys.all}` — **khác nhau**, nên không gộp.
`:25-30` đổi thành `useInvalidate("attendance-window")`.

### 5. Ba chỗ ghi còn lại cũng đi qua đồ thị

`attendance` và `formation` không phải topic dự phòng — chúng có call site sẵn:
`use-attendance.ts:96` và `:111` (điểm danh và điểm danh hộ) là `attendance`,
`use-save-formation.ts:20` là `formation`. Chuyển cả ba, nếu không đồ thị có mục chết ngay từ đầu.
```

- [x] **Bước 5: Sửa spec §Rủi ro — gạch rủi ro lint**

Thay gạch đầu dòng thứ hai của §Rủi ro bằng:

```markdown
- **`lib/` import từ `features/`** là hướng phụ thuộc mới trong app này. Đã kiểm
  `apps/web/eslint.config.mjs`: không có `no-restricted-imports` hay `import/no-restricted-paths`,
  nên file ở lại `lib/`. Bù lại, ngoại lệ với luật 5 của `frontend.md` §4 phải được ghi xuống thành
  luật, không để là một lần phá lệ không ai biết.
```

- [x] **Bước 6: Sửa spec §Kiểm thử và bảng "Thay đổi cụ thể"**

Trong §Kiểm thử, thay gạch đầu dòng cuối bằng:

```markdown
- Test cho `useInvalidate` (`hooks/__tests__/use-invalidate.test.ts`, môi trường jsdom): gọi
  `invalidateQueries` đúng số lần và đúng từng key, **và** trả về cùng một hàm qua hai lần render.
```

Trong bảng "Thay đổi cụ thể", thêm bốn dòng và sửa một dòng:

```markdown
| `hooks/use-invalidate.ts` (mới) | `useInvalidate` |
| `hooks/__tests__/use-invalidate.test.ts` (mới) | test hook |
| `features/attendance/api/attendance-keys.ts` (mới) | `attendanceKeys`, không còn `weeks()` |
| `features/attendance/hooks/use-attendance.ts:96,111` | `useInvalidate("attendance")` |
| `features/team-builder/hooks/use-save-formation.ts:20` | `useInvalidate("formation")` |
```

- [x] **Bước 7: Commit**

```bash
cd /home/huykirito1201/personal/guild-manager
git add docs/custom-spec/2026-08-21-w5-cache-graph-design.md
git commit -m "docs(spec): settle the w5 cache graph shape against the real call sites"
```

---

### Task 2: `attendanceKeys` ra file lá riêng, `weeks()` biến mất

**Files:**
- Create: `apps/web/features/attendance/api/attendance-keys.ts`
- Modify: `apps/web/features/attendance/api/attendance-api.ts:1-25`
- Modify: `apps/web/features/attendance/hooks/use-attendance.ts:8-15`
- Modify: `apps/web/features/attendance/hooks/use-deadline-refresh.ts:7`
- Modify: `apps/web/features/attendance/index.ts:4`

**Interfaces:**
- Consumes: không
- Produces: `attendanceKeys` tại `@/features/attendance/api/attendance-keys` với các khoá
  `all`, `characters()`, `sessions()`, `week()`, `records()` — **không còn** `weeks()`. Task 3 import
  đường này.

Task này là **thuần đổi chỗ**: không hành vi nào đổi, không test nào phải sửa. Vì thế không có bước
viết test mới — bốn lệnh kiểm ở bước 5 là bằng chứng.

- [x] **Bước 1: Tạo file key**

`apps/web/features/attendance/api/attendance-keys.ts`:

```ts
/**
 * Query key factory cho domain điểm danh.
 * Tách khỏi `attendance-api.ts` để `lib/cache-graph.ts` đọc được key mà không
 * kéo theo `apiFetch` — và cho khớp ba feature kia, vốn đã có file key riêng.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  characters: () => [...attendanceKeys.all, "characters"] as const,
  sessions: () => [...attendanceKeys.all, "sessions"] as const,
  week: () => [...attendanceKeys.all, "week"] as const,
  records: () => [...attendanceKeys.all, "records"] as const,
};
```

`weeks()` không được chép sang: bước 1 của task 1 đã chứng minh nó không có call site nào.

- [x] **Bước 2: Bỏ khối `attendanceKeys` khỏi `attendance-api.ts`**

Xoá nguyên khối `:16-25` (doc comment + `export const attendanceKeys = { … };`). Phần còn lại của file
không đổi một dòng nào — không hàm fetch nào đọc `attendanceKeys`.

- [x] **Bước 3: Sửa hai chỗ import trong feature**

`use-attendance.ts` — bỏ `attendanceKeys` khỏi khối import từ `../api/attendance-api` và thêm một
dòng import mới ngay trên nó:

```ts
import { matchesRosterFilter } from "@/lib/roster-filter";
import { attendanceKeys } from "../api/attendance-keys";
import {
  fetchAttendanceRecords,
  fetchBattleSessions,
  fetchCharacters,
  fetchCurrentWeek,
  markAttendance,
} from "../api/attendance-api";
```

`use-deadline-refresh.ts:7`:

```ts
import { attendanceKeys } from "../api/attendance-keys";
```

- [x] **Bước 4: Sửa barrel**

`features/attendance/index.ts:4`:

```ts
export { attendanceKeys } from "./api/attendance-keys";
```

(Dòng này biến mất hẳn ở task 6; ở đây chỉ đổi đường dẫn để nhánh luôn xanh.)

- [x] **Bước 5: Chạy kiểm**

```bash
cd /home/huykirito1201/personal/guild-manager
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web lint
grep -rn "attendanceKeys" apps/web/features/attendance/api/attendance-api.ts
```

Kết quả mong đợi: ba lệnh đầu PASS, lệnh `grep` **không ra dòng nào**.

- [x] **Bước 6: Commit**

```bash
git add apps/web/features/attendance
git commit -m "refactor(web): give attendance its own query key file"
```

---

### Task 3: `lib/cache-graph.ts` — đồ thị là dữ liệu

**Files:**
- Create: `apps/web/lib/cache-graph.ts`
- Test: `apps/web/lib/__tests__/cache-graph.test.ts`

**Interfaces:**
- Consumes: `attendanceKeys` từ `@/features/attendance/api/attendance-keys` (task 2)
- Produces:
  - `CACHE_TOPICS: readonly ["roster", "schedule", "attendance", "attendance-window", "formation"]`
  - `type CacheTopic = (typeof CACHE_TOPICS)[number]`
  - `CACHE_DEPENDENTS: Record<CacheTopic, () => QueryKey[]>`

  Task 4 (`useInvalidate`) đọc cả ba.

- [x] **Bước 1: Viết test đang đỏ**

`apps/web/lib/__tests__/cache-graph.test.ts` — không có `// @vitest-environment`, nên chạy ở `node`:
đồ thị là dữ liệu thuần, test của nó không được cần DOM hay `QueryClient`.

```ts
import { describe, expect, it } from "vitest";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { memberKeys } from "@/features/members/api/members-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";
import { CACHE_DEPENDENTS, CACHE_TOPICS } from "../cache-graph";

describe("CACHE_DEPENDENTS", () => {
  it("mọi chủ đề đều có mục trong đồ thị", () => {
    for (const topic of CACHE_TOPICS) {
      expect(CACHE_DEPENDENTS[topic]().length).toBeGreaterThan(0);
    }
  });

  it("sửa danh sách thành viên làm cũ cả điểm danh lẫn xếp team", () => {
    expect(CACHE_DEPENDENTS.roster()).toEqual([
      memberKeys.all,
      attendanceKeys.characters(),
      attendanceKeys.records(),
      teamBuilderKeys.all,
    ]);
  });

  it("đổi lịch đánh làm cũ record điểm danh", () => {
    expect(CACHE_DEPENDENTS.schedule()).toEqual([
      settingsKeys.all,
      attendanceKeys.sessions(),
      attendanceKeys.records(),
      teamBuilderKeys.all,
    ]);
  });

  it("điểm danh chỉ làm cũ record", () => {
    expect(CACHE_DEPENDENTS.attendance()).toEqual([attendanceKeys.records()]);
  });

  it("deadline trôi qua làm cũ trận và record, không đụng lịch", () => {
    expect(CACHE_DEPENDENTS["attendance-window"]()).toEqual([
      attendanceKeys.sessions(),
      attendanceKeys.records(),
    ]);
  });

  it("lưu đội hình chỉ làm cũ xếp team", () => {
    expect(CACHE_DEPENDENTS.formation()).toEqual([teamBuilderKeys.all]);
  });

  it("gọi hai lần trả về key bằng nhau", () => {
    // Thunk chỉ để hoãn việc đọc key factory, không phải để sinh key khác nhau.
    expect(CACHE_DEPENDENTS.schedule()).toEqual(CACHE_DEPENDENTS.schedule());
  });
});
```

- [x] **Bước 2: Chạy để chắc chắn nó đỏ**

```bash
cd /home/huykirito1201/personal/guild-manager
pnpm --filter web test -- lib/__tests__/cache-graph.test.ts
```

Kết quả mong đợi: FAIL — `Failed to resolve import "../cache-graph"`.

- [x] **Bước 3: Viết `lib/cache-graph.ts`**

Hai doc comment tiếng Việt dưới đây **chép nguyên văn** từ `use-member-mutations.ts:21-26` và
`use-session-mutations.ts:26-31`; chúng là phần có giá trị nhất của code cũ (spec §Thay đổi cụ thể).

```ts
import type { QueryKey } from "@tanstack/react-query";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { memberKeys } from "@/features/members/api/members-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";

/**
 * Mọi chủ đề dữ liệu mà một thao tác ghi có thể làm cũ đi.
 * Là nguồn duy nhất của tên chủ đề: `CacheTopic` sinh ra từ đây, nên thêm một
 * chủ đề mà quên khai phụ thuộc là lỗi biên dịch.
 */
export const CACHE_TOPICS = [
  "roster",
  "schedule",
  "attendance",
  "attendance-window",
  "formation",
] as const;

/** Loại dữ liệu có thể bị một thao tác ghi làm cũ đi. */
export type CacheTopic = (typeof CACHE_TOPICS)[number];

/**
 * Query key nào phải invalidate khi một chủ đề bị ghi. Đọc như một câu domain:
 * "đổi lịch đánh thì lịch, điểm danh và đội hình đều cũ".
 *
 * Đây là chỗ duy nhất trong app được import key factory của feature khác: quan
 * hệ "dữ liệu nào làm cũ dữ liệu nào" là kiến thức xuyên feature, không feature
 * nào sở hữu nó.
 *
 * Giá trị là thunk chứ không phải mảng dựng sẵn, để key factory chỉ chạy lúc
 * invalidate — thứ tự nạp module không ảnh hưởng gì.
 */
export const CACHE_DEPENDENTS: Record<CacheTopic, () => QueryKey[]> = {
  /**
   * Bảng điểm danh và trang Xếp team đều liệt kê nhân vật, thiếu chỗ nào là
   * các màn lệch nhau cho tới lần tải lại trang.
   */
  roster: () => [
    memberKeys.all,
    attendanceKeys.characters(),
    attendanceKeys.records(),
    teamBuilderKeys.all,
  ],
  /**
   * Bảng điểm danh đổi số cột và trang Xếp team đổi số tab, nên thiếu chỗ nào
   * là hai màn lệch nhau cho tới lần tải lại trang.
   */
  schedule: () => [
    settingsKeys.all,
    attendanceKeys.sessions(),
    attendanceKeys.records(),
    teamBuilderKeys.all,
  ],
  /** Điểm danh một ô chỉ đổi record; cột và danh sách nhân vật không đổi. */
  attendance: () => [attendanceKeys.records()],
  /**
   * Deadline trôi qua thì cột phải khoá lại: `isDeadlinePassed` do server tính
   * và đi kèm session, nên phải nạp lại cả trận lẫn record. Lịch đánh không
   * đổi, nên đây không phải `schedule`.
   */
  "attendance-window": () => [
    attendanceKeys.sessions(),
    attendanceKeys.records(),
  ],
  /** Lưu đội hình chỉ đụng dữ liệu của chính trang Xếp team. */
  formation: () => [teamBuilderKeys.all],
};
```

- [x] **Bước 4: Chạy để chắc chắn nó xanh**

```bash
pnpm --filter web test -- lib/__tests__/cache-graph.test.ts
pnpm --filter web typecheck
```

Kết quả mong đợi: 7 test PASS, typecheck PASS.

- [x] **Bước 5: Commit**

```bash
git add apps/web/lib/cache-graph.ts apps/web/lib/__tests__/cache-graph.test.ts
git commit -m "feat(web): state the cache dependency graph as data in one place"
```

---

### Task 4: `useInvalidate` — hook đọc đồ thị

**Files:**
- Create: `apps/web/hooks/use-invalidate.ts`
- Test: `apps/web/hooks/__tests__/use-invalidate.test.ts` (thư mục `__tests__` là mới)

**Interfaces:**
- Consumes: `CACHE_DEPENDENTS`, `CacheTopic` từ `@/lib/cache-graph` (task 3)
- Produces: `useInvalidate(topic: CacheTopic): () => void` tại `@/hooks/use-invalidate` — hàm trả về
  **ổn định danh tính** giữa các lần render với cùng `topic`. Task 5 và 6 dùng nó.

- [x] **Bước 1: Viết test đang đỏ**

`apps/web/hooks/__tests__/use-invalidate.test.ts`:

```ts
// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";
import { useInvalidate } from "../use-invalidate";

afterEach(cleanup);

/**
 * Render `useInvalidate` trong một QueryClient riêng và theo dõi lời gọi
 * invalidate của nó.
 * @param topic - Chủ đề truyền vào hook
 * @returns Kết quả renderHook cùng spy trên `invalidateQueries`
 */
function renderInvalidate(topic: Parameters<typeof useInvalidate>[0]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi
    .spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue(undefined);

  const rendered = renderHook(() => useInvalidate(topic), {
    /**
     * Cấp QueryClient cho hook đang test.
     * @param props - Children render trong provider
     * @returns Cây đã bọc provider
     */
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });

  return { ...rendered, invalidateSpy };
}

describe("useInvalidate", () => {
  it("invalidate đúng từng key của chủ đề", () => {
    const { result, invalidateSpy } = renderInvalidate("schedule");

    result.current();

    expect(invalidateSpy).toHaveBeenCalledTimes(4);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: settingsKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.sessions(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.records(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamBuilderKeys.all,
    });
  });

  it("chủ đề hẹp chỉ invalidate một key", () => {
    const { result, invalidateSpy } = renderInvalidate("formation");

    result.current();

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamBuilderKeys.all,
    });
  });

  it("trả về cùng một hàm qua các lần render", () => {
    // use-deadline-refresh đặt hàm này vào dependency của useEffect: danh tính
    // đổi mỗi lần render là setTimeout bị đặt lại và deadline không bao giờ tới.
    const { result, rerender } = renderInvalidate("attendance-window");
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
```

- [x] **Bước 2: Chạy để chắc chắn nó đỏ**

```bash
cd /home/huykirito1201/personal/guild-manager
pnpm --filter web test -- hooks/__tests__/use-invalidate.test.ts
```

Kết quả mong đợi: FAIL — `Failed to resolve import "../use-invalidate"`.

- [x] **Bước 3: Viết `hooks/use-invalidate.ts`**

```ts
"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { CACHE_DEPENDENTS, type CacheTopic } from "@/lib/cache-graph";

/**
 * Invalidate mọi query phụ thuộc một chủ đề vừa bị ghi. Chỗ ghi chỉ nói mình
 * vừa đổi cái gì; ai bị ảnh hưởng là việc của `CACHE_DEPENDENTS`.
 * @param topic - Chủ đề dữ liệu vừa thay đổi
 * @returns Hàm dùng trong `onSuccess` của mutation, ổn định qua các lần render
 */
export function useInvalidate(topic: CacheTopic): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    for (const queryKey of CACHE_DEPENDENTS[topic]()) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, topic]);
}
```

- [x] **Bước 4: Chạy để chắc chắn nó xanh**

```bash
pnpm --filter web test -- hooks/__tests__/use-invalidate.test.ts
pnpm --filter web typecheck
pnpm --filter web lint
```

Kết quả mong đợi: 3 test PASS, typecheck và lint PASS (`react-hooks/exhaustive-deps` không cảnh báo,
vì `CACHE_DEPENDENTS` là hằng module).

- [x] **Bước 5: Commit**

```bash
git add apps/web/hooks/use-invalidate.ts apps/web/hooks/__tests__/use-invalidate.test.ts
git commit -m "feat(web): read the cache graph through one useInvalidate hook"
```

---

### Task 5: Hai hook mutation thôi liệt kê key của feature khác

**Files:**
- Modify: `apps/web/features/members/hooks/use-member-mutations.ts:1-38`
- Modify: `apps/web/features/settings/hooks/use-session-mutations.ts:1-41`

**Interfaces:**
- Consumes: `useInvalidate` từ `@/hooks/use-invalidate` (task 4)
- Produces: hai file này không còn import `@/features/attendance` hay `@/features/team-builder`.

Đối chiếu bảng khi sửa — `CACHE_DEPENDENTS.roster` phải khớp từng dòng với `useInvalidateMembers` cũ,
`CACHE_DEPENDENTS.schedule` khớp `useInvalidateSchedule` cũ. Task 3 đã copy nguyên văn, và test của
task 3 đang khoá cả hai danh sách; nếu ở đây thấy lệch, **sửa task 3 trước**, không sửa tại chỗ.

- [x] **Bước 1: `use-member-mutations.ts` — bỏ hook cục bộ**

Xoá `useInvalidateMembers` (`:21-38`, gồm cả doc comment) và ba import chỉ nó dùng
(`useQueryClient`, `attendanceKeys`, `teamBuilderKeys`, `memberKeys`). Đầu file thành:

```ts
"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { createMember, deleteMember, updateMember } from "../api/members-api";
```

Trong ba mutation, đổi một dòng mỗi cái:

```ts
  const invalidate = useInvalidate("roster");
```

Phần `useMutation({ … onSuccess: invalidate })` giữ nguyên không đổi.

- [x] **Bước 2: `use-session-mutations.ts` — bỏ hook cục bộ**

Xoá `useInvalidateSchedule` (`:26-41`) và các import chỉ nó dùng. Đầu file thành:

```ts
"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import {
  createBattleSession,
  deleteBattleSession,
  updateBattleSession,
} from "../api/battle-sessions-api";
```

Trong ba mutation:

```ts
  const invalidate = useInvalidate("schedule");
```

- [x] **Bước 3: Kiểm rằng hai file thôi biết feature khác**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web
grep -n "features/attendance\|features/team-builder\|invalidateQueries" \
  features/members/hooks/use-member-mutations.ts \
  features/settings/hooks/use-session-mutations.ts
```

Kết quả mong đợi: **không ra dòng nào**.

- [x] **Bước 4: Chạy suite**

```bash
cd /home/huykirito1201/personal/guild-manager
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web lint
```

Kết quả mong đợi: cả ba PASS.

- [x] **Bước 5: Commit**

```bash
git add apps/web/features/members apps/web/features/settings
git commit -m "refactor(web): let the write side name its topic instead of its dependents"
```

---

### Task 6: Ba chỗ ghi còn lại đi qua đồ thị

**Files:**
- Modify: `apps/web/features/attendance/hooks/use-deadline-refresh.ts:1-36`
- Modify: `apps/web/features/attendance/hooks/use-attendance.ts:92-113`
- Modify: `apps/web/features/team-builder/hooks/use-save-formation.ts:1-23`

**Interfaces:**
- Consumes: `useInvalidate` từ `@/hooks/use-invalidate` (task 4)
- Produces: `invalidateQueries` không còn xuất hiện ở đâu ngoài `hooks/use-invalidate.ts`.

- [x] **Bước 1: `use-deadline-refresh.ts`**

Thay phần thân hook (`:7`, `:17-36`) — doc comment của hook giữ nguyên:

```ts
import { useInvalidate } from "@/hooks/use-invalidate";

export function useDeadlineRefresh(sessions: BattleSession[]): void {
  const invalidate = useInvalidate("attendance-window");
  const nextDeadline = findNextDeadline(sessions);

  useEffect(() => {
    if (nextDeadline === null) return;

    const timer = setTimeout(invalidate, nextDeadline - Date.now());

    return () => clearTimeout(timer);
  }, [nextDeadline, invalidate]);
}
```

Bỏ hai import không còn dùng: `useQueryClient` và `attendanceKeys`. `invalidate` vào được dependency
array chính vì task 4 đã bọc `useCallback`.

- [x] **Bước 2: `use-attendance.ts` — hai mutation điểm danh**

```ts
export function useMarkAttendance() {
  const invalidate = useInvalidate("attendance");

  return useMutation({
    mutationFn: markAttendance,
    onSuccess: invalidate,
  });
}
```

```ts
export function useMarkAttendanceAsAdmin() {
  const invalidate = useInvalidate("attendance");

  return useMutation({
    mutationFn: markAttendanceAsAdmin,
    onSuccess: invalidate,
  });
}
```

Doc comment của cả hai giữ nguyên. Bỏ `useQueryClient` khỏi import `@tanstack/react-query` (các
`useQuery` phía trên vẫn dùng `attendanceKeys`, nên import key **ở lại**), thêm:

```ts
import { useInvalidate } from "@/hooks/use-invalidate";
```

- [x] **Bước 3: `use-save-formation.ts`**

```ts
"use client";

import { useMutation } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import { saveFormation } from "../api/team-builder-api";

/**
 * Persist one session's formation.
 * No optimistic update on purpose: a failed save must leave the draft intact,
 * since losing the arrangement is far worse than waiting a beat for the server.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSaveFormation() {
  const invalidate = useInvalidate("formation");

  return useMutation({
    mutationFn: saveFormation,
    onSuccess: invalidate,
  });
}
```

- [x] **Bước 4: Kiểm rằng chỉ còn một người gọi `invalidateQueries`**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web
grep -rn "invalidateQueries" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Kết quả mong đợi: đúng **hai** dòng — `hooks/use-invalidate.ts` (lời gọi thật) và
`hooks/__tests__/use-invalidate.test.ts` (spy). Không dòng nào trong `features/`.

- [x] **Bước 5: Chạy suite**

```bash
cd /home/huykirito1201/personal/guild-manager
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web lint
```

Kết quả mong đợi: cả ba PASS. Test hook của team-builder (`use-formation-week.test.ts` và bốn file
cạnh nó) vẫn xanh — chúng render trong `QueryClientProvider` thật, nên `useInvalidate` chạy bình
thường.

- [x] **Bước 6: Commit**

```bash
git add apps/web/features/attendance apps/web/features/team-builder
git commit -m "refactor(web): route the last three invalidations through the graph"
```

---

### Task 7: Key factory rút về sau `index.ts`

**Files:**
- Modify: `apps/web/features/attendance/index.ts:4`
- Modify: `apps/web/features/team-builder/index.ts:2`

**Interfaces:**
- Consumes: task 5 và 6 đã bỏ mọi người đọc key qua barrel
- Produces: hai barrel chỉ còn export component và hook — key factory chỉ vào được qua đường
  `features/<feature>/api/*-keys.ts`, và `lib/cache-graph.ts` là người duy nhất đi đường đó.

- [x] **Bước 1: Chứng minh không còn ai đọc key qua barrel**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web
grep -rn "attendanceKeys\|teamBuilderKeys\|memberKeys\|settingsKeys" \
  --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "api/.*-keys.ts"
```

Kết quả mong đợi: mọi dòng còn lại nằm trong `lib/cache-graph.ts`, `lib/__tests__/`,
`hooks/__tests__/`, `features/attendance/hooks/use-attendance.ts` (dùng key của **chính** feature
mình), `features/team-builder/hooks/use-formations.ts`, `use-formation-weeks.ts`,
`features/members/hooks/use-members.ts`, `features/settings/hooks/use-week-sessions.ts` — cộng hai
dòng `export` sắp xoá. Nếu có dòng nào khác: task 5 hoặc 6 còn sót.

- [x] **Bước 2: Xoá dòng export ở hai barrel**

`features/attendance/index.ts` — xoá dòng `export { attendanceKeys } from "./api/attendance-keys";`,
còn lại:

```ts
export { AttendanceScreen } from "./components/attendance-screen";
export { AttendanceFilters } from "./components/attendance-filters";
export { AttendanceLogTable } from "./components/attendance-log-table";
export { getSessionSubtitle } from "./lib/session-subtitle";
export {
  useCharacters,
  useBattleSessions,
  useAttendanceRecords,
} from "./hooks/use-attendance";
```

`features/team-builder/index.ts` — xoá dòng `export { teamBuilderKeys } …`, còn lại:

```ts
export { TeamBuilderScreen } from "./components/team-builder-screen";
```

- [x] **Bước 3: Chạy suite**

```bash
cd /home/huykirito1201/personal/guild-manager
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

Kết quả mong đợi: cả ba PASS. `build` ở đây, không đợi tới cuối: task này là task duy nhất có thể làm
vỡ một đường import mà `typecheck` bắt được nhưng bundler thì không.

- [x] **Bước 4: Commit**

```bash
git add apps/web/features/attendance/index.ts apps/web/features/team-builder/index.ts
git commit -m "refactor(web): stop exporting query key factories from feature barrels"
```

---

### Task 8: Ghi luật vào `frontend.md`

**Files:**
- Modify: `apps/web/docs/frontend.md:58` (cây thư mục), `:115-119` (§4 luật 5), `:430` (§9 bảng)

**Interfaces:**
- Consumes: hình dạng cuối của code sau task 7
- Produces: không có (tài liệu)

Ngoại lệ với luật 5 phải nằm **cạnh luật 5**. Một ngoại lệ chỉ sống trong commit message là ngoại lệ
sẽ bị người sau lặp lại ở chỗ khác.

- [x] **Bước 1: Cập nhật cây thư mục ở §2**

Dòng `:58` và `:60`:

```markdown
├── hooks/                          # cross-feature hooks (use-table-pagination, use-invalidate)
├── config/                         # routes.ts (ROUTES), api.ts (API_BASE_URL)
├── lib/                            # api-client.ts, cache-graph.ts, format.ts, guild-class.ts, utils.ts
```

- [x] **Bước 2: Thêm ngoại lệ vào §4 luật 5**

Thêm vào cuối luật 5 (sau câu về `proxy.ts`):

`frontend.md` là tài liệu tiếng Anh, nên đoạn thêm vào viết tiếng Anh (luật ngôn ngữ của
`CLAUDE.md`: text cho người dùng cuối mới là tiếng Việt):

```markdown
   The **only** exception: `lib/cache-graph.ts` imports `features/<feature>/api/*-keys.ts` from all
   four features. "Writing this data makes that screen stale" is cross-feature knowledge — no single
   feature owns it, so burying it in the writing feature puts it in the wrong place. Import the key
   file directly, **not** the barrel: attendance's barrel drags in `"server-only"`, and since all
   four features import `useInvalidate` back, going through barrels would create import cycles. A
   `*-keys.ts` file imports nothing, so both problems disappear. A write site never lists keys
   itself: it calls `useInvalidate("<topic>")` and only names what it just changed. Adding a topic
   means adding a line to `CACHE_TOPICS` — a missing dependents entry is a compile error.
```

- [x] **Bước 2b: Sửa §3 cho khớp thực tế**

Sau task 2 mọi feature đều có `*-keys.ts`, nên câu "whenever the API file is `"use server"`" ở `:97`
không còn giải thích được `attendance-keys.ts` (`attendance-api.ts` không phải `"use server"`). Đổi
thành "always", nêu cả hai lý do: `"use server"` chỉ export được async function, và `cache-graph.ts`
cần một file lá không import gì.

- [x] **Bước 3: Thêm một dòng vào bảng anti-pattern §9**

Chèn ngay dưới dòng `Two hooks writing the same store slice …`:

```markdown
| A mutation listing another feature's query keys | `useInvalidate("<topic>")`; the graph lives in `lib/cache-graph.ts` |
```

- [x] **Bước 4: Commit**

```bash
cd /home/huykirito1201/personal/guild-manager
git add apps/web/docs/frontend.md
git commit -m "docs(web): record the cache graph as the one cross-feature key import"
```

---

## Kết thúc

- [x] **Bước 1: Suite đầy đủ trên nhánh sạch**

```bash
cd /home/huykirito1201/personal/guild-manager
git status --short
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

Kết quả mong đợi: working tree sạch, cả bốn lệnh PASS.

- [x] **Bước 2: Đối chiếu kết quả với spec**

```bash
cd /home/huykirito1201/personal/guild-manager/apps/web
grep -rn "invalidateQueries" --include="*.ts" --include="*.tsx" . | grep -v node_modules
grep -rn "weeks()" features/attendance
grep -rn "Keys } from" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "\.\./api\|\./api"
```

Kết quả mong đợi:
- `invalidateQueries` chỉ còn ở `hooks/use-invalidate.ts` và test của nó.
- `attendanceKeys.weeks` **không còn dòng nào**.
- Lệnh thứ ba (import key factory từ ngoài feature) chỉ ra các dòng trong `lib/cache-graph.ts`,
  `lib/__tests__/cache-graph.test.ts` và `hooks/__tests__/use-invalidate.test.ts`.

Nếu còn sót: task tương ứng chưa xong.

- [x] **Bước 3: Báo người dùng**

Tóm tắt: luật "ghi X thì màn nào cũ" giờ ở một chỗ, dạng dữ liệu, năm chủ đề; năm chỗ ghi chỉ còn nói
tên chủ đề của mình; hai barrel thôi rò key factory; `attendanceKeys.weeks()` chết được xoá. **Không**
thay đổi hành vi nào trên màn hình — tập query bị invalidate ở từng chỗ y hệt trước. Ba điều spec
không nói mà kế hoạch chốt: đường import là `*-keys.ts` chứ không phải barrel (tránh `server-only` và
bốn vòng import), hook tách sang `hooks/use-invalidate.ts` và phải `useCallback` (vì
`use-deadline-refresh` đặt nó vào dependency của `useEffect`), và ba call site spec không liệt kê
cũng chuyển để đồ thị không có mục chết. Nhánh `refactor/w5-cache-graph`, chưa push.
