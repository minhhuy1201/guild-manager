# 04: Manager và danh sách thành viên

Spec: [`docs/specs/2026-10-22-manager-role.md`](../../specs/2026-10-22-manager-role.md).

**What to build:** Manager có Capability "Thành viên" thêm được thành viên mới (luôn là Member) và
sửa được tên, class, Discord ID của một Member. Hàng của Manager khác và Admin chỉ xem được. Manager
không xóa được ai; nút xóa không hiện với Manager. Chỉ Admin đổi vai và Grant. Một lần ghi chỉ thành công khi vai của hàng vẫn như lúc
kiểm tra; nếu đổi giữa chừng thì trả 409.

UI: chạy skill `redesign-skill` cho trạng thái chỉ xem của hàng và dialog.

**Blocked by:** 03

**Status:** done

- [x] Manager tạo thành viên: vai luôn là Member dù body gửi vai khác
- [x] Manager sửa Member: chỉ tên, class, Discord ID được nhận
- [x] Manager ghi lên hàng Manager hoặc Admin bị từ chối
- [x] Manager xóa bất kỳ ai bị từ chối; nút xóa không render cho Manager
- [x] Hàng Manager/Admin hiển thị chỉ xem với Manager
