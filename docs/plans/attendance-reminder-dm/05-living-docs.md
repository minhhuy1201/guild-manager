# 05: Cập nhật tài liệu sống

Spec: [`docs/specs/attendance-reminder-dm.md`](../../specs/attendance-reminder-dm.md)

Đọc trước: spec ở trên (Implementation Decisions, "Tài liệu sống phải cập nhật cùng PR"), diff của
ticket 02, 03, 04.

**What to build:** `docs/architecture.md` và `docs/production.md` mô tả đúng hành vi mới: nhắc điểm
danh gửi DM từng người, không còn channel nhắc, `ADMIN_ALERT` nhận danh sách người không nhận được,
`/nhac-diem-danh` trả lời trễ. Viết tiếng Anh như phần còn lại của hai file, sửa theo đúng kiểu câu
đang có ở các đoạn đó.

**Blocked by:** 02, 03, 04.

**Model:** haiku - 2 file, sửa mô tả theo mẫu sẵn có trong chính các đoạn đó, không có logic.

**Status:** done

- [x] `docs/architecture.md`: mô tả module `discord-bot` (nhắc điểm danh là DM, `/cau-hinh-kenh` còn hai mục đích), dòng endpoint `GET /cron/attendance-reminder`, dòng bảng `BotChannel` (còn hai row tối đa), đoạn tự báo lỗi của job theo lịch (bỏ "finds no reminder channel", thêm danh sách người không nhận được), mục quy tắc giờ nhắc nếu có nhắc tới channel.
- [x] `docs/production.md`: mục cron nhắc điểm danh khớp hành vi mới; nêu bước `discord:register` sau deploy và việc cấu hình `ADMIN_ALERT`.
- [x] Không còn câu nào trong hai file nói nhắc điểm danh post vào channel nhắc (`grep -n -i "reminder channel"` rỗng hoặc chỉ còn câu đúng).
