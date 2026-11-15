# 01: Tách logic gửi DM dùng chung khỏi Team notice

Spec: [`docs/specs/attendance-reminder-dm.md`](../../specs/attendance-reminder-dm.md)

Đọc trước: spec ở trên (mục Implementation Decisions, "Logic gửi DM dùng chung"), `GLOSSARY.md`,
service gửi Team notice trong module `discord-bot` và spec của nó.

**What to build:** Phần gửi DM của Team notice (mở DM, gửi có hoặc không kèm file, phân loại kết quả,
đợi khi bị giới hạn tốc độ, dừng khi Discord báo mở DM quá nhanh, giới hạn thời gian cả lượt) thành
một service riêng trong `discord-bot`, để Attendance reminder ở ticket 02 dùng lại. Thành viên và
admin không thấy gì thay đổi: Team notice gửi y như cũ, báo cáo y như cũ.

**Blocked by:** None (can start immediately).

**Model:** sonnet - tạo interface mới dùng chung, không đủ điều kiện haiku.

**Status:** todo

- [ ] Service mới nhận danh sách người nhận (Discord ID, payload, file tuỳ chọn) và trả kết quả từng người: đã gửi, chặn DM (50007), chưa gửi được.
- [ ] Gửi tuần tự từng người. 429 đợi tối đa 10 giây (mặc định 1 giây khi Discord không nói) rồi thử lại đúng một lần; lần hai là chưa gửi được.
- [ ] 40003 dừng cả lượt: người đó và mọi người còn lại là chưa gửi được.
- [ ] Ngân sách 220 giây cho cả lượt, tính bằng `Clock` inject: hết ngân sách thì người còn lại là chưa gửi được, ghi log warn một lần.
- [ ] Lỗi khác ghi log kèm nội dung lỗi của Discord và tính là chưa gửi được.
- [ ] Service Team notice gọi qua service mới; các quy tắc riêng của Team notice (không có mặt, chưa liên kết Discord ID, chọn ảnh theo team) giữ nguyên ở chỗ cũ.
- [ ] Spec Team notice hiện có xanh mà không sửa kỳ vọng. Các ca 429/40003/50007/ngân sách có test ở service mới (chuyển hoặc thêm).
- [ ] Test, typecheck, lint của `api` xanh.
