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

/** Loại dữ liệu có thể bị một thao tác ghi làm cũ đi. */
export type CacheTopic = "roster" | "schedule" | "attendance" | "formation";

/**
 * Query key nào phải invalidate khi một chủ đề bị ghi.
 * Đọc như một câu domain: "đổi lịch đánh thì lịch, điểm danh và đội hình đều cũ".
 */
export const CACHE_DEPENDENTS: Record<CacheTopic, () => QueryKey[]> = {
  roster:     () => [memberKeys.all, attendanceKeys.characters(), attendanceKeys.records(), teamBuilderKeys.all],
  schedule:   () => [settingsKeys.all, attendanceKeys.sessions(), attendanceKeys.records(), teamBuilderKeys.all],
  attendance: () => [attendanceKeys.records()],
  formation:  () => [teamBuilderKeys.all],
};
```

```ts
/**
 * Invalidate mọi query phụ thuộc một chủ đề vừa bị ghi.
 * @param topic - Chủ đề dữ liệu vừa thay đổi
 * @returns Hàm gọi trong onSuccess của mutation
 */
export function useInvalidate(topic: CacheTopic): () => void;
```

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

### 3. Key factory rút về sau `index.ts`

Sau spec, `features/attendance/index.ts` và `features/team-builder/index.ts` bỏ export
`attendanceKeys` / `teamBuilderKeys`, trừ phần `lib/cache-graph.ts` import. Nếu muốn chặt hơn: giữ
export nhưng đổi tên rõ ràng (`attendanceCacheKeys`) để nhìn thấy nó chỉ phục vụ đồ thị.

### 4. `use-deadline-refresh` cũng đi qua đồ thị

`:25-30` đổi thành `invalidate("attendance-window")` — hoặc dùng luôn `schedule` nếu cùng tập. Kiểm
trước khi gộp: nếu tập trùng thì gộp, nếu không thì thêm một topic. Đừng ép hai thứ khác nhau vào
một tên.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `lib/cache-graph.ts` (mới) | `CacheTopic`, `CACHE_DEPENDENTS`, `useInvalidate` |
| `lib/__tests__/cache-graph.test.ts` (mới) | test đồ thị là dữ liệu thuần |
| `features/members/hooks/use-member-mutations.ts:21-40` | `useInvalidate("roster")` |
| `features/settings/hooks/use-session-mutations.ts:32-40` | `useInvalidate("schedule")` |
| `features/attendance/hooks/use-deadline-refresh.ts:25-30` | dùng đồ thị |
| `features/attendance/index.ts`, `features/team-builder/index.ts` | bỏ export key ra ngoài |
| `features/attendance/api/attendance-api.ts` | xoá `attendanceKeys.weeks()` nếu vẫn không call site |

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
- Test cho `useInvalidate` gọi `invalidateQueries` đúng số lần, với một `queryClient` giả.

## Rủi ro

- **Thiếu một key khi chuyển** làm hai màn lệch nhau cho tới khi tải lại trang — đúng hậu quả mà
  comment hiện tại cảnh báo. Chuyển bằng cách **copy nguyên danh sách** vào `CACHE_DEPENDENTS`
  trước, rồi mới xoá code cũ; không gõ lại từ trí nhớ.
- **`lib/` import từ `features/`** là hướng phụ thuộc mới trong app này. Kiểm xem có luật lint nào
  cấm không trước khi làm; nếu có, đặt file ở `features/shared-cache/` hoặc `config/` thay vì `lib/`.

## Ngoài phạm vi

- Thu hẹp mức invalidate (đã nói ở Edge case).
- Optimistic update — mô hình khác hẳn, việc riêng.
