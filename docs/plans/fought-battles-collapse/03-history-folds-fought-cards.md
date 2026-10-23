# 03: Dashboard Lịch sử thu gọn card trận đã đánh

Spec: [`docs/specs/2026-10-24-fought-battles-collapse.md`](../../specs/2026-10-24-fought-battles-collapse.md).

**What to build:** Ở màn Lịch sử điểm danh, khi đang xem tuần này và chưa chọn trận cụ thể, các card biểu đồ của trận đã đánh gom vào thanh "Đã đánh · N trận" dưới các card trận sắp tới; bấm thì hiện lại. Tuần cũ hiện đầy đủ như trước. Chọn một trận ở ô "Ngày đánh" thì luôn hiện trận đó. Bảng log giữ nguyên.

**Blocked by:** 01 (helper tách trận, hook đồng hồ, component thanh)

**Status:** done

- [x] Thu gọn chỉ áp dụng khi ô "Ngày đánh" là "Tất cả"; tuần cũ toàn trận đã qua nên helper tự để nguyên, không cần kiểm tra tuần riêng
- [x] Dùng component thanh của ticket 01, không có icon câu trả lời; card mở ra dùng helper reveal và giữ cách chia cột của lưới card
- [x] Không có trận đã đánh thì không có thanh; tất cả đã đánh thì hiện mọi card
- [x] Bảng log và ô chọn tuần không đổi
- [x] Test `AttendanceSummaryDashboard`: card đã đánh thu gọn ở tuần này; tuần cũ không thu gọn; trận đã đánh được chọn thì vẫn hiện
