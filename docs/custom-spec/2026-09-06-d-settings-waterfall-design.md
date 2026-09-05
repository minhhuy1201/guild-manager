# D — `/thiet-lap` không xếp hàng hai request

Ngày: 2026-09-06 · Phạm vi: `apps/web/features/settings`.
Tổng quan: [đợt 3](./2026-09-06-architecture-review-3-overview.md) · Mức: **Worth exploring**

Yêu cầu gốc: cải thiện hiệu năng, không đổi behaviour business.

## Bối cảnh

### 1. Request thứ hai chờ request thứ nhất, chỉ để biết một giá trị mặc định

`apps/web/features/settings/components/settings-screen.tsx:24`

```ts
const weeksQuery = useSettingsWeeks();
const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

const weeks = weeksQuery.data ?? [];
const weekStart = selectedWeek ?? weeks[0]?.weekStart ?? null;
const sessionsQuery = useWeekSessions(weekStart);
```

`apps/web/features/settings/hooks/use-week-sessions.ts:27`

```ts
export function useWeekSessions(weekStart: string | null) {
  return useQuery({
    queryKey: settingsKeys.sessions(weekStart ?? ""),
    queryFn: () => fetchWeekSessions(weekStart as string),
    enabled: weekStart !== null,
  });
}
```

Mở màn hình lần đầu, `selectedWeek` là `null`, nên `weekStart` phụ thuộc `weeks[0]` — mà `weeks` chỉ
có sau khi request thứ nhất về. Hai lượt gọi luôn nối đuôi: thời gian tới nội dung là 2 RTT.

### 2. Giá trị mặc định đó backend đã sở hữu sẵn

`GET /battle-sessions` không kèm `weekStart` trả về **tuần đang mở**
(`battle-sessions.service.ts:110` → `parseWeekStart(undefined, now)`).

Và `weeks[0]` đúng là tuần đang mở: `getEditableWeeks` (`battle-sessions.service.ts:96`) trả hai tuần
với tuần mở đứng trước, gắn cờ qua `toWeekResponse(week, index === 0)`.

Nên request thứ hai không cần biết gì từ request thứ nhất — nó chỉ đang chờ một câu trả lời mà nó tự
biết mặc định.

> Lưu ý: đây **khác** với `/xep-team`. Ở đó `findActiveWeekStart` (`team-builder/lib/week-status.ts:10`)
> ghi rõ danh sách là mới-nhất-trước và với tay sang tuần sau, nên `weeks[0]` **không** phải tuần
> đang mở và chỉ cờ `isActive` mới nói được. Hai màn hình đọc hai endpoint khác nhau với hai thứ tự
> khác nhau — không được suy từ màn này sang màn kia.

## Quyết định

1. **Bắn `GET /battle-sessions` không kèm `weekStart` ngay từ lần render đầu**, song song với
   `GET /battle-sessions/weeks`.
2. **`settingsKeys.sessions` cần một khoá cho "tuần đang mở"** — hôm nay nó nhận `string` bắt buộc và
   dùng `""` làm chỗ giữ chỗ cho trạng thái chưa biết. Đổi thành cùng khuôn với
   `teamBuilderKeys.formations`: `weekStart?: string`, `weekStart ?? "current"`.
3. **Khi admin tự chọn tuần**, khoá đổi sang ngày cụ thể và mọi thứ chạy như cũ.

### Rủi ro trùng cache, và vì sao vẫn chấp nhận

Sau khi `weeks` về, nếu màn hình chuyển `weekStart` từ `undefined` sang `weeks[0].weekStart` thì nó
sẽ rơi đúng vào lỗi của mục [C](./2026-09-06-c-formation-double-fetch-design.md): hai khoá cache cho
một tuần, và fetch lần hai.

Nên quyết định là: **giữ khoá `"current"` cho tới khi admin chọn tuần khác.** Không tự chuyển sang
ngày cụ thể chỉ vì đã biết ngày đó. Đây là điểm phải làm đúng, nếu không thì D vừa bỏ một RTT vừa
thêm lại một cái khác.

## Ảnh hưởng contract

**Không có.** Không endpoint nào đổi. `settingsKeys.sessions` là khoá cache nội bộ của web app.

## Behaviour giữ nguyên

- **Dropdown chọn tuần** vẫn hiện đúng hai tuần và vẫn đánh dấu đúng tuần đang xem — nhưng lúc chưa
  chọn gì, "tuần đang xem" nay là một giá trị ngầm. Phải kiểm nhãn hiển thị không bị trống trong
  khoảng thời gian `weeks` chưa về.
- **Tạo / sửa / xoá scrim** invalidate `settingsKeys.all`, phủ cả khoá `"current"` lẫn khoá ngày.
  Không đổi.
- **`combineQueries([weeksQuery, sessionsQuery])`** nay có hai query cùng chạy từ đầu, nên trạng thái
  lỗi có thể tới từ query nào trước cũng được. Thông báo lấy từ query lỗi đầu tiên — không đổi luật,
  nhưng thứ tự có thể khác lúc mạng chậm.

## Vì sao chỉ ở mức Worth exploring

Đây là màn hình chỉ admin dùng, tần suất thấp. Cái được là 1 RTT ở một chỗ ít người đi. Cái phải làm
đúng là hai điểm ở trên, và điểm thứ nhất chính là lỗi mục C đang đi sửa. Nếu phải chọn, làm C trước
và chỉ quay lại D khi khuôn "một tuần một khoá" đã có một tiền lệ chạy tốt.
