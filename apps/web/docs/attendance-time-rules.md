# Quy tắc thời gian điểm danh

Đặc tả luật **thời gian / deadline** của tính năng điểm danh. Mọi mốc giờ hiểu theo giờ Việt Nam
(UTC+7).

> **Trạng thái:** luật đang chạy nằm ở
> `apps/api/src/modules/battle-sessions/session-schedule.ts`, tính theo UTC+7 cố định.
> Mô hình tuần / trận / deadline đang có hiệu lực tóm tắt ở
> [`docs/architecture.md`](../../../docs/architecture.md) mục 6.
> File này giữ **đặc tả gốc của luật deadline** — phần lịch cố định ở mục 2 đã được thay bằng lịch do
> quản trị viên nhập (từ 2026-08), đọc như bối cảnh chứ không phải hành vi hiện tại.

## 1. Luật chốt tuần (còn hiệu lực)

1. **Tự mở tuần kế — sau 22:00 Thứ 7**
   Sau 22:00 Thứ 7, tự động mở điểm danh cho tuần kế tiếp.

2. **Ranh giới tuần**
   Một tuần điểm danh = **Thứ 2 00:00 → Thứ 7 23:59**, Guild War Thứ 7 nằm cuối tuần.

3. **Còn hạn thì cho đổi qua lại**
   Trong hạn được chuyển "Có" ⇄ "Không" thoải mái; quá `deadline` của trận nào thì khóa cột trận đó.
   Mọi lượt điểm danh đều ghi `markedAt`, kể cả "Không".

4. **Khoảng trống Thứ 5 → Thứ 7 22:00**
   Vẫn hiển thị tuần vừa chốt ở chế độ read-only. Đúng 22:00 Thứ 7 thì API trả về tuần kế.

5. **Rollover khi app đang mở**
   Tuần/deadline tính lúc `fetch`; TanStack Query cache lại nên mốc 22:00 Thứ 7 chỉ nhảy tuần sau khi
   refetch/reload. Cột vẫn tự khóa đúng theo `deadline` mà không cần reload.

## 2. Luật deadline cố định (đã thay thế — giữ làm bối cảnh)

Yêu cầu ngày 2026-07-21, áp dụng khi lịch đánh còn hardcode trong code:

1. **Chốt sổ cả tuần sau 17:00 Thứ 5** — mọi trận trong tuần khóa, kể cả Guild War Thứ 7.
2. **Trận trước Thứ 5** (T2/T3/T4): hạn điểm danh = **10:00 sáng của chính ngày đánh**.
3. Deadline hiệu dụng = `min(hạn riêng theo ngày, 17:00 Thứ 5)`.

Từ 2026-08, deadline của mỗi trận **do quản trị viên nhập** ở màn `/thiet-lap` và backend không kẹp
lại theo luật nào. Hai luật trên chỉ còn là mặc định hợp lý khi đặt tay.
