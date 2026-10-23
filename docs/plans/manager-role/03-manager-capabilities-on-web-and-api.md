# 03: Manager dùng Capability trên web và API

Spec: [`docs/specs/2026-10-22-manager-role.md`](../../specs/2026-10-22-manager-role.md).

**What to build:** Manager được cấp Capability nào thì dùng được vùng đó, cả web lẫn API. Vai trong
token có thể cũ tới một ngày, nên API đọc lại vai và Grant từ DB ở mọi request với mọi token (một
findUnique theo Discord ID) và dùng giá trị đó thay cho vai trong token: nâng vai, hạ vai hay đổi
Grant có hiệu lực ngay request kế tiếp. `/auth/me` trả vai và Grant, và `getActor` trên web đọc nó cho
mọi người đã đăng nhập. Proxy chỉ yêu cầu đã đăng nhập và không xét route quản lý theo vai; server
component của trang kiểm tra Capability từ `getActor` và đưa về trang điểm danh khi thiếu. Nav, tab bar điện thoại, user menu (đua mèo) và tab Thiết lập lọc theo Capability:
Thiết lập hiện khi có ít nhất một trong Lịch trận / Thành viên / Điểm danh & nghỉ phép, chỉ hiện tab
được cấp, `?tab=` không được cấp rơi về tab được cấp đầu tiên. Capability "Thành viên" ở ticket này
mở tab nhưng luật giới hạn ghi thuộc ticket 04.

UI: chạy skill `redesign-skill` cho phần nav và tab thay đổi.

**Blocked by:** 02

**Status:** done

- [x] Manager có Capability gọi được endpoint của vùng đó; thiếu Capability bị 403
- [x] Thu Grant thì request kế tiếp bị từ chối, không cần đăng nhập lại
- [x] Token Member cũ mà hàng đã là Quản lý có Grant thì dùng được Grant ngay request kế tiếp
- [x] `decideAccess` và bộ lọc nav có test cho Admin, Member, Manager một phần Grant
- [x] Mở thẳng route không được cấp thì về trang điểm danh
- [x] Thiết lập chỉ hiện tab được cấp; `?tab=` sai rơi về tab được cấp đầu tiên
- [x] Manager không có Grant nào thấy app y hệt Member
