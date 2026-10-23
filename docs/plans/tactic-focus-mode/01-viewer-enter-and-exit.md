# 01: Viewer vào và thoát chế độ toàn màn hình

Spec: [`docs/specs/tactic-focus-mode.md`](../../specs/tactic-focus-mode.md).

**What to build:** Member mở một chiến thuật và bấm "Toàn màn hình" (hoặc phím `F`) thì viewer phủ kín cửa sổ. Tab giai đoạn, gợi ý phím mũi tên, play và onion-skin chuyển lên thanh trên. Thân màn hình chỉ còn bản đồ và ghi chú. `Esc`, nút thoát hoặc thoát toàn màn hình của trình duyệt đều đóng chế độ này. Bản đồ lúc này vẫn chỉ fit theo chiều rộng.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Test của `TacticEditorScreen` có thêm bộ đếm số lần canvas mount và stub Fullscreen API
- [x] Viewer luôn có hàng điều khiển với nút "Toàn màn hình" kèm cap `F`, kể cả chiến thuật một giai đoạn; nút ẩn dưới `lg`
- [x] Bấm nút hoặc `F` mở dialog "Xem chiến thuật toàn màn hình"; `F` không chạy khi đang gõ
- [x] Tab, gợi ý phím, play và onion-skin nằm trên thanh trên khi bật, không nằm ở thân
- [x] `Esc`, nút thoát và `fullscreenchange` đóng chế độ; focus về nút vào
- [x] `requestFullscreen` gọi trên `documentElement`; bị từ chối thì chế độ vẫn bật
- [x] Bật rồi tắt không mount lại canvas
- [x] Test của màn xếp đội, đua mèo và shell vẫn xanh, không sửa assertion
