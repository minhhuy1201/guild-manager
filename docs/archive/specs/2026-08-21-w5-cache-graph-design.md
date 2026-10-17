# W5 — Đồ thị phụ thuộc cache thành dữ liệu, không phải ba danh sách chép tay

Ngày: 2026-08-21 · Phạm vi: `apps/web`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Độc lập với các spec web khác.

## Bối cảnh

"Sửa dữ liệu X thì màn nào cũ đi" là một luật domain. Hiện nó được nêu ba lần, ở ba feature khác
nhau.

```ts
// features/members/hooks/use-member-mutations.ts:21-40
/**
 * Làm mới mọi màn phụ thuộc danh sách thành viên sau khi thêm/sửa/xoá.
 * Bảng điểm danh và trang Xếp team đều liệt kê nhân vật, thiếu chỗ nào là
 * các màn lệch nhau cho tới lần tải lại trang.
 */
function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.characters() });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    void queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
  };
}
```

```ts
// features/settings/hooks/use-session-mutations.ts:32-40
function useInvalidateSchedule() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.sessions() });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    void queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
  };
}
```

```ts
// features/attendance/hooks/use-deadline-refresh.ts:25-30  — người thứ ba biết cặp sessions+records
void queryClient.invalidateQueries({ queryKey: attendanceKeys.sessions() });
void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
```

Doc comment ở cả hai hook đầu mô tả **hậu quả** rất rõ ("thiếu chỗ nào là các màn lệch nhau") — tác
giả biết đây là luật, không phải chi tiết kỹ thuật. Nhưng luật đó không có chỗ ở.

Hệ quả ở seam: `features/attendance/index.ts` và `features/team-builder/index.ts` phải export
`attendanceKeys` / `teamBuilderKeys` **chỉ để hai file ở feature khác đọc**. Key factory — thứ mô tả
cách một feature tổ chức cache của chính nó — lọt ra khỏi feature sở hữu nó.

Dấu hiệu đồ thị đã lệch khỏi thực tế: `attendanceKeys.weeks()`
(`features/attendance/api/attendance-api.ts`) **không có call site nào**.

Thêm một feature thứ sáu đọc danh sách nhân vật nghĩa là đi sửa `use-member-mutations.ts` **và**
`use-session-mutations.ts` — đúng loại thay đổi mà một module sâu phải chặn lại.

## Quyết định thiết kế

### 1. Đồ thị là dữ liệu, khai ở một chỗ

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

Đồ thị là dữ liệu thuần (không React) nên ở `lib/cache-graph.ts`; hook đọc nó ở
`hooks/use-invalidate.ts` — đúng chỗ `frontend.md` §2 dành cho cross-feature hook, và đúng luật
một-hook-một-file.

Feature ghi chỉ nói **mình vừa đổi cái gì**; nó không liệt kê ai bị ảnh hưởng nữa.

### 2. `lib/cache-graph.ts` là chỗ duy nhất được import key của feature khác

Đây là đánh đổi trung tâm của spec, nên nói thẳng: file này **cố ý** import key factory của cả bốn
feature. Nó là chỗ duy nhất được phép, và bù lại `index.ts` của attendance và team-builder thôi
export key ra ngoài.

Vì sao chấp nhận được: quan hệ "dữ liệu nào làm cũ dữ liệu nào" vốn là kiến thức **xuyên feature** —
không feature nào sở hữu nó. Hiện nó đang bị nhét vào feature ghi, tức là đặt ở nơi sai; đặt nó ở
`lib/` là đặt đúng chỗ, không phải phá luật.

Vì sao không dùng chuỗi khoá thô (`["attendance", "records"]`) để tránh import: nó sao chép cấu trúc
key ra ngoài feature — tệ hơn, vì lệch thì không có lỗi biên dịch.

Đường import là file key lá của từng feature (`features/<feature>/api/*-keys.ts`), **không** phải
`index.ts`. Barrel của attendance kéo theo một server action import `"server-only"`, và vì bốn
feature đều import ngược lại `useInvalidate` nên đi qua barrel là tạo bốn vòng import. File
`*-keys.ts` không import gì cả nên cả hai vấn đề biến mất. `attendanceKeys` vì thế tách khỏi
`attendance-api.ts` ra `features/attendance/api/attendance-keys.ts`, cho khớp ba feature kia.

### 3. Key factory rút về sau `index.ts`

Sau spec, `features/attendance/index.ts` và `features/team-builder/index.ts` bỏ export
`attendanceKeys` / `teamBuilderKeys`, trừ phần `lib/cache-graph.ts` import. Nếu muốn chặt hơn: giữ
export nhưng đổi tên rõ ràng (`attendanceCacheKeys`) để nhìn thấy nó chỉ phục vụ đồ thị.

### 4. `use-deadline-refresh` cũng đi qua đồ thị

