# Quy tắc thời gian điểm danh

Tổng hợp toàn bộ luật về **thời gian / deadline** của tính năng điểm danh. Dùng để map với backend sau. Mọi mốc giờ hiểu theo giờ Việt Nam (UTC+7) trừ khi ghi khác.

> Trạng thái: toàn bộ luật đã **chuyển sang backend** — `apps/api/src/modules/attendance/attendance-schedule.ts`
> (`getActiveWeek`, `isDeadlinePassed`), tính theo **UTC+7 cố định**, không phụ thuộc giờ máy. Danh sách ngày
> đánh chỉnh ở `SESSION_TEMPLATES` của file đó. FE chỉ dùng `isDeadlinePassed` để khóa cột trên UI;
> chặn thật nằm ở server.

## 1. Mô hình

- Điểm danh theo **tuần**: mỗi tuần có `fromDate → toDate`, hiển thị timeline.
- Trong một tuần có **nhiều trận** (battle session), mỗi trận có `dateTime` (giờ diễn ra) và `deadline` (hạn chót điểm danh riêng).
- Trận **Thứ 7 · Guild War** là cố định, được làm nổi bật.

## 2. Luật đang có trong code

- **Deadline theo từng trận**: quá `deadline` của trận nào thì khóa cột trận đó (`isDeadlinePassed()` trong `attendance-api.ts`).
- **Còn hạn thì cho đổi qua lại**: trong hạn được chuyển "Có" ⇄ "Không" thoải mái; hết hạn thì khóa, không sửa được.
- **Mật khẩu riêng**: mỗi nhân vật điểm danh bằng password riêng của mình.
- **Đã điểm danh hiển thị ở bảng lịch sử**: ghi rõ thời điểm điểm danh (`markedAt`), cả "Có" lẫn "Không".

## 3. Luật thời gian mới (yêu cầu ngày 2026-07-21, đã chốt)

1. **Chốt sổ cả tuần — sau 17h Thứ 5**
   Sau **17:00 Thứ 5**, đóng **toàn bộ** điểm danh của tuần đó — **mọi trận đều khóa, KỂ CẢ Guild War Thứ 7**.
   → Hệ quả: Guild War Thứ 7 phải được điểm danh **xong trước 17:00 Thứ 5**, dù trận diễn ra vào Thứ 7.

2. **Deadline từng trận — mọi trận trước Thứ 5**
   Mọi trận diễn ra **trước Thứ 5** (Thứ 2/3/4): hạn điểm danh = **10:00 sáng của chính ngày đánh**.
   (Ví dụ: trận Thứ 4 → hạn 10:00 sáng Thứ 4; trận Thứ 3 → hạn 10:00 sáng Thứ 3.)

3. **Tự mở tuần kế — sau 22h Thứ 7**
   Sau **22:00 Thứ 7**, tự động **mở điểm danh cho tuần kế tiếp** (next week).

### Deadline hiệu dụng của một trận

```
deadline(trận) = min(
  hạn riêng theo ngày,          // trận trước T5: 10:00 sáng cùng ngày
  17:00 Thứ 5 (chốt sổ cả tuần) // trần cứng cho MỌI trận trong tuần
)
```

- Trận **trước Thứ 5**: hạn = 10:00 sáng cùng ngày (luôn sớm hơn 17h T5).
- Trận **Thứ 5 / Thứ 7 (Guild War)**: hạn = **17:00 Thứ 5** (do bị trần cứng chốt sổ cả tuần).

### Vòng đời một tuần điểm danh

```
Thứ 7 (tuần N-1) 22:00  →  MỞ điểm danh tuần N
... trong tuần N: mỗi trận trước T5 khóa lúc 10:00 sáng ngày đánh ...
Thứ 5 (tuần N)   17:00  →  CHỐT toàn bộ tuần N (mọi trận khóa, gồm cả Guild War T7)
Thứ 7 (tuần N)   22:00  →  MỞ điểm danh tuần N+1
```

## 4. Mặc định đã chọn khi triển khai (chỉnh lại nếu cần)

- **Khoảng trống Thứ 5 17h → Thứ 7 22h**: vẫn hiển thị **tuần vừa chốt ở chế độ read-only** (mọi cột đã khóa do quá deadline). Đúng 22:00 Thứ 7, `getCurrentWeek`/`getBattleSessions` tự trả về tuần kế.
- **Ranh giới tuần (fromDate/toDate)**: một tuần điểm danh = **Thứ 2 00:00 → Thứ 7 23:59**, với Guild War Thứ 7 nằm cuối tuần.
- **Múi giờ**: hiện tính theo **giờ máy chạy** (`Date` local). Khi lên BE cần chốt cứng **UTC+7** để mọi user thống nhất.
- **Rollover khi app đang mở**: tuần/deadline tính lúc `fetch`; TanStack Query cache lại nên mốc 22h Thứ 7 chỉ tự nhảy tuần sau khi refetch/reload. Cột vẫn tự khóa đúng theo `deadline` mà không cần reload.
