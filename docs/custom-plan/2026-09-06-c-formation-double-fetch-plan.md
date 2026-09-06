# C — `/xep-team` chỉ tải đội hình một lần — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans để chạy plan theo từng task. Các bước dùng checkbox (`- [ ]`) để theo dõi.

**Goal:** Mở `/xep-team` phát đúng **một** request đội hình thay vì hai. Không endpoint nào, không schema nào, không luật nghiệp vụ nào đổi.

**Architecture:** Thay đổi nằm gọn trong `useFormationWeek` — module vốn đã là chỗ duy nhất quyết định tuần nào đang trên màn hình. Nó truyền `enabled` cho `useFormations`, tham số đã có sẵn từ đầu mà chưa call site nào dùng. Không đụng key factory, không đụng `useFormations`, không thêm endpoint.

**Tech Stack:** Next.js 16 + TanStack Query + Zustand (`apps/web`, Vitest + jsdom). Không chạm `apps/api`, không chạm `packages/shared`.

**Spec:** [`docs/custom-spec/2026-09-06-c-formation-double-fetch-design.md`](../custom-spec/2026-09-06-c-formation-double-fetch-design.md) · Tổng quan: [`2026-09-06-architecture-review-3-overview.md`](../custom-spec/2026-09-06-architecture-review-3-overview.md)

## Điều kiện `enabled` là gì — chốt trước khi viết code

Spec §"Behaviour giữ nguyên" nêu ba nhánh, và nhánh thứ ba loại bỏ cách viết hiển nhiên:

| Điều kiện | Tuần rỗng thì sao |
|---|---|
| `weekStart !== undefined` | `findActiveWeekStart([])` trả `null` → `weekStart` mãi `undefined` → query **đứng yên vĩnh viễn**, màn hình kẹt skeleton |
| `weeksQuery.isSuccess` | Danh sách về (kể cả rỗng) → query chạy với khoá `"current"` → trả mảng rỗng → màn hình trống đúng như hôm nay |

**Chọn `weeksQuery.isSuccess`.** Câu hỏi đúng là "danh sách tuần đã về chưa", không phải "đã có weekStart chưa" — chính câu cuối của spec nói vậy.

Ba trạng thái sau khi đổi:

```
weeksQuery pending  → formations park, isPending = true  → skeleton (như cũ)
weeksQuery success  → formations chạy đúng một lần với tuần đã chốt
weeksQuery error    → formations park mãi (isPending = true), nhưng isError = true
                      → QueryBoundary kiểm error TRƯỚC pending → hiện lỗi, không kẹt skeleton
```

Nhánh thứ ba là chỗ dễ hỏng nhất và nó **đã** an toàn sẵn: `QueryBoundary` (`components/shared/query-boundary.tsx`) cố tình xét `isError` trước `isPending`, JSDoc của nó ghi đúng lý do đó. Plan này chỉ cần một test chốt lại điều ấy, vì nếu ai đó đảo thứ tự trong `QueryBoundary` thì màn hình `/xep-team` kẹt skeleton vĩnh viễn và không test nào hôm nay bắt được.

## Global Constraints

