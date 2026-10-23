# 03: Khung chờ riêng cho trang đăng nhập và trang giới thiệu

**What to build:** Chuyển tới trang đăng nhập thì thấy khung thẻ đăng nhập ở giữa, trên nền đúng màu
của trang (không tải ảnh). Chuyển tới trang giới thiệu thì thấy khung hero cao như hero thật. Khung
chờ chung (banner + thẻ) chỉ còn dùng cho các trang công cụ. Cả ba khung dùng chung một vỏ
`role="status"` có text "Đang tải trang", nên trình đọc màn hình đọc giống nhau.

**Blocked by:** 01 (Chuyển trang tức thì và chạy function ở Tokyo)

**Lý do hủy:** `app/loading.tsx` gốc là boundary đầu tiên nên Next chỉ prefetch khung chung; `loading.tsx` lồng trong route không bao giờ được prefetch. Đã kiểm chứng trên bản build: có boundary gốc thì prefetch `/trang-chu` trả khung chung, gỡ nó ra mới trả khung riêng. Muốn khung riêng phải bỏ boundary gốc và thêm `loading.tsx` cho từng route, tốn nhiều file và dễ quay lại lỗi cũ khi thêm route mới, nên chọn chấp nhận khung lệch bố cục thoáng qua.

**Status:** cancelled

- [ ] (hủy) Vỏ khung chờ dùng chung nằm trong một component riêng, ba khung đều dùng nó
- [ ] (hủy) Khung trang đăng nhập khớp vị trí và chiều rộng thẻ đăng nhập, nền theo màu backdrop
- [ ] (hủy) Khung trang giới thiệu khớp chiều cao hero
- [ ] (hủy) Test: mỗi khung có `status` mang text "Đang tải trang"
- [ ] (hủy) Prefetch trang giới thiệu trả về khung riêng của nó
