# W3 — Gộp query thành một module · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** ba luật gộp query — `isPending` bằng `some`, lấy lỗi của query hỏng **đầu tiên** và ưu
tiên `ApiError.message`, refetch **tất cả** — được nói **một lần** ở một hàm thuần có test. Kèm theo
đó là hai lỗi thật ở `useFormationWeek` được vá: message tiếng Việt của backend không còn bị vứt đi
khi `weeksQuery`/`charactersQuery` hỏng, và nút "Thử lại" chạm cả ba query.

**Kiến trúc:** một hàm thuần `combineQueries` ở `lib/`, và một component `QueryBoundary` ở
`components/shared/` khoá thứ tự branch (lỗi → tải → nội dung). Hook của từng feature vẫn là nơi
ghép query; nó chỉ thôi tự viết luật gộp.

**Tech stack:** Next.js 16, TanStack Query 5, Vitest 4.

**Spec:** [`docs/custom-spec/2026-08-21-w3-query-group-design.md`](../custom-spec/2026-08-21-w3-query-group-design.md)
· bối cảnh: [tổng quan đợt 2](../custom-spec/2026-08-21-architecture-review-2-overview.md)

**Phạm vi:** `apps/web` — `lib/`, `components/shared/`, bốn feature (`attendance`, `team-builder`,
`settings`, `members`). `apps/api` và `packages/shared` **không đổi**.

## Ba điểm kế hoạch chốt khác spec

1. **File nằm ở `lib/query-group.ts`, không phải `hooks/use-combined-queries.ts`.** Spec cho hai
   lựa chọn. Chọn `lib/` vì `combineQueries` **không phải hook** — không gọi hook nào bên trong, và
   `architecture.md:222` dành `hooks/` cho "cross-feature hooks". Đặt một hàm thuần tên `use*` vào
   đó sẽ khiến ESLint rules-of-hooks và người đọc hiểu sai. Test đi kèm là `lib/__tests__/` — đúng
   chỗ `frontend.md` §8 gọi là "lớp đáng test nhất".
2. **Tham số nhận một interface riêng (`CombinableQuery`), không `Pick<UseQueryResult, …>`.** Ý spec
   giữ nguyên (bốn field, object nào có đủ là truyền vào được), nhưng `UseQueryResult` mặc định
   generic `<unknown, Error>` và `refetch` của nó trả `Promise<QueryObserverResult<TData, TError>>`
   — buộc mọi caller phải khớp generic. Khai báo `error: unknown` và `refetch: () => Promise<unknown>`
   cắt hẳn ràng buộc đó và giữ đúng lời hứa "hàm thuần, test không cần `QueryClient`".
3. **`settings-screen` dùng `QueryBoundary`, `team-builder-screen` thì không.** Spec để
   `QueryBoundary` là tuỳ chọn. Tiêu chí chốt ở đây: dùng nó khi phần nội dung **không cần
   TypeScript narrowing** từ nhánh `isPending` (`members-panel`, `settings-screen` đều đọc data qua
   `?? []`); giữ early-return khi nội dung phía sau dựa vào narrowing đó (`team-builder-screen`,
   ba component của `attendance`). Đổi những chỗ sau sẽ kéo theo `?? []` rải khắp component — đúng
   thứ `CLAUDE.md` cấm. `attendance` vì vậy **chỉ đổi phần ruột của hook**, không đụng component.

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/w3-query-group`. Không `git push`,
  không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Text hiển thị là tiếng Việt; identifier, tên file, doc comment của code mới là tiếng Anh.** Khi
  **chuyển chỗ** một comment tiếng Việt sẵn có thì bê nguyên văn, không dịch.
- **Bốn câu fallback giữ nguyên từng chữ** — chúng đang nói đúng thứ đang hỏng.
- **`ApiError.message` render nguyên văn** (`architecture.md` §4.2, `apps/web/CLAUDE.md`).
- **Doc comment tiếng Anh cho mọi hàm/component mới**: mục đích, từng param, giá trị trả về.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter web typecheck` · `pnpm --filter web lint` · `pnpm --filter web test`
  - chạy một file: `pnpm --filter web test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/web/lib/query-group.ts` | `QueryGroupState`, `CombinableQuery`, `combineQueries` |
