# W3 — Gộp query thành một module, thay vì bốn bản dựng tay

Ngày: 2026-08-21 · Phạm vi: `apps/web`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
**Nên làm trước** các spec web khác: nó vá một lỗi đang thấy được trên màn hình, và diff nhỏ nhất.

## Bối cảnh

`useAttendanceBoard` đã định nghĩa đúng hình dạng cần có, kèm tài liệu:

```ts
// features/attendance/hooks/use-attendance-board.ts:11-24
/** Shown when a query fails with something other than an `ApiError`. */
const FALLBACK_ERROR_MESSAGE = "Không tải được dữ liệu điểm danh.";

/** Combined loading/error state of every query the attendance screens depend on. */
export interface AttendanceBoardState {
  isPending: boolean;
  isError: boolean;
  /** Message of the first failing query — empty string when there is no error. */
  errorMessage: string;
  refetch: () => void;
}
```

```ts
// :36-39
const queries = [characters, sessions, records, week];
const firstError = queries.find((query) => query.isError)?.error ?? null;
```

Ba màn còn lại dựng lại hình dạng đó bằng tay, và **bản dựng lại có lỗi**:

```ts
// features/team-builder/hooks/use-formation-week.ts:76-99
return {
  …
  isPending:
    weeksQuery.isPending || formationsQuery.isPending || charactersQuery.isPending,
  isError:
    weeksQuery.isError || formationsQuery.isError || charactersQuery.isError,
  errorMessage:
    formationsQuery.error?.message ?? "Không tải được dữ liệu đội hình.",   // ← chỉ đọc 1/3 query
  refetch: () => {
    void weeksQuery.refetch();
    void formationsQuery.refetch();                                        // ← thiếu charactersQuery
  },
```

Hai lỗi thật, cạnh nhau:

