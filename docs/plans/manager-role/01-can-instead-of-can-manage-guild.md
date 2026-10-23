# 01: Đổi `canManageGuild` sang `can`

Spec: [`docs/specs/2026-10-22-manager-role.md`](../../specs/2026-10-22-manager-role.md).

**What to build:** Prefactor, không đổi hành vi. Thêm vào `packages/shared` enum `Capability` (6
giá trị) và `GrantableCommand` (5 command admin), kèm nhãn tiếng Việt theo thứ tự hiển thị. Thêm hàm
`can(actor, capability)` và `canRunCommand(actor, command)`; actor mang vai và Grant. Mỗi chỗ đang
gọi `canManageGuild` (API và web) chuyển sang `can` với đúng Capability của vùng đó. `AdminGuard`
thành guard Capability dùng kèm decorator khai báo Capability. `requireAdmin` của bot thành kiểm tra
theo `GrantableCommand`. Xóa `canManageGuild`. Ba việc chỉ Admin làm (đổi vai, đổi Grant, xóa thành
viên) giữ kiểm tra vai Admin rõ ràng. Chưa có vai Manager nên Admin và Member chạy y như cũ.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `can` / `canRunCommand` có test dạng bảng: Admin luôn true, Member luôn false
- [x] Không còn tham chiếu `canManageGuild` hay `AdminGuard` trong code (chỉ còn trong spec, ticket và tài liệu lịch sử)
- [x] Test guard của từng controller khẳng định đúng Capability mỗi route ghi
- [x] Toàn bộ test, typecheck, lint của api, web, shared xanh, không test hành vi nào phải đổi
