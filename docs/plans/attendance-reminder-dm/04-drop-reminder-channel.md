# 04: Bỏ mục đích channel `ATTENDANCE_REMINDER`

Spec: [`docs/specs/attendance-reminder-dm.md`](../../specs/attendance-reminder-dm.md)

Đọc trước: spec ở trên (Implementation Decisions, "Bỏ mục đích channel" và "Migration dữ liệu"),
`.claude/rules/prisma.md`, model `BotChannel` trong schema Prisma, service channel của bot, lệnh
`/cau-hinh-kenh` và spec của nó.

**What to build:** `/cau-hinh-kenh` không còn lựa chọn "Nhắc điểm danh" và bắt admin chọn mục đích.
Câu xác nhận khi đặt channel cảnh báo admin nói channel đó nhận cả lỗi lẫn danh sách người không nhận
được tin nhắc. Row cấu hình channel nhắc cũ bị xoá khỏi database.

**Blocked by:** 02 - Cron và `/nhac-diem-danh` gửi Attendance reminder qua DM (sau 02 không code nào
còn đọc mục đích này).

**Model:** opus - migration xoá dữ liệu đã lưu trên production.

**Status:** todo

- [ ] `ATTENDANCE_REMINDER` bị bỏ khỏi union mục đích channel; không còn tham chiếu nào trong `apps/api/src` ngoài code Prisma sinh ra.
- [ ] `/cau-hinh-kenh`: bỏ lựa chọn và câu xác nhận của mục đích nhắc; option `muc-dich` thành bắt buộc, không còn mặc định.
- [ ] Câu xác nhận `ADMIN_ALERT` (`saved`) thành "Đã lưu. Từ giờ bot sẽ báo lỗi và danh sách người không nhận được tin nhắc điểm danh trong channel này."
- [ ] Migration tạo bằng `pnpm --filter api prisma:migrate` (DB local), chỉ chứa `DELETE FROM "BotChannel" WHERE "purpose" = 'ATTENDANCE_REMINDER';`, không đổi schema, đúng `.claude/rules/prisma.md`. Không chạy `migrate deploy` lên production.
- [ ] Spec `/cau-hinh-kenh` và service channel cập nhật theo hành vi mới.
- [ ] Test, typecheck, lint của `api` xanh.
- [ ] Ghi chú cho PR: sau deploy chạy `pnpm --filter api discord:register` (option đổi thành bắt buộc).
