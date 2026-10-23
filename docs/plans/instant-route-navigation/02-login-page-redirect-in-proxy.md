# 02: Người đã đăng nhập mở trang đăng nhập được chuyển đi ngay

**What to build:** Thành viên đã đăng nhập bấm "Mở website" từ bot Discord (đi qua trang đăng nhập)
nhận ngay một redirect 307 tới trang họ định tới, không thấy khung chờ và không nhận `200` kèm
redirect stream. Việc này chuyển từ page sang proxy: boundary loading gốc làm mọi `redirect()` trong
page bị stream. Callback OAuth dưới trang đăng nhập vẫn chạy như cũ. Một `redirect` không an toàn
(`//host`, `/\host`, có ký tự bị trình duyệt bỏ) quay về trang điểm danh. Proxy vẫn chỉ xét có phiên
hay không, không xét vai.

Redirect Capability ở các trang quản lý và `notFound` ở route chi tiết vẫn stream (`200` rồi chuyển
phía client, hoặc noindex). Đây là quyết định có chủ ý vì chúng chỉ gặp người thiếu Grant hoặc mở
link chết, và phải ghi lại trong tài liệu frontend.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Quyết định truy cập có verdict mới cho "đã đăng nhập ở trang đăng nhập"; switch trong proxy vẫn exhaustive
- [x] Đã đăng nhập, mở trang đăng nhập có `redirect` hợp lệ: 307 tới đúng đường dẫn đó
- [x] Không có `redirect` hoặc `redirect` không an toàn: 307 về trang điểm danh
- [x] Phiên vừa được gia hạn trong proxy: redirect vẫn mang cặp cookie mới
- [x] Callback OAuth và khách chưa đăng nhập không đổi hành vi
- [x] Page đăng nhập không còn đọc phiên; test chuyển từ page sang proxy, commit nêu lý do
- [x] Kiểm tra trên bản build local với token thật: `curl` nhận 307, không phải 200
