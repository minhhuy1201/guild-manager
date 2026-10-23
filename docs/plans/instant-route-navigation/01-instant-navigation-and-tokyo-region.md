# 01: Chuyển trang tức thì và chạy function ở Tokyo

**What to build:** Bấm một mục trên thanh điều hướng thì trang đổi ngay sang khung chờ chung, không
còn khoảng lặng 0,5-1 giây như trước. Mọi route đều dynamic vì đọc cookie phiên, mà Next chỉ
prefetch một route dynamic tới `loading.js` gần nhất; thiếu boundary đó thì click phải chờ server
render xong. Trình đọc màn hình đọc "Đang tải trang". Cả web và API chạy function ở Tokyo (`hnd1`),
cùng region với Supabase, thay cho mặc định Washington (`iad1`).

**Blocked by:** None (can start immediately)

**Status:** in progress

- [x] Request prefetch tới một route dynamic trả về khung chờ (local: 231 B khi chưa có, 13 KB khi có)
- [x] Khung chờ có text cho trình đọc màn hình, không chỉ `aria-label`; skeleton được ẩn khỏi cây a11y
- [x] Hai project Vercel khai báo region `hnd1`
- [x] Tài liệu production, frontend và rule routing ghi lý do
- [ ] Sau deploy, header `x-vercel-id` của web và API đều ra `hnd1`
