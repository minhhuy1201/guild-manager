# 03: Manager dùng Capability trên web và API

Spec: [`docs/specs/2026-10-22-manager-role.md`](../../specs/2026-10-22-manager-role.md).

**What to build:** Manager được cấp Capability nào thì dùng được vùng đó, cả web lẫn API. API đọc
Grant từ DB mỗi request khi người gọi là Manager (Admin và Member không tốn thêm lần đọc), nên thu
quyền có hiệu lực ngay request kế tiếp. `/auth/me` trả Grant. Proxy vẫn chặn Member khỏi route quản
lý theo vai, cho Manager đi qua; server component của trang kiểm tra Capability và đưa về trang điểm
danh khi thiếu. Nav, tab bar điện thoại, user menu (đua mèo) và tab Thiết lập lọc theo Capability:
Thiết lập hiện khi có ít nhất một trong Lịch trận / Thành viên / Điểm danh & nghỉ phép, chỉ hiện tab
được cấp, `?tab=` không được cấp rơi về tab được cấp đầu tiên. Capability "Thành viên" ở ticket này
mở tab nhưng luật giới hạn ghi thuộc ticket 04.

UI: chạy skill `redesign-skill` cho phần nav và tab thay đổi.

**Blocked by:** 02

**Status:** todo

- [ ] Manager có Capability gọi được endpoint của vùng đó; thiếu Capability bị 403
- [ ] Thu Grant thì request kế tiếp bị từ chối, không cần đăng nhập lại
- [ ] `decideAccess` và bộ lọc nav có test cho Admin, Member, Manager một phần Grant
- [ ] Mở thẳng route không được cấp thì về trang điểm danh
- [ ] Thiết lập chỉ hiện tab được cấp; `?tab=` sai rơi về tab được cấp đầu tiên
- [ ] Manager không có Grant nào thấy app y hệt Member
