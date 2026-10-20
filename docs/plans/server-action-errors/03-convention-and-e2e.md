# 03: Chốt quy ước và kiểm tra trên bản build production

**What to build:** Người viết Server Action tiếp theo biết phải trả lỗi dưới dạng giá trị, và có bằng
chứng fix chạy trên bản build production chứ không chỉ ở dev.

- Thêm quy ước vào rule data-flow của web, ghi lý do vào tài liệu frontend: lỗi ném ra từ Server Action
  mất message ở production, có dẫn nguồn React/Next.
- Kiểm tra end to end: build và chạy web ở chế độ production, nối với API local chưa đặt kênh thông
  báo chung. Bấm "Đăng tổng kết lên Discord" thì toast hiện "Chưa đặt kênh thông báo chung...".

**Blocked by:** 01, 02

**Status:** một phần - phần tài liệu xong; hai mục kiểm tra trên bản build production cần API local có database, chưa chạy

- [x] Rule data-flow có quy ước mới. Tài liệu frontend có lý do và nguồn.
- [ ] Bản build production local hiện đúng câu backend khi announce lỗi. Ghi kết quả vào PR.
- [ ] Bản build production local: access token hết hạn thì bấm điểm danh sẽ làm mới phiên (toast
      "Phiên đăng nhập vừa được làm mới...").
