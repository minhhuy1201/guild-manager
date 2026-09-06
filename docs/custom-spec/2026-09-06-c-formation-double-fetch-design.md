# C — `/xep-team` chỉ tải đội hình một lần

Ngày: 2026-09-06 · Phạm vi: `apps/web/features/team-builder`.
Tổng quan: [đợt 3](./2026-09-06-architecture-review-3-overview.md) · Mức: **Strong**

Yêu cầu gốc: cải thiện hiệu năng, không đổi behaviour business.

## Bối cảnh

### 1. Tuần chưa biết, nhưng query đã chạy

`apps/web/features/team-builder/hooks/use-formation-week.ts:49`

```ts
const weeksQuery = useFormationWeeks();
const selectedWeekStart = useFormationStore((s) => s.selectedWeekStart);

const activeWeekStart = findActiveWeekStart(weeksQuery.data ?? []);
const weekStart = selectedWeekStart ?? activeWeekStart ?? undefined;

const formationsQuery = useFormations(weekStart);   // chạy ngay, weekStart còn undefined
```

Lần render đầu, `weeksQuery.data` chưa có, `selectedWeekStart` là `null`, nên `weekStart` là
`undefined`.

### 2. `undefined` là một khoá cache hợp lệ, không phải "chưa sẵn sàng"

`apps/web/features/team-builder/api/team-builder-keys.ts:8`

```ts
formations: (weekStart?: string) =>
  [...teamBuilderKeys.all, "formations", weekStart ?? "current"] as const,
```

`undefined` được dịch thành chuỗi `"current"`. Query chạy với khoá
`["team-builder","formations","current"]` và gọi `fetchFormations(undefined)` — backend hiểu là tuần
đang mở và trả đúng dữ liệu đó.

Khi `weeksQuery` về, `findActiveWeekStart` (`lib/week-status.ts:10`) trả tuần có cờ `isActive` — tức
là **đúng cái tuần backend vừa trả**. `weekStart` đổi thành một chuỗi ngày, khoá đổi thành
`["team-builder","formations","2026-09-01"]`, và TanStack Query coi đó là một query khác: nó fetch
lại từ đầu.

Kết quả: mỗi lần mở `/xep-team` tải **cùng một payload hai lần**, dưới hai khoá cache khác nhau.

### 3. `useFormations` đã có sẵn chỗ để chặn, không ai truyền

`apps/web/features/team-builder/hooks/use-formations.ts:15`

```ts
export function useFormations(weekStart?: string, enabled = true) {
  return useQuery({
    queryKey: teamBuilderKeys.formations(weekStart),
    queryFn: () => fetchFormations(weekStart),
    enabled,
  });
}
```

Tham số `enabled` có từ đầu và chưa call site nào dùng. Đây là seam đúng chỗ, chỉ là chưa ai đứng vào.

## Quyết định

1. **Park query cho tới khi danh sách tuần về.** `useFormationWeek` truyền
   `enabled: weeksQuery.isSuccess`. Nó vốn đã là module duy nhất quyết định tuần nào đang trên màn
   hình — locality nằm sẵn ở đúng chỗ.

   Điều kiện là "danh sách đã về", **không** phải `weekStart !== undefined`: với danh sách rỗng,
   `findActiveWeekStart` trả `null` nên `weekStart` mãi `undefined`, query đứng yên vĩnh viễn và màn
   hình kẹt skeleton. Xem nhánh thứ ba ở §"Behaviour giữ nguyên" — đó là lý do spec này không phải
   một dòng sửa.
2. **Không đụng vào `teamBuilderKeys.formations`.** Nhánh `"current"` vẫn đúng cho người gọi thật sự
   muốn "tuần đang mở mà không cần biết là tuần nào"; vấn đề không nằm ở key factory mà ở chỗ gọi nó
   khi chưa có câu trả lời.
3. **Không gộp hai request thành một endpoint mới.** Đó là thêm interface để chữa một chỗ gọi sai
   thời điểm.

## Ảnh hưởng contract

**Không có.** Không endpoint nào đổi, không schema nào đổi.

## Behaviour giữ nguyên

- **Trạng thái đang tải.** `useFormationWeek` gom ba query qua `combineQueries`, và một query bị park
  không phải là `isPending` theo mặc định của TanStack Query. Phải kiểm: trong lúc `weeksQuery` chạy,
  màn hình vẫn phải hiện trạng thái tải chứ không được nháy sang "không có đội hình". Đây là điểm dễ
  hỏng nhất của thay đổi này.
- **Đổi tuần bằng tay.** `setWeek` ghi `selectedWeekStart`, `weekStart` có giá trị ngay, query chạy
  như cũ.
- **Tuần rỗng.** `findActiveWeekStart` trả `null` khi danh sách rỗng → `weekStart` vẫn `undefined` →
  query đứng yên vĩnh viễn. Hôm nay nó sẽ fetch `"current"` và trả về mảng rỗng. **Đây là một khác
  biệt thật**: phải kiểm màn hình trống hiển thị đúng, hoặc để `enabled` mở khi `weeksQuery` đã xong
  mà vẫn không có tuần nào.

Điểm cuối là lý do spec này không phải một dòng sửa: điều kiện đúng là "danh sách tuần đã về", không
phải "weekStart khác undefined".

## Rủi ro

`refetchFormations` (interface của `useFormationWeek`, dùng khi một lần lưu đụng phải ngày đã khoá)
gọi `formationsQuery.refetch()`. Trên một query đang bị park, `refetch` không chạy. Ở thời điểm đó
tuần chắc chắn đã biết nên không sao, nhưng nếu sau này ai đó gọi `refetchFormations` sớm hơn thì nó
sẽ im lặng không làm gì.

**Đã kiểm khi implement:** call site duy nhất là `use-formation-draft.ts:314`, trên nhánh 409 của một
lần lưu — tức là sau khi màn hình đã tải xong và query chắc chắn đang chạy. Không thêm phòng thủ cho
một trường hợp chưa tồn tại.

### `refetch()` đi xuyên qua `enabled` — nút "Thử lại" phải chặn

Rủi ro thật hơn nằm ở hướng ngược lại. `refetch()` của TanStack **cố tình bỏ qua `enabled`**: nó gọi
thẳng `query.fetch()`. Mà `combineQueries.refetch` lại refetch **mọi** query trong nhóm, nên nút
"Thử lại" bấm lúc query tuần đang lỗi sẽ tải đội hình chui qua chỗ park với khoá `"current"`, rồi tải
lại lần nữa với khoá ngày ngay khi danh sách tuần về — **đúng cái double fetch spec này sinh ra để
chặn**, chỉ khác đường vào.

Cách chặn: query đội hình vào nhóm dưới dạng một `CombinableQuery` có `refetch` tự bỏ qua khi đang
park. Lúc đang park thì ở đây không có gì để thử lại: sửa được danh sách tuần là query tự un-park và
tự chạy. `refetchFormations` dùng chung đúng hàm đó, nên nhánh 409 cũng đi qua cùng một guard.

## Đo lại

Bỏ **một request đầy đủ** (payload đội hình của cả tuần) ở mỗi lần mở `/xep-team`, và bỏ một entry
cache trùng nội dung.
