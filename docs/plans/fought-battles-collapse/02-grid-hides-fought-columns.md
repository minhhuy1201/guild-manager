# 02: Bảng cả bang ẩn cột trận đã đánh

Spec: [`docs/specs/2026-10-24-fought-battles-collapse.md`](../../specs/2026-10-24-fought-battles-collapse.md).

**What to build:** Bảng "Điểm danh theo ngày đánh" mặc định chỉ có cột các trận sắp tới. Cạnh nút "Chưa điểm danh" có nút bật/tắt "Đã đánh (N)"; bật lên thì các cột đã đánh và số tổng của chúng hiện lại, để admin sửa câu trả lời cũ. Nút giữ trạng thái khi chuyển trang trong app, tải lại thì về tắt.

**Blocked by:** 01 (helper tách trận, hook đồng hồ)

**Status:** done

- [x] Attendance filter store có boolean `showFought`, mặc định false, cùng vòng đời với `unansweredOnly`
- [x] Bảng lấy một danh sách trận đang hiện từ helper và `showFought`; header, hàng tổng "Cả bang", các hàng dữ liệu và số `columns` đều đọc chung danh sách đó
- [x] Nút cùng kiểu "Chưa điểm danh" (outline `lg`, nền primary khi bật, `aria-pressed`), ghi số cột đang ẩn ("Đã đánh (N)"); label đủ ngắn nên không cần `aria-label` riêng
- [x] Không có trận đã đánh thì không có nút; tất cả đã đánh thì hiện mọi cột (theo helper)
- [x] Dưới `sm` hai nút lọc nhanh nằm chung một hàng, mỗi nút cao tối thiểu 44px, không tràn ngang ở 360 rộng
- [x] Bộ lọc "Chưa điểm danh" lọc như cũ
- [x] Tới giờ đánh khi trang đang mở thì cột đó tự ẩn (khi nút đang tắt)
- [x] Test `AttendanceGrid` / `AttendanceFilters`: mặc định không có cột đã đánh; nút ghi đúng số; bấm thì cột và số tổng hiện lại; không có nút khi chưa có trận đã đánh
