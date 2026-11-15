# 02: Cron và `/nhac-diem-danh` gửi Attendance reminder qua DM

Spec: [`docs/specs/attendance-reminder-dm.md`](../../specs/attendance-reminder-dm.md)

Đọc trước: spec ở trên (Solution, Flows, Implementation Decisions), `GLOSSARY.md` (Attendance
reminder), service nhắc điểm danh, builder tin nhắc, câu cảnh báo admin, lệnh `/nhac-diem-danh`, và
service gửi DM dùng chung từ ticket 01.

**What to build:** Mỗi sáng 9h và khi admin gõ `/nhac-diem-danh`, mỗi người còn thiếu nhận một
Attendance reminder qua DM, gộp mọi ngày họ chưa trả lời, kèm hàng nút quen thuộc. Không còn tin
ping trong channel chung. Admin biết ai không nhận được: lượt cron đăng vào channel cảnh báo admin
khi có người như vậy; lượt chạy tay trả kết quả cho người gõ lệnh (vẫn trả lời đồng bộ, ticket 03
chuyển sang trả lời trễ).

**Blocked by:** 01 - Tách logic gửi DM dùng chung khỏi Team notice.

**Model:** sonnet - logic mới (gom theo người, outcome mới), không đủ điều kiện haiku.

**Status:** todo

- [ ] Cách tìm ngày đến hạn và ai thiếu không đổi (`isDueForReminder`, có record là đã trả lời); cron và lệnh tay vẫn gọi cùng một hàm `run(scope)`.
- [ ] Mỗi người thiếu nhận đúng một DM, gồm các ngày thiếu của chính họ: mỗi ngày một block `###` icon 🛡️/⚔️ + label, dòng hạn dùng `formatDeadlineLabel`. Không mention, `allowed_mentions` đóng hết, có hàng nút `buildEntryButtons`.
- [ ] Builder tin vẫn thuần; phần chỉ phục vụ tin nhiều người (gom mention, ngân sách tên, dòng "Chưa liên kết Discord") bị xoá.
- [ ] Không còn đọc channel `ATTENDANCE_REMINDER` và không còn post vào channel nào để nhắc. Biến thể `no-channel` và câu cảnh báo "chưa có kênh nhắc" bị bỏ.
- [ ] Outcome `sent` mang: số ngày đánh, số người cần nhắc, số đã nhận, và tên ba nhóm (chưa liên kết Discord ID, chặn DM, chưa gửi được). Một người chỉ tính một lần.
- [ ] `runScheduled`: có người không nhận được thì đăng một tin vào `ADMIN_ALERT` liệt kê ba nhóm, cắt theo giới hạn ký tự Discord; gửi trót lọt hoặc `nothing-due` thì im lặng; lỗi ném ra vẫn báo `ADMIN_ALERT` rồi ném lại; thiếu `ADMIN_ALERT` chỉ log warn.
- [ ] Câu cảnh báo lỗi bỏ phần hướng dẫn quyền Send Messages của channel nhắc.
- [ ] `/nhac-diem-danh` báo số đã nhắc, số ngày đánh, và ba nhóm không nhận được; câu `nothing-due` theo phạm vi giữ nguyên; nhánh `no-channel` và câu "không gửi được vào channel nhắc" bị bỏ.
- [ ] Spec của service nhắc, builder, câu cảnh báo, lệnh `/nhac-diem-danh`, controller cron cập nhật theo hành vi mới; commit nói lý do đổi kỳ vọng.
- [ ] Test, typecheck, lint của `api` xanh.