Đã kiểm: tập của nó là `{sessions, records}`, tập của `schedule` là
`{settingsKeys.all, sessions, records, teamBuilderKeys.all}` — **khác nhau**, nên không gộp.
`:25-30` đổi thành `useInvalidate("attendance-window")`.

### 5. Ba chỗ ghi còn lại cũng đi qua đồ thị

`attendance` và `formation` không phải topic dự phòng — chúng có call site sẵn:
`use-attendance.ts:96` và `:111` (điểm danh và điểm danh hộ) là `attendance`,
`use-save-formation.ts:20` là `formation`. Chuyển cả ba, nếu không đồ thị có mục chết ngay từ đầu.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `lib/cache-graph.ts` (mới) | `CACHE_TOPICS`, `CacheTopic`, `CACHE_DEPENDENTS` |
| `lib/__tests__/cache-graph.test.ts` (mới) | test đồ thị là dữ liệu thuần |
| `hooks/use-invalidate.ts` (mới) | `useInvalidate` |
| `hooks/__tests__/use-invalidate.test.ts` (mới) | test hook |
| `features/attendance/api/attendance-keys.ts` (mới) | `attendanceKeys`, không còn `weeks()` |
| `features/members/hooks/use-member-mutations.ts:21-40` | `useInvalidate("roster")` |
| `features/settings/hooks/use-session-mutations.ts:32-40` | `useInvalidate("schedule")` |
| `features/attendance/hooks/use-deadline-refresh.ts:25-30` | `useInvalidate("attendance-window")` |
| `features/attendance/hooks/use-attendance.ts:96,111` | `useInvalidate("attendance")` |
| `features/team-builder/hooks/use-save-formation.ts:20` | `useInvalidate("formation")` |
| `features/attendance/index.ts`, `features/team-builder/index.ts` | bỏ export key ra ngoài |
| `features/attendance/api/attendance-api.ts` | `attendanceKeys` dọn sang `attendance-keys.ts`; `weeks()` không có call site nên bị xoá |

Hai doc comment mô tả hậu quả (`use-member-mutations.ts:15-20`,
`use-session-mutations.ts:26-31`) **chuyển vào** `cache-graph.ts`, đặt cạnh đúng dòng chúng mô tả.
Chúng là phần có giá trị nhất của code hiện tại; đừng để mất khi xoá code cũ.

## Edge case

- **Invalidate quá tay vẫn đúng, chỉ tốn refetch.** `teamBuilderKeys.all` hiện được quét sạch trong
  cả hai hook. Giữ nguyên mức thô đó — thu hẹp là tối ưu riêng, và làm chung với refactor này thì
  không phân biệt được lỗi do đâu.
- **Mutation có `onSuccess` riêng ngoài invalidate** (ví dụ đóng dialog): không đụng, `useInvalidate`
  chỉ thay phần invalidate.
- **Query key có tham số** (`attendanceKeys.records()` không nhận tuần): giữ nguyên hình dạng hiện
  tại. Nếu sau này key mang tham số, `CACHE_DEPENDENTS` trả về prefix và TanStack tự khớp tiền tố —
  không cần đổi cấu trúc đồ thị.
- **Đồ thị không có chu trình** hiện tại; nếu sau này có, `useInvalidate` không đệ quy nên không
  treo — nó chỉ đọc một mức.

## Kiểm thử

- `cache-graph.test.ts` — đồ thị là dữ liệu thuần nên test không cần `QueryClient`:
  - `schedule` phải chạm `attendanceKeys.records()` (luật domain, khoá lại bằng test)
  - `roster` phải chạm `teamBuilderKeys.all`
  - mọi `CacheTopic` đều có mục trong `CACHE_DEPENDENTS` (`Record` đã ép ở mức kiểu, test khoá thêm
    ở runtime cho trường hợp key được dựng động)
- Test cho `useInvalidate` (`hooks/__tests__/use-invalidate.test.ts`, môi trường jsdom): gọi
  `invalidateQueries` đúng số lần và đúng từng key, **và** trả về cùng một hàm qua hai lần render.

## Rủi ro

- **Thiếu một key khi chuyển** làm hai màn lệch nhau cho tới khi tải lại trang — đúng hậu quả mà
  comment hiện tại cảnh báo. Chuyển bằng cách **copy nguyên danh sách** vào `CACHE_DEPENDENTS`
  trước, rồi mới xoá code cũ; không gõ lại từ trí nhớ.
- **`lib/` import từ `features/`** là hướng phụ thuộc mới trong app này. Đã kiểm
  `apps/web/eslint.config.mjs`: không có `no-restricted-imports` hay `import/no-restricted-paths`,
  nên file ở lại `lib/`. Bù lại, ngoại lệ với luật 5 của `frontend.md` §4 phải được ghi xuống thành
  luật, không để là một lần phá lệ không ai biết.

## Ngoài phạm vi

- Thu hẹp mức invalidate (đã nói ở Edge case).
- Optimistic update — mô hình khác hẳn, việc riêng.
