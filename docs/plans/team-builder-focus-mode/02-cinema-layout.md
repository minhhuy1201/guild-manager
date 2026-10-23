# 02: Bố cục trái/phải: 10 đội bên trái, pool bên phải

Spec: [`docs/specs/team-builder-focus-mode.md`](../../specs/team-builder-focus-mode.md).

**What to build:** Trong chế độ toàn màn hình (từ `lg`), thân lớp phủ chia hai cột. Bên trái là
grid đội hình `1fr`, hai hàng `Đội 1-5` / `Đội 6-10` luôn mở, có nhãn hàng kèm số đã xếp, không gập
được, tự cuộn. Bên phải là pool rộng `clamp(280px, 22vw, 360px)`, cao hết cột: bộ lọc và chip lớp
phái ghim ở đầu, danh sách card 2 cột tự cuộn, cả phần danh sách là vùng thả. Dưới `lg` thân lớp
phủ xếp chồng và cuộn. Bố cục ngoài trang thường và ảnh capture cho Discord không đổi.

UI: chạy skill `redesign-skill` cho bố cục, giữ quy ước trong `.claude/rules/web/`.

**Blocked by:** 01

**Status:** done

- [x] `FormationGrid` có cách hiện "luôn mở": nhãn hàng còn, không có trigger gập. `screen` và `capture` không đổi.
- [x] `MemberPool` có cách hiện "cao hết cột": bộ lọc ghim, danh sách lấp phần còn lại, card 2 cột. Cách hiện mặc định không đổi.
- [x] Kéo từ pool vào slot ở hàng dưới không phải cuộn trang. Kéo từ slot về pool thì gỡ người ra.
- [x] Test component cho hai cách hiện mới (prior art: `formation-grid.test.tsx`, `member-pool.test.tsx`). Test cũ vẫn xanh.
- [ ] Chạy app, đo chiều cao hai hàng ở 1080p, ghi kết quả vào phần Further Notes của spec (chưa đo được: không có trình duyệt trong môi trường làm việc; đã ghi rõ trong Further Notes, cần đo tay)