- **Không đổi behaviour business.** Mọi câu tiếng Việt giữ nguyên từng chữ. Một test đang xanh mà phải sửa kỳ vọng là dấu hiệu đã đi quá phạm vi — dừng lại và đọc lại spec.
- **Không thêm dependency, không thêm file mới** ngoài file test đã liệt kê.
- Comment, JSDoc, tên biến: **tiếng Anh**. Chuỗi hiển thị: **tiếng Việt**.
- **TDD**: mỗi thay đổi bắt đầu bằng một test đỏ, xem nó đỏ đúng lý do, rồi mới viết code.
- Nhánh git: `perf/park-formations-until-week-known`. Mỗi task một commit riêng.
- Lệnh kiểm mỗi task: `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

---

### Task 1: Chốt số lần tải bằng một test đỏ

**Files:**
- Modify: `apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts`

- [x] **Step 1: Test "mở màn hình chỉ tải đội hình một lần"**

Đây là test mang toàn bộ giá trị của plan. Nó phải đỏ trước khi có dòng code nào.

```ts
it("mở màn hình chỉ tải đội hình đúng một lần", async () => {
  const { result } = renderFormationHook(() => useFormationWeek());

  await waitFor(() => expect(result.current.isPending).toBe(false));

  // Hôm nay là hai: một lượt với `undefined` khi chưa biết tuần, rồi một lượt
  // nữa với chính tuần đó ngay khi danh sách tuần về.
  expect(fetchFormationsMock).toHaveBeenCalledTimes(1);
  expect(fetchFormationsMock).toHaveBeenCalledWith(OPEN_WEEK);
});
```

- [x] **Step 2: Xem nó đỏ đúng lý do**

```bash
pnpm --filter web test -- use-formation-week
```

Kỳ vọng: `expected 1, received 2`, và lượt gọi đầu là `undefined`. Nếu đỏ vì lý do khác (mock, timing) thì sửa test trước, đừng đụng code.

- [x] **Step 3: Commit test đỏ chung với code ở Task 2** — không commit riêng một test đang đỏ.

---

### Task 2: Park query cho tới khi danh sách tuần về

**Files:**
- Modify: `apps/web/features/team-builder/hooks/use-formation-week.ts`

**Interfaces:** `FormationWeekState` **không đổi một chữ**. `useFormations` **không đổi** — tham số `enabled` đã có sẵn.

- [x] **Step 1: Truyền `enabled`**

`use-formation-week.ts:57`. Trước:

```ts
const formationsQuery = useFormations(weekStart);
```

Sau:

```ts
// Parked until the week list lands. Until then `weekStart` is undefined, which the key factory
// maps to "current" — a perfectly valid key, so the query would fetch the open week, then fetch
// the very same payload again under the date key the moment the list arrives.
// The condition is "the list arrived", not "weekStart is set": an empty list leaves `weekStart`
// undefined forever, and this query must still run and come back empty.
const formationsQuery = useFormations(weekStart, weeksQuery.isSuccess);
```

- [x] **Step 2: Xem test Task 1 xanh**

```bash
pnpm --filter web test -- use-formation-week
```

Cả file phải xanh, không riêng test mới. Đặc biệt hai test cũ này phải giữ nguyên kỳ vọng:
- `"tải xong thì hết pending và mang theo dữ liệu của tuần"` — `isPending` vẫn `true` ở lần render đầu.
- `"đổi tuần thì tải lại đội hình của tuần đó"` — `setWeek` vẫn chạy query ngay.

Nếu phải sửa kỳ vọng của một trong hai, dừng lại: đã đổi behaviour.

- [x] **Step 3: Kiểm và commit**

```bash
pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web lint
git commit -am "perf(web): load a formation week once instead of twice"
```

---

### Task 3: Chốt ba nhánh trạng thái spec đã cảnh báo

**Files:**
- Modify: `apps/web/features/team-builder/hooks/__tests__/use-formation-week.test.ts`

Ba test này không đo hiệu năng, chúng chặn đúng ba cách thay đổi này có thể làm hỏng màn hình.

- [x] **Step 1: Danh sách tuần rỗng thì màn hình trống, không kẹt loading**

```ts
it("không tuần nào có dữ liệu thì màn hình trống, không kẹt loading", async () => {
  fetchWeeksMock.mockResolvedValue([]);
  fetchFormationsMock.mockResolvedValue([]);

  const { result } = renderFormationHook(() => useFormationWeek());

  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.sessions).toEqual([]);
  expect(fetchFormationsMock).toHaveBeenCalledWith(undefined);
});
```

Đây là nhánh mà cách viết `enabled: weekStart !== undefined` sẽ treo vĩnh viễn.

- [x] **Step 2: Query tuần lỗi thì hiện lỗi, không phải skeleton**

```ts
it("query tuần lỗi thì báo lỗi chứ không kẹt skeleton", async () => {
  fetchWeeksMock.mockRejectedValue(new ApiError("Phiên đăng nhập đã hết hạn.", 401));

  const { result } = renderFormationHook(() => useFormationWeek());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.errorMessage).toBe("Phiên đăng nhập đã hết hạn.");
  expect(fetchFormationsMock).not.toHaveBeenCalled();
});
```

`isPending` ở đây **vẫn `true`** (query bị park không bao giờ resolve) — đừng khẳng định nó `false`. Thứ bảo vệ màn hình là thứ tự trong `QueryBoundary`, và test kế tiếp mới là chỗ chốt điều đó.

- [x] **Step 3: `QueryBoundary` xét lỗi trước loading**

Thêm vào `apps/web/components/shared/__tests__/query-boundary.test.tsx` nếu file đã có; nếu chưa, tạo file đó với đúng test này.

```tsx
it("vừa lỗi vừa đang tải thì hiện lỗi, không hiện skeleton", () => {
  render(
    <QueryBoundary
      state={{ isPending: true, isError: true, errorMessage: "Hỏng rồi.", refetch: () => {} }}
      skeleton={<div>skeleton</div>}
    >
      <div>content</div>
    </QueryBoundary>
  );

  expect(screen.getByText("Hỏng rồi.")).toBeInTheDocument();
  expect(screen.queryByText("skeleton")).not.toBeInTheDocument();
});
```

Kiểm trước xem file test đã tồn tại chưa và `@testing-library/jest-dom` có sẵn không; nếu không, khẳng định bằng `expect(screen.queryByText("skeleton")).toBeNull()` thay vì matcher của jest-dom.

- [x] **Step 4: Kiểm và commit**

```bash
pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web lint
git commit -am "test(web): pin the loading and error branches of a parked formations query"
```

---

### Task 4: Chốt lại

- [x] **Step 1: Chạy full**

```bash
pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build
```

- [x] **Step 2: Đối chiếu spec với code, trả lời bằng code chứ không bằng trí nhớ**

1. Mở `/xep-team` phát mấy request `formations`?
2. Danh sách tuần rỗng thì màn hình ra gì?
3. `refetchFormations` gọi lúc query đang park thì sao — có call site nào gọi nó sớm như vậy không?

Câu 3 là rủi ro spec đã nêu. Nếu hôm nay không có call site nào như vậy thì ghi nhận và đi tiếp; **không** thêm phòng thủ cho một trường hợp chưa tồn tại.

- [x] **Step 3: Sửa spec nếu code khác spec**

Chỗ nào code khác spec thì sửa spec trước rồi mới đi tiếp. Riêng điều kiện `enabled` thì spec §"Quyết định" điểm 1 viết `enabled: weekStart !== undefined`, còn §"Behaviour giữ nguyên" lại nói điều kiện đúng là "danh sách tuần đã về". Hai chỗ này mâu thuẫn nhau trong chính spec — **sửa điểm 1 cho khớp với cái đã implement**.

- [x] **Step 4: Không đụng `docs/architecture.md` và `apps/web/docs/frontend.md`**

Không có convention mới nào được thêm: `enabled` là API sẵn có của TanStack Query, dùng đúng chỗ nó sinh ra để dùng.

## Lệch so với plan khi thực thi

**`clearMocks: true` trong `apps/web/vitest.config.ts`.** Test đầu tiên của Task 1 đỏ ở con số **4**
chứ không phải 2: `mock.calls` không được xoá giữa các test, nên `toHaveBeenCalledTimes` đang đếm cả
lượt gọi của test trước. Không có nó thì test chốt số lần tải là vô nghĩa. Chỉ `mock.calls` bị xoá,
implementation đặt trong `beforeEach` vẫn còn, và cả 557 test còn lại vẫn xanh.

**Hai test "xanh ngay" đã được kiểm bằng cách bẻ code.** Test tuần rỗng và test thứ tự nhánh của
`QueryBoundary` không đỏ trước khi sửa vì chúng canh nhánh mà code cũ vô tình đi đúng. Đã dựng lại
đúng lỗi mà spec cảnh báo — đổi `enabled` thành `weekStart !== undefined`, và đảo hai nhánh trong
`QueryBoundary` — xem cả hai đỏ, rồi trả code về.

**Một lỗ hổng plan không thấy, review bắt được.** Ba trạng thái ở bảng đầu plan là ba trạng thái
*tĩnh*; không dòng nào xét chuyện người dùng **bấm "Thử lại"** lúc query tuần đang lỗi. `refetch()`
của TanStack bỏ qua `enabled`, còn `combineQueries.refetch` thì refetch cả nhóm, nên đường đó tái
hiện đúng double fetch này sinh ra để chặn. Đã tái hiện bằng test rồi mới sửa: query đội hình vào
nhóm dưới dạng một `CombinableQuery` có `refetch` tự bỏ qua khi đang park.

## Những gì plan này cố ý KHÔNG làm

- **Không** đụng `teamBuilderKeys.formations`. Nhánh `"current"` vẫn đúng cho người gọi thật sự muốn "tuần đang mở mà không cần biết là tuần nào".
- **Không** gộp hai request thành một endpoint mới. Đó là thêm interface để chữa một chỗ gọi sai thời điểm.
- **Không** thêm phòng thủ cho `refetchFormations` gọi sớm — chưa có call site nào làm vậy.
- **Không** chạm D, E, F. Ba mục riêng, spec riêng, PR riêng.
