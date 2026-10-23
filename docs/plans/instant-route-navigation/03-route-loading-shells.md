# 03: Khung chờ riêng cho trang đăng nhập và trang giới thiệu

**What to build:** Chuyển tới trang đăng nhập thì thấy khung thẻ đăng nhập ở giữa, trên nền đúng màu
của trang (không tải ảnh). Chuyển tới trang giới thiệu thì thấy khung hero cao như hero thật. Khung
chờ chung (banner + thẻ) chỉ còn dùng cho các trang công cụ. Cả ba khung dùng chung một vỏ
`role="status"` có text "Đang tải trang", nên trình đọc màn hình đọc giống nhau.

**Blocked by:** 01 (Chuyển trang tức thì và chạy function ở Tokyo)

**Status:** todo

- [ ] Vỏ khung chờ dùng chung nằm trong một component riêng, ba khung đều dùng nó
- [ ] Khung trang đăng nhập khớp vị trí và chiều rộng thẻ đăng nhập, nền theo màu backdrop
- [ ] Khung trang giới thiệu khớp chiều cao hero
- [ ] Test: mỗi khung có `status` mang text "Đang tải trang"
- [ ] Prefetch trang giới thiệu trả về khung riêng của nó