- `weeksQuery` hoặc `charactersQuery` hỏng → `isError` bật, nhưng `errorMessage` rơi về câu chung
  chung. **Message tiếng Việt của backend bị vứt đi** — đúng thứ `architecture.md` §4.2 yêu cầu hiển
  thị nguyên văn (*"Errors arrive as `ApiError` with the backend's Vietnamese `message`; render it
  as-is"*).
- Nút "Thử lại" không refetch `charactersQuery`. Nếu chính query đó hỏng, bấm thử lại **không làm
  gì**.

Đây là lỗi nằm ở phần *wiring*, trong khi 13/13 module `lib/` của team-builder đều có test — đúng
nghịch lý mà [C4](./2026-08-18-c4-formation-screen-design.md) đã chỉ ra ở một chỗ khác.

Hai màn còn lại branch thẳng trong component:

```ts
// features/settings/components/settings-screen.tsx:35-48
if (weeksQuery.isError || sessionsQuery.isError) {
  return (<Card><CardContent><ErrorState
    message="Không tải được lịch đánh."
    onRetry={() => { void weeksQuery.refetch(); void sessionsQuery.refetch(); }}
  /></CardContent></Card>);
}
if (weeksQuery.isPending || sessionsQuery.isPending || weekStart === null) { … }
```

```ts
// features/members/components/members-panel.tsx:60-80
if (membersQuery.isError) { … message="Không tải được danh sách thành viên." … }
if (membersQuery.isPending) { … }
```

Bốn nơi · bốn câu fallback · ba cách gộp `isPending` · hai nơi bỏ qua `ApiError.message`.

## Quyết định thiết kế

### 1. `combineQueries` — một hàm thuần trên mảng query

```ts
// lib/query-group.ts

/** Bốn field `combineQueries` đọc từ một query của TanStack. */
export interface CombinableQuery {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/** Trạng thái tải/lỗi gộp của một nhóm query. */
export interface QueryGroupState {
  isPending: boolean;
  isError: boolean;
  /** Message của query hỏng đầu tiên; rỗng khi không lỗi. */
  errorMessage: string;
  /** Refetch mọi query trong nhóm. */
  refetch: () => void;
}

/**
 * Gộp nhiều query thành một trạng thái duy nhất.
 * Ưu tiên message của ApiError; chỉ dùng fallbackMessage khi lỗi không phải ApiError.
 * @param queries - Các query cần gộp, theo thứ tự ưu tiên khi báo lỗi
 * @param fallbackMessage - Câu hiển thị khi lỗi không mang message
 * @returns Trạng thái gộp kèm refetch-all
 */
export function combineQueries(
  queries: readonly CombinableQuery[],
  fallbackMessage: string,
): QueryGroupState;
```

Ba luật được nói **một lần** ở đây: gộp `isPending` bằng `some`, lấy lỗi của query hỏng **đầu tiên**,
refetch **tất cả**. `useAttendanceBoard` trở thành một caller ba dòng.

Đặt ở `lib/` chứ không `hooks/`: `combineQueries` **không phải hook** — nó không gọi hook nào bên
trong, và `architecture.md:222` dành `hooks/` cho cross-feature hooks.

Nhận một interface riêng (`CombinableQuery`) chứ không `Pick<UseQueryResult, …>`: `UseQueryResult`
mặc định generic `<unknown, Error>` và `refetch` của nó trả `Promise<QueryObserverResult<…>>`, buộc
mọi caller phải khớp generic. Khai báo `error: unknown` và `refetch: () => Promise<unknown>` giữ
đúng lời hứa "hàm thuần, test không phải dựng `QueryClient`", và bất kỳ object nào có bốn field đó
đều truyền vào được.

### 2. `QueryBoundary` — thứ tự branch nói một lần

```tsx
/**
 * Render nội dung khi nhóm query đã sẵn sàng; nếu không thì render lỗi hoặc skeleton.
 * Thứ tự cố định: lỗi → đang tải → nội dung.
 */
export function QueryBoundary({ state, skeleton, children }: {
  state: QueryGroupState;
  skeleton: ReactNode;
  children: ReactNode;
}): ReactNode;
```

Đặt ở `components/shared/` theo `architecture.md` §7 (*"A component used by two or more features →
`components/shared/`"*). Nó bọc `ErrorState` đã có sẵn.

Vì sao thứ tự là **lỗi trước, tải sau**: một query hỏng trong khi query khác còn đang chạy thì người
dùng cần thấy lỗi, không phải skeleton quay mãi. Cả bốn màn hiện tại đều đã làm vậy — spec chỉ khoá
lại quy ước đó.

### 3. Fallback message giữ theo từng màn

`combineQueries(queries, "Không tải được dữ liệu đội hình.")` — câu vẫn của từng màn, chỉ luật là
chung. Không gom về một câu duy nhất: bốn câu hiện tại nói đúng thứ đang hỏng và đó là thông tin có
ích.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `lib/query-group.ts` (mới) | `CombinableQuery`, `QueryGroupState`, `combineQueries` |
| `lib/__tests__/query-group.test.ts` (mới) | test bảng cho `combineQueries` |
| `components/shared/query-boundary.tsx` (mới) | `QueryBoundary` |
| `features/attendance/hooks/use-attendance-board.ts` | dùng `combineQueries`; interface public không đổi |
| `features/team-builder/hooks/use-formation-week.ts:76-99` | dùng `combineQueries([formationsQuery, weeksQuery, charactersQuery], …)` — **sửa cả hai lỗi** |
| `features/settings/components/settings-screen.tsx:35-58` | `combineQueries` + `QueryBoundary`, skeleton tách ra `settings-skeleton.tsx` |
| `features/members/components/members-panel.tsx:60-80` | như trên, skeleton tách ra `members-skeleton.tsx` |
| `apps/web/docs/frontend.md` §5 | ghi lại quy ước nhóm query |

**Khi nào dùng `QueryBoundary`:** khi phần nội dung **không cần** TypeScript narrowing từ nhánh
`isPending` — children của nó vẫn được dựng trong lượt render đang pending, nên dữ liệu đọc qua
`?? []` ngay tại biên query (`members-panel`, `settings-screen`). Màn nào có nội dung dựa vào
narrowing đó thì giữ early-return và chỉ dùng `combineQueries` (`team-builder-screen`, ba component
của `attendance`) — đổi chúng sẽ kéo `?? []` rải khắp component.

`useFormationWeek` vẫn phải giữ `refetchFormations` riêng (`:96-98`) — đó là refetch có chủ đích sau
khi lưu đội hình, khác với refetch-all của nút thử lại. Không gộp hai thứ đó.

## Edge case

- **`weekStart === null` ở `settings-screen.tsx:52`** không phải trạng thái query — nó là "chưa chọn
  tuần". Giữ nguyên như một điều kiện riêng bên ngoài `QueryBoundary`, đừng nhét vào `isPending`.
- **Lỗi không phải `ApiError`** (mất mạng, lỗi parse): `error.message` vẫn có nhưng là tiếng Anh của
  trình duyệt. Đây là lý do `fallbackMessage` tồn tại — `combineQueries` chỉ đọc `message` khi lỗi
  là `ApiError`, đúng như `useAttendanceBoard` đang làm.
- **Nhiều query cùng hỏng**: lấy cái đầu tiên theo thứ tự mảng. Nên đặt query "quan trọng nhất" của
  màn lên trước — với team-builder là `formationsQuery`, giữ nguyên ưu tiên hiện tại.
- **`isPending` với query bị `enabled: false`**: TanStack cho `isPending` = true mãi. Đã rà lại —
  chỉ `features/settings/hooks/use-week-sessions.ts` có `enabled`, và ở màn Thiết lập điều đó không
  đổi gì (hôm nay `weekStart === null` cũng đang cho skeleton). `useFormations` của team-builder
  **không** có `enabled`, nên `use-formation-week` không dính bẫy này và không cần `isLoading`.
- **`recordsQuery` không vào nhóm của `use-formation-week`** — giữ nguyên hành vi hiện tại: điểm
  danh chỉ tô màu gợi ý trong pool, thiếu nó màn vẫn dùng được, nên nó không được phép chặn cả màn
  bằng skeleton hay khối lỗi.
- **`weekStart === null` ở màn Thiết lập** nằm bên trong nhánh nội dung của `QueryBoundary` (nó cũng
  chính là chỗ narrow `weekStart` về `string` cho `WeekSelector`), không nhét vào `isPending`.

## Kiểm thử

- `combineQueries` là hàm thuần → test bảng, không cần `QueryClient`:
  - không query nào hỏng → `errorMessage` rỗng
  - query thứ hai hỏng với `ApiError` → lấy đúng message của nó (**ca vá lỗi hiện tại**)
  - query hỏng với `Error` thường → `fallbackMessage`
  - `refetch()` gọi đủ **tất cả** query (ca vá lỗi thứ hai)
- `use-formation-week.test.ts` (đã có): thêm ca `charactersQuery` hỏng → message của nó hiện ra, và
  `refetch` chạm cả ba. Ca `"query đội hình lỗi thì hiện thông báo của backend"` đổi fixture từ
  `Error` sang `ApiError` — **thay đổi test có chủ ý**: luật mới là chỉ `ApiError.message` mới được
  hiển thị nguyên văn, một `Error` tiếng Anh của trình duyệt không được rơi ra màn hình
  (`architecture.md` §4.2).
- `use-attendance-board` không đổi hành vi → test hiện có phải xanh nguyên.

## Rủi ro

- **Diff chạm bốn feature.** Làm `combineQueries` + `useAttendanceBoard` trước (không đổi hành vi),
  chạy test, rồi mới chuyển từng màn.
- **`QueryBoundary` dễ bị dùng quá tay** cho những chỗ chỉ có một query và skeleton riêng. Không bắt
  buộc dùng nó; `combineQueries` mới là phần chính.

## Ngoài phạm vi

- Suspense / `useSuspenseQuery` — đổi mô hình tải dữ liệu cả app, việc riêng.
- Gom skeleton của bốn màn về một component: chúng khác hình thật (bảng, lưới, danh sách).
