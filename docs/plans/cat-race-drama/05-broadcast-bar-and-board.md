# 05: Thanh "TRỰC TIẾP" và bảng xếp hạng trượt

Spec: [`docs/specs/2026-10-22-cat-race-drama.md`](../../specs/2026-10-22-cat-race-drama.md) §5.
Prototype: [`assets/2026-10-22-cat-race-drama-prototype.html`](../../specs/assets/2026-10-22-cat-race-drama-prototype.html).

**What to build:** Phía trên sân khấu, thay dòng "Hạng mục: …", là thanh kiểu truyền hình: "TRỰC TIẾP"
(nhấp nháy khi đang đua, xám khi không), tên hạng mục kèm icon và màu bậc, "n người · m vé" (chế độ
Vé) hoặc "n người", đồng hồ giây chạy trong lúc đua. Bảng xếp hạng dùng màu sân khấu; hàng trượt tới
chỗ mới trong 280ms (FLIP, chỉ `transform`); ▲ ngọc / ▼ sơn mài so với lần cập nhật trước; khoảng
cách "-1,2" theo thân mèo; top 3 nền vàng, bạc, đồng; hàng dẫn đầu nền ấm; cập nhật mỗi 300ms. Đường
đua gửi kèm khoảng cách theo thân (phụ thuộc chiều rộng canvas).

**Blocked by:** 01

**Status:** todo

- [ ] Thanh trên hiện đúng nội dung ở cả hai chế độ; "TRỰC TIẾP" chỉ sáng khi đang đua. Có test.
- [ ] Bảng hiện ▲▼, khoảng cách theo thân (một chữ số thập phân, dấu phẩy), top 3. Có test.
- [ ] Giảm chuyển động: bảng không trượt.
- [ ] Test cũ về dòng "Hạng mục: …" cập nhật theo thanh mới.
- [ ] `pnpm --filter web test`, `typecheck`, `lint` xanh.