| `apps/web/lib/__tests__/query-group.test.ts` | test bảng cho `combineQueries` |
| `apps/web/components/shared/query-boundary.tsx` | `QueryBoundary` |

**Sửa**

| File | Việc |
|---|---|
| `features/attendance/hooks/use-attendance-board.ts` | dùng `combineQueries`; interface public không đổi |
| `features/team-builder/hooks/use-formation-week.ts:81-92` | `combineQueries([formations, weeks, characters], …)` — **vá cả hai lỗi** |
| `features/team-builder/hooks/__tests__/use-formation-week.test.ts` | thêm 2 ca: `ApiError` của `charactersQuery`, `refetch` chạm cả ba |
| `features/settings/components/settings-screen.tsx:35-62` | `combineQueries` + `QueryBoundary` |
| `features/members/components/members-panel.tsx:60-81` | như trên |
| `apps/web/docs/frontend.md` §5 | một mục cho `QueryBoundary`/`combineQueries` |

**Không đụng tới:** `attendance-grid.tsx`, `attendance-log-table.tsx`, `week-timeline.tsx`,
`team-builder-screen.tsx` — hành vi của chúng không đổi (xem "chốt khác spec" §3).

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
git switch -c refactor/w3-query-group
git rev-parse --abbrev-ref HEAD
```

- [x] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter web test
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng.

---

### Task 1: `combineQueries` — một hàm thuần, một chỗ nói luật

**Files:**
- Create: `apps/web/lib/query-group.ts`
- Test: `apps/web/lib/__tests__/query-group.test.ts`

**Interfaces:**
- Produces: `QueryGroupState`, `CombinableQuery`, `combineQueries(queries, fallbackMessage)`

- [x] **Bước 1: Viết test đỏ**

`apps/web/lib/__tests__/query-group.test.ts` (môi trường node mặc định — không `QueryClient`, không
jsdom):

```ts
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api-client";
import { combineQueries, type CombinableQuery } from "../query-group";

const FALLBACK = "Không tải được dữ liệu.";

/**
 * Build a stand-in query with just the four fields combineQueries reads.
 * @param overrides - Fields to override on the resolved-and-successful default
 * @returns A query-shaped object usable as a combineQueries input
 */
function query(overrides: Partial<CombinableQuery> = {}): CombinableQuery {
  return {
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve(null)),
    ...overrides,
  };
}

describe("combineQueries", () => {
  it("không query nào hỏng thì errorMessage rỗng", () => {
    const state = combineQueries([query(), query()], FALLBACK);

    expect(state.isError).toBe(false);
    expect(state.errorMessage).toBe("");
  });

  it("một query còn chạy thì cả nhóm còn pending", () => {
    expect(combineQueries([query(), query({ isPending: true })], FALLBACK).isPending).toBe(true);
    expect(combineQueries([query(), query()], FALLBACK).isPending).toBe(false);
  });

  it("query thứ hai hỏng vẫn lấy đúng message của nó", () => {
    const state = combineQueries(
      [query(), query({ isError: true, error: new ApiError("Tuần này đã bị khoá.", 409) })],
      FALLBACK
    );

    expect(state.isError).toBe(true);
    expect(state.errorMessage).toBe("Tuần này đã bị khoá.");
  });

  it("nhiều query cùng hỏng thì lấy cái đầu tiên theo thứ tự mảng", () => {
    const state = combineQueries(
      [
        query({ isError: true, error: new ApiError("Lỗi đầu.", 500) }),
        query({ isError: true, error: new ApiError("Lỗi sau.", 500) }),
      ],
      FALLBACK
    );

    expect(state.errorMessage).toBe("Lỗi đầu.");
  });

  it("lỗi không phải ApiError thì dùng fallbackMessage", () => {
    const state = combineQueries(
      [query({ isError: true, error: new Error("Failed to fetch") })],
      FALLBACK
    );

    expect(state.errorMessage).toBe(FALLBACK);
  });

  it("query hỏng mà không mang error thì vẫn báo lỗi, kèm câu fallback", () => {
    const state = combineQueries([query({ isError: true })], FALLBACK);

    expect(state.isError).toBe(true);
    expect(state.errorMessage).toBe(FALLBACK);
  });

  it("refetch chạm mọi query trong nhóm", () => {
    const queries = [query(), query(), query()];

    combineQueries(queries, FALLBACK).refetch();

    for (const item of queries) {
      expect(item.refetch).toHaveBeenCalledTimes(1);
    }
  });
});
```

- [x] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- query-group
```

