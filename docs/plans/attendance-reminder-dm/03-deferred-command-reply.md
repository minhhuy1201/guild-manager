# 03: `/nhac-diem-danh` trả lời trễ

Spec: [`docs/specs/attendance-reminder-dm.md`](../../specs/attendance-reminder-dm.md)

Đọc trước: spec ở trên (Implementation Decisions, "`/nhac-diem-danh` trả lời trễ"; Further Notes về
giới hạn 3 giây), router interaction, kiểu trả lời của lệnh, controller nhận interaction,
`DiscordRestClient`, lệnh `/nhac-diem-danh` sau ticket 02. Tài liệu Discord:
https://discord.com/developers/docs/interactions/receiving-and-responding

**What to build:** Admin gõ `/nhac-diem-danh` với bang đông không còn thấy "The application did not
respond". Lệnh hiện ngay trạng thái đang xử lý (chỉ người gõ thấy), gửi xong thì câu đó đổi thành kết
quả. Đây là lệnh trả lời trễ đầu tiên của bot.

**Blocked by:** 02 - Cron và `/nhac-diem-danh` gửi Attendance reminder qua DM.

**Model:** sonnet - đổi interface router và kiểu trả lời của lệnh.

**Status:** todo

- [ ] Kiểu trả lời của lệnh cho phép một biến thể "deferred kèm việc chạy nền"; router xử lý biến thể đó bằng `assertNever` ở switch, lệnh khác không đổi.
- [ ] Kiểm quyền (`requireCommand`) và đọc phạm vi chạy trước; bị từ chối thì trả lời ngay như cũ.
- [ ] Được phép thì HTTP response là type 5 (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`) với flag ephemeral.
- [ ] Việc gửi chạy trong `waitUntil` của `@vercel/functions`; xong thì `PATCH /webhooks/{application_id}/{interaction_token}/messages/@original` với kết quả hoặc câu `nothing-due` theo phạm vi.
- [ ] Lỗi trong việc nền: sửa câu trả lời gốc thành một câu lỗi chung, ghi log; lỗi khi sửa câu trả lời gốc chỉ ghi log, không ném ra ngoài `waitUntil`.
- [ ] `DiscordRestClient` có hàm sửa câu trả lời gốc, xác thực theo cách hiện có, cùng timeout, ném `DiscordApiError` khi bị từ chối; application id lấy từ cấu hình hiện có hoặc từ payload interaction (không thêm biến môi trường nếu tránh được; nếu phải thêm thì theo `.claude/rules/api/config.md`).
- [ ] Spec router, spec `/nhac-diem-danh`, spec `DiscordRestClient` phủ: từ chối trả ngay, được phép trả type 5, việc nền sửa đúng nội dung, lỗi việc nền.
- [ ] Test, typecheck, lint của `api` xanh.
- [ ] Kiểm tay trên Discord dev: gõ lệnh, thấy trạng thái đang xử lý rồi kết quả.
