# 02: Vai Manager và dialog cấp Grant

Spec: [`docs/specs/2026-10-22-manager-role.md`](../../specs/2026-10-22-manager-role.md).

**What to build:** Admin đặt được một thành viên làm "Quản lý" và tick Grant cho riêng người đó ngay
trong dialog thành viên: hai nhóm checklist "Chức năng" (6 Capability) và "Command Discord" (5
command), mặc định không tick, chỉ hiện khi chọn vai Quản lý. Nhãn vai trên UI: "ADMIN", "Quản lý",
"Bang chúng"; danh sách thành viên có badge "Quản lý". Grant lưu trên hàng thành viên (hai cột mảng
enum, migration chỉ thêm). Hàm `can` đọc Grant của Manager. Sau ticket này Manager vẫn chỉ có quyền
như Member ở mọi nơi khác, vì API và web chưa nạp Grant vào actor.

UI: chạy skill `redesign-skill` cho dialog và badge, giữ quy ước trong `.claude/rules/web/`.

**Blocked by:** 01

**Status:** todo

- [ ] `GuildRole` có `MANAGER`, enum Prisma khớp enum chung (test enum-sync xanh)
- [ ] Test "chỉ có hai vai" đổi có chủ đích thành ba vai, commit message nói lý do
- [ ] `can` với Manager trả theo Grant; Grant command độc lập với Grant Capability
- [ ] Chỉ Admin ghi được vai và Grant; người khác gửi các trường đó bị từ chối
- [ ] Rời vai Manager thì hai mảng Grant về rỗng; hàng không phải Manager luôn có mảng rỗng
- [ ] Hạ Admin cuối cùng xuống Manager bị chặn
- [ ] Test component: checklist chỉ hiện khi chọn "Quản lý"
- [ ] Kiểm tra Data API grants theo `docs/production.md` §5