Kết quả mong đợi: FAIL — `../query-group` không tồn tại.

- [x] **Bước 3: Cài đặt**

`apps/web/lib/query-group.ts`:

```ts
import { ApiError } from "./api-client";

/**
 * The four fields `combineQueries` reads off a TanStack query.
 * Declared here instead of `Pick<UseQueryResult, …>` so the function stays pure
 * and generic-free: any object with these fields can be combined, and a test
 * needs no QueryClient to build one.
 */
export interface CombinableQuery {
  /** True while the query has not resolved yet. */
  isPending: boolean;
  /** True once the query has failed. */
  isError: boolean;
  /** Whatever the query threw — an `ApiError` for a backend response. */
  error: unknown;
  /** Runs the query again. */
  refetch: () => Promise<unknown>;
}

/** Combined loading/error state of a group of queries. */
export interface QueryGroupState {
  /** True while any query in the group has not resolved yet. */
  isPending: boolean;
  /** True as soon as one query fails. */
  isError: boolean;
  /** Message of the first failing query — empty string when there is no error. */
  errorMessage: string;
  /** Refetches every query in the group at once. */
  refetch: () => void;
}

/**
 * Collapses a group of queries into one loading/error state.
 * The backend's Vietnamese `ApiError.message` wins; `fallbackMessage` only
 * covers failures that carry no message meant for a user (network, parsing).
 * @param queries - Queries to combine, in the order they should be blamed for an error
 * @param fallbackMessage - Vietnamese text shown when the failure is not an `ApiError`
 * @returns Combined pending/error state plus a refetch-all callback
 */
export function combineQueries(
  queries: readonly CombinableQuery[],
  fallbackMessage: string
): QueryGroupState {
  // The failing query itself, not its error: a query can report isError while
  // carrying nothing usable in `error`, and that still has to show as an error.
  const failing = queries.find((query) => query.isError);

  return {
    isPending: queries.some((query) => query.isPending),
    isError: failing !== undefined,
    errorMessage:
      failing === undefined
        ? ""
        : readErrorMessage(failing.error, fallbackMessage),
    // Refetch tất cả cùng lúc — không await tuần tự từng query.
    refetch: () => {
      void Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

/**
 * Reads a display message out of a failing query's error.
 * @param error - Error the first failing query threw
 * @param fallbackMessage - Text to use when the error is not an `ApiError`
 * @returns Backend message for an `ApiError`, the fallback otherwise
 */
function readErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof ApiError ? error.message : fallbackMessage;
}
```

- [x] **Bước 4: Chạy test cho chắc là xanh**

```bash
pnpm --filter web test -- query-group
pnpm --filter web typecheck
```

- [x] **Bước 5: Commit**

```bash
pnpm --filter web lint
git rev-parse --abbrev-ref HEAD
git add apps/web/lib
git commit -m "feat(web): add combineQueries for one query group state"
```

---

### Task 2: `useAttendanceBoard` trở thành caller

Task này **không đổi hành vi** — nó chỉ chuyển phần ruột sang hàm mới. Đó cũng là lý do nó đi trước
`useFormationWeek`: nếu suite của attendance xanh nguyên thì `combineQueries` đúng bằng bản gốc.

**Files:**
- Modify: `apps/web/features/attendance/hooks/use-attendance-board.ts`

**Interfaces:**
- Consumes: `combineQueries` (Task 1)
- `AttendanceBoardState` giữ nguyên tên và bốn field — **không** đổi thành alias của `QueryGroupState`
  (interface public của feature, doc comment của nó nói về màn điểm danh).

