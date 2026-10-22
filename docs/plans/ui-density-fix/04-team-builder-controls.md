# 04: Panel điều khiển xếp team thẳng hàng

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md)

**What to build:** Panel điều khiển trang xếp team có bố cục cố định, không bị lệch ở bất kỳ độ rộng nào. Hàng 1 là các tab session trận, chiếm hết chiều rộng. Hàng 2 có tab Trận 1 / Trận 2 (và nút tạo/xoá trận 2) ở bên trái, nút Copy đội hình và Gửi Discord ở bên phải, cùng một đường căn. Dòng "Lưu trước khi gửi" nằm cạnh các nút, không đẩy layout xuống.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Hàng session luôn chiếm hết chiều rộng panel, các card session cao bằng nhau.
- [x] Hàng thứ hai: điều khiển trận bên trái, nút thao tác bên phải, căn giữa theo chiều dọc. Khi không có điều khiển trận, nút thao tác vẫn nằm bên phải.
- [x] Khi có thay đổi chưa lưu, dòng nhắc hiện ra mà các nút không bị nhảy sang dòng khác ở desktop.
- [x] Điện thoại: các nút chia đều một hàng, nút copy dùng tên ngắn như cũ.
- [x] Thứ tự DOM vẫn là thứ tự nhìn thấy, nên focus đi theo mắt.
- [x] Ngày đã đánh xong vẫn hiện dòng "chỉ xem lại được" thay cho các nút.
- [x] `pnpm --filter web typecheck`, `lint`, `test` xanh.
