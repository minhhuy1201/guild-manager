# 02: Viewer fit bản đồ theo cả hai chiều, ghi chú thu gọn được

Spec: [`docs/specs/tactic-focus-mode.md`](../../specs/tactic-focus-mode.md).

**What to build:** Trong chế độ toàn màn hình của viewer, bản đồ to nhất có thể mà vẫn thấy trọn: fit theo cả chiều rộng lẫn chiều cao, giữ tỉ lệ, căn giữa, có viền `ring`, nền lưới và vignette nhẹ. Zoom và pan tính theo hộp bản đồ đã fit. Ghi chú nằm ở một cột bên phải chỉ đọc, thu gọn được.

**Blocked by:** 01

**Status:** done

- [x] Hàm fit thuần có unit test: cửa sổ rộng bị chặn bởi chiều cao, cửa sổ cao bị chặn bởi chiều rộng, kích thước 0 hoặc âm không ra NaN
- [x] Khi bật, bản đồ có độ rộng theo hàm fit và nằm giữa; trang thường không đổi
- [x] Zoom, con lăn và pan chạy theo hộp đã fit
- [x] Cột ghi chú (khi chiến thuật có ghi chú) thu gọn và mở lại được, mặc định mở; trang thường vẫn giữ khối ghi chú cũ