- [x] **Bước 1: Viết lại hook**

Bỏ `readErrorMessage` và import `ApiError` — cả hai đã sang `lib/query-group.ts`.

```ts
"use client";

import { combineQueries } from "@/lib/query-group";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useCurrentWeek,
} from "./use-attendance";

/** Shown when a query fails with something other than an `ApiError`. */
const FALLBACK_ERROR_MESSAGE = "Không tải được dữ liệu điểm danh.";

// (interface AttendanceBoardState giữ nguyên)

export function useAttendanceBoard(): AttendanceBoardState {
  const characters = useCharacters();
  const sessions = useBattleSessions();
  const records = useAttendanceRecords();
  const week = useCurrentWeek();

  return combineQueries(
    [characters, sessions, records, week],
    FALLBACK_ERROR_MESSAGE
  );
}
```

- [x] **Bước 2: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: PASS **không sửa một dòng test nào**. Nếu typecheck kêu ở lời gọi `combineQueries`
thì `CombinableQuery` đang quá chặt — sửa `CombinableQuery`, đừng ép kiểu ở chỗ gọi.

- [x] **Bước 3: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/attendance
git commit -m "refactor(web): read the attendance board state from combineQueries"
```

---

### Task 3: `useFormationWeek` — vá hai lỗi

Đây là task **đổi hành vi**, và là lý do spec tồn tại: `weeksQuery`/`charactersQuery` hỏng thì
message của backend bị vứt đi, và nút "Thử lại" không chạm `charactersQuery`.

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formation-week.ts:81-92`
- Test: `apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts`

**Interfaces:**
- `FormationWeekState` giữ nguyên bốn field và `refetchFormations` — **không gộp** `refetchFormations`
  vào `refetch`: nó là refetch có chủ đích sau khi lưu trúng trận đã khoá, khác việc của nút thử lại.

- [x] **Bước 1: Viết test đỏ**

Thêm vào cuối `describe("useFormationWeek")`:

```ts
  it("query nhân vật lỗi thì vẫn hiện thông báo của backend, không rơi về câu chung", async () => {
    fetchCharactersMock.mockRejectedValue(
      new ApiError("Phiên đăng nhập đã hết hạn.", 401)
    );

    const { result } = renderFormationHook(() => useFormationWeek());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBe("Phiên đăng nhập đã hết hạn.");
  });

  it("thử lại thì tải lại cả ba query, kể cả query nhân vật", async () => {
    const { result } = renderFormationHook(() => useFormationWeek());

    await waitFor(() => expect(result.current.isPending).toBe(false));
    const before = fetchCharactersMock.mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() =>
      expect(fetchCharactersMock.mock.calls.length).toBe(before + 1)
    );
    expect(fetchWeeksMock.mock.calls.length).toBeGreaterThan(1);
    expect(fetchFormationsMock.mock.calls.length).toBeGreaterThan(1);
  });
```

Thêm import `ApiError` từ `@/lib/api-client` ở đầu file.

Hai test sẵn có giữ nguyên: `"query đội hình lỗi thì hiện thông báo của backend"` (lỗi là `Error`
thường mang message tiếng Việt — **sẽ đổi kỳ vọng**, xem Bước 3) và `"lỗi không có thông báo riêng
thì dùng câu mặc định"` (`Error("boom")` từ `fetchCharacters` → vẫn fallback, xanh nguyên).

- [x] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter web test -- use-formation-week
```

Kết quả mong đợi: FAIL đúng hai ca mới — ca đầu ra `"Không tải được dữ liệu đội hình."`, ca sau
thấy `fetchCharacters` không được gọi lại.

- [x] **Bước 3: Sửa hook (`:81-92`)**

```ts
  const state = combineQueries(
    // formationsQuery goes first: losing it loses what this screen exists to show.
    [formationsQuery, weeksQuery, charactersQuery],
    "Không tải được dữ liệu đội hình."
  );

  return {
    weeks: weeksQuery.data ?? [],
    weekStart: weekStart ?? "",
    isEditableWeek,
    setWeek,
    isPending: state.isPending,
    isError: state.isError,
    errorMessage: state.errorMessage,
    refetch: state.refetch,
    sessions,
    characters,
    records,
    refetchFormations: () => {
      void formationsQuery.refetch();
    },
  };
