# 01: Card "Tuần này của bạn" thu gọn trận đã đánh

Spec: [`docs/specs/2026-10-24-fought-battles-collapse.md`](../../specs/2026-10-24-fought-battles-collapse.md).

**What to build:** Member mở màn Điểm danh thì card "Tuần này của bạn" chỉ hiện tile các trận sắp tới. Trận đã đánh (giờ đánh đã qua) gom vào thanh "Đã đánh · N trận" ở cuối card, kèm icon câu trả lời của member cho từng trận. Bấm thanh thì các tile đã đánh hiện bên dưới, hơi mờ, badge "Đã đánh"; bấm lần nữa thì thu lại. Trang đang mở mà tới giờ đánh thì trận đó tự chuyển vào nhóm đã đánh. Ticket này cũng đặt nền cho hai ticket sau: helper tách trận, hook đồng hồ, component thanh dùng chung.

**Blocked by:** None (can start immediately)

**Status:** in progress (còn bước xem bằng mắt)

- [x] Helper thuần tách các trận của tuần thành sắp tới và đã đánh tại một thời điểm, theo `dateTime`, giữ thứ tự; khi không còn trận sắp tới thì trả hết về sắp tới. Có unit test: giữ thứ tự, trận đã khoá nhưng chưa đánh vẫn là sắp tới, tất cả đã đánh, tuần rỗng
- [x] Hook đồng hồ trả về thời điểm hiện tại và render lại đúng lúc giờ đánh gần nhất trong tương lai trôi qua (một `setTimeout`, cùng dạng hook refresh theo deadline)
- [x] Component thanh dùng chung: nút ghost full-width (cao tự giãn khi các icon câu trả lời xuống dòng), label "Đã đánh · N trận", chỗ tuỳ chọn cho icon câu trả lời, chevron xoay bằng transform, `aria-expanded` + `aria-controls`, đóng khi mount; nội dung mở ra dùng helper reveal, không animate chiều cao
- [x] Card chỉ hiện tile sắp tới trong dải tile, sau đó là đường kẻ và thanh; thanh hiện icon câu trả lời (Có / Không / chưa trả lời) của từng trận đã đánh
- [x] Tile đã đánh giữ màu câu trả lời, mờ `opacity-70`, badge "Đã đánh" tone `muted` thay "Đã khoá" / "Còn hạn"; lý do "Không" đã ghi vẫn đọc được
- [x] Không có trận đã đánh thì không có thanh; tất cả đã đánh thì hiện mọi tile như cũ, không có thanh
- [x] Account chưa gán nhân vật cũng được thu gọn như vậy (thanh không có icon câu trả lời)
- [x] Test `MemberAttendanceCard`: tile đã đánh nằm sau thanh; thanh ghi đúng số và câu trả lời; bấm mở rồi thu lại; hai ca biên trên; đồng hồ giả vượt giờ đánh thì trận chuyển vào nhóm thu gọn
- [ ] Mở trang trên viewport 420 rộng, xem card trước và sau khi mở thanh, theme sáng và tối