```

Import `combineQueries` từ `@/lib/query-group`.

`recordsQuery` **không** vào nhóm — giữ nguyên hành vi hiện tại: điểm danh chỉ tô màu gợi ý trong
pool, thiếu nó màn vẫn dùng được, nên nó không được phép chặn cả màn bằng skeleton hay khối lỗi.

- [x] **Bước 4: Chỉnh test cũ theo hành vi mới**

Ca `"query đội hình lỗi thì hiện thông báo của backend"` đang reject bằng `new Error("Tuần này đã bị
khoá.")` và trước đây message đó lọt qua vì hook đọc thẳng `error.message`. Luật mới chỉ tin
`ApiError` — nên đổi fixture cho khớp thứ `apiFetch` thật ném ra:

```ts
    fetchFormationsMock.mockRejectedValue(new ApiError("Tuần này đã bị khoá.", 409));
```

Kỳ vọng giữ nguyên. **Đây là thay đổi test có chủ ý** và phải ghi vào commit message: hành vi mới là
"chỉ `ApiError` mới được hiển thị nguyên văn", đúng `architecture.md` §4.2 — một `Error` tiếng Anh
của trình duyệt không được rơi ra màn hình.

- [x] **Bước 5: Chạy test cho chắc là xanh**

```bash
pnpm --filter web test -- use-formation-week
pnpm --filter web typecheck
pnpm --filter web lint
```

- [x] **Bước 6: Kiểm chứng không có chỗ nào đọc `errorMessage` khi không lỗi**

```bash
grep -rn "errorMessage" apps/web/features/team-builder --include="*.tsx"
```

Kết quả mong đợi: chỉ `team-builder-screen.tsx:63` (nằm trong nhánh `if (screen.week.isError)`) và
`formation-toolbar.tsx` (message của mutation lưu, không liên quan). Trước đây `errorMessage` luôn
khác rỗng; nay nó rỗng khi không lỗi, nên chỗ nào render nó ngoài nhánh `isError` sẽ hiện chuỗi rỗng.

- [x] **Bước 7: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/team-builder
git commit -m "fix(web): show every failing formation query and retry all of them

useFormationWeek combined three queries by hand: errorMessage only ever read
formationsQuery, so a failing weeks or characters query showed the generic
sentence instead of the backend's Vietnamese message, and retry never touched
charactersQuery — pressing it did nothing when that was the query that failed.
Both now come from combineQueries. The formation-error test moves from Error to
ApiError, because only an ApiError message is meant for a user's eyes."
```

---

### Task 4: `QueryBoundary` — thứ tự branch nói một lần

**Files:**
- Create: `apps/web/components/shared/query-boundary.tsx`

**Interfaces:**
- Produces: `QueryBoundary({ state, skeleton, children })`
- Consumes: `QueryGroupState` (Task 1), `ErrorState` (sẵn có)

- [x] **Bước 1: Cài đặt**

```tsx
"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";
import type { QueryGroupState } from "@/lib/query-group";

interface QueryBoundaryProps {
  /** Combined state of the queries the content needs. */
  state: QueryGroupState;
  /** Placeholder shown while the group is still loading. */
  skeleton: ReactNode;
  /** Content rendered once every query has resolved. */
  children: ReactNode;
}

/**
 * Renders content once a query group is ready, and the error block or the
 * skeleton until then. The order is fixed — error first, loading second — so a
 * group where one query failed while another is still running shows the failure
 * instead of a skeleton that would never finish.
 *
 * Presentational shell only: it does not wrap the branches in a Card, because
 * each screen puts its own chrome around them.
 * @param state - Combined state of the group, from `combineQueries`
 * @param skeleton - Placeholder for the loading branch
 * @param children - Content for the resolved branch
 * @returns One of the three branches
 */
export function QueryBoundary({ state, skeleton, children }: QueryBoundaryProps) {
  if (state.isError) {
    return <ErrorState message={state.errorMessage} onRetry={state.refetch} />;
  }

  if (state.isPending) return skeleton;

  return children;
}
```

- [x] **Bước 2: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

Không có test riêng: component thuần trình bày, ba nhánh đọc thẳng từ `state`, và repo không có
component test (`frontend.md` §8). Luật gộp — phần có thể sai — đã có test ở Task 1.

- [x] **Bước 3: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/components/shared/query-boundary.tsx
git commit -m "feat(web): add QueryBoundary for the error-then-loading branch order"
```

---

### Task 5: `members-panel` dùng `combineQueries` + `QueryBoundary`

Màn một query — không có lỗi nào để vá, chỉ bớt hai nhánh viết tay và làm `QueryBoundary` có người
dùng thứ nhất.

**Files:**
- Modify: `apps/web/features/members/components/members-panel.tsx:60-81`
- Create: `apps/web/features/members/components/members-skeleton.tsx`

- [x] **Bước 1: Tách skeleton ra file riêng**

`members-skeleton.tsx` — bê nguyên khối JSX ở `:69-81` và hằng `SKELETON_ROWS` (`:28-29`, kèm
comment tiếng Việt của nó, nguyên văn):

```tsx
/**
 * Placeholder rows shown while the member list loads.
 * @returns Skeleton block matching the table's shape
 */
export function MembersSkeleton() { … }
```

- [x] **Bước 2: Đổi `members-panel.tsx`**

Bỏ hai nhánh early-return, bọc phần thân bằng `QueryBoundary`:

```tsx
  const state = combineQueries(
    [membersQuery],
    "Không tải được danh sách thành viên."
  );

  return (
    <QueryBoundary state={state} skeleton={<MembersSkeleton />}>
      <div className="flex flex-col gap-4">
        … (thân hiện tại, không đổi)
      </div>
    </QueryBoundary>
  );
```

`allMembers`, phép lọc và `useTablePagination` (`:44-58`) **giữ nguyên chỗ cũ** — hook không được
nằm sau một early-return, và `?? []` ở `:45` đã lo cho lượt render đang pending.

- [x] **Bước 3: Kiểm tra**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

- [ ] **Bước 4: Kiểm tay** *(chưa chạy — cần người dùng mở trình duyệt)*

```bash
pnpm --filter web dev
```

Mở trang Thành viên: thấy skeleton rồi thấy bảng. Tắt mạng trong DevTools rồi bấm Thử lại: thấy khối
lỗi, bấm lại khi có mạng thì bảng hiện ra.

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/members
git commit -m "refactor(web): branch the members panel through QueryBoundary"
```

---

### Task 6: `settings-screen` dùng `combineQueries` + `QueryBoundary`

**Files:**
- Modify: `apps/web/features/settings/components/settings-screen.tsx:35-62`
- Create: `apps/web/features/settings/components/settings-skeleton.tsx`

- [x] **Bước 1: Tách skeleton ra file riêng**

`settings-skeleton.tsx`, bê nguyên khối `:53-61` (phần bên trong `CardContent`) và hằng
`SKELETON_ROWS` kèm comment.

- [x] **Bước 2: Đổi `settings-screen.tsx`**

```tsx
  const state = combineQueries(
    [weeksQuery, sessionsQuery],
    "Không tải được lịch đánh."
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <QueryBoundary state={state} skeleton={<SettingsSkeleton />}>
          {weekStart !== null && (
            <>
              … (phần thân hiện tại từ <div> tiêu đề tới <SessionList />)
              <SessionList sessions={sessionsQuery.data ?? []} … />
            </>
          )}
        </QueryBoundary>
      </CardContent>

      <SessionFormDialog … />
      <DeleteSessionDialog … />
    </Card>
  );
```

Ba điểm phải giữ đúng:

- **`weekStart === null` ở ngoài `isPending`.** Nó là "chưa chọn tuần", không phải trạng thái query
  (spec, mục Edge case). Ở đây nó thành một điều kiện bên trong nhánh nội dung, và cũng chính nó
  narrow `weekStart` về `string` cho `WeekSelector`.
- **`sessionsQuery.data ?? []`.** Children của `QueryBoundary` được dựng cả khi nhánh pending đang
  hiển thị, nên narrowing theo `isPending` không còn. `?? []` ở đúng một chỗ, ngay biên query — không
  phải một fallback rải sâu trong code.
- **Hai dialog ra ngoài `QueryBoundary`,** như hiện tại: chúng nằm ngoài `CardContent` và tự render
  null khi đóng.

- [x] **Bước 3: Kiểm tra `useWeekSessions` không làm kẹt skeleton**

`useWeekSessions` có `enabled: weekStart !== null` — TanStack giữ `isPending` = true mãi cho query bị
tắt (spec, Edge case cuối). Ở màn này điều đó **không đổi gì**: hôm nay `weekStart === null` cũng
đang cho skeleton ở `:51`. Không đụng tới `isLoading`.

Xác nhận `useFormations` của team-builder **không** có `enabled` (`features/team-builder/hooks/use-formations.ts`)
nên Task 3 không dính vào bẫy này:

```bash
grep -rn "enabled" apps/web/features --include="*.ts"
```

Kết quả mong đợi: chỉ `use-week-sessions.ts`.

- [x] **Bước 4: Kiểm tra và kiểm tay**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Mở trang Thiết lập: skeleton → nội dung; đổi tuần vẫn tải lại danh sách trận. *(phần kiểm tay trên
trình duyệt chưa chạy — cần người dùng.)*

- [x] **Bước 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/features/settings
git commit -m "refactor(web): branch the settings screen through QueryBoundary"
```

---

### Task 7: Tài liệu và rà soát cuối

**Files:**
- Modify: `apps/web/docs/frontend.md` §5

- [x] **Bước 1: Ghi quy ước vào `frontend.md` §5**

Thêm một mục ngắn: nhóm query của một màn đi qua `combineQueries` (`lib/query-group.ts`), thứ tự
branch là **lỗi → tải → nội dung** và `QueryBoundary` là chỗ nói thứ tự đó; câu fallback thuộc về
từng màn, còn `ApiError.message` luôn thắng. Nói kèm tiêu chí ở "chốt khác spec" §3: màn nào cần
narrowing thì giữ early-return và chỉ dùng `combineQueries`.

- [x] **Bước 2: Rà không còn bản dựng tay nào**

```bash
grep -rn "isPending ||\|isError ||" apps/web/features apps/web/components --include="*.ts*"
grep -rn "error?.message" apps/web/features --include="*.ts*"
```

Kết quả mong đợi: lệnh 1 chỉ còn các nhánh `isPending || !week` / `isPending || !data` kiểu narrowing
(`week-timeline.tsx`) — **không** còn dòng nào gộp hai query. Lệnh 2 không ra dòng nào trong
`use-formation-week.ts`.

- [x] **Bước 3: Kiểm tra toàn bộ**

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Kết quả mong đợi: cả ba sạch. Dán số file/số test vào phần báo cáo — không tuyên bố "xong" khi chưa
nhìn thấy output.

- [x] **Bước 4: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/web/docs/frontend.md
git commit -m "docs(web): document the query group convention"
```

- [x] **Bước 5: Review và báo cáo**

Chạy `/code-review` trên nhánh, sửa những gì đáng sửa, rồi tóm tắt cho người dùng: các commit đã tạo,
output của `pnpm --filter web test`, hai lỗi đã vá ở `useFormationWeek`, và ba điểm kế hoạch chốt
khác spec.

---

## Ngoài phạm vi (theo spec)

- Suspense / `useSuspenseQuery` — đổi mô hình tải dữ liệu cả app, việc riêng.
- Gom skeleton của bốn màn về một component: chúng khác hình thật (bảng, lưới, danh sách).
- Đổi ba component của `attendance` sang `QueryBoundary` — hành vi của chúng vốn đã đúng, và phần
  nội dung của chúng dựa vào narrowing (xem "chốt khác spec" §3).
