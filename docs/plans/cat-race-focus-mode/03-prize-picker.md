# 03: Chọn hạng mục trên thanh phát sóng

Spec: [`docs/specs/cat-race-focus-mode.md`](../../specs/cat-race-focus-mode.md).

**What to build:** Trong chế độ toàn màn hình, nhãn hạng mục trên thanh phát sóng thành một ô chọn.
Người xem vẫn thấy nhãn như cũ (icon bậc, "Bậc · Tên"). Admin bấm vào thì thấy danh sách mọi hạng
mục. Hạng mục không đua được thì bị làm mờ, kèm lý do khoá. Chọn một hạng mục thì vòng tiếp theo là
của hạng mục đó, giống như bấm chip hạng mục ngoài trang. Ô chọn bị khoá khi đang rút, đang đua hoặc
đang hiện kết quả. Ngoài chế độ này thì thanh phát sóng vẫn hiện nhãn tĩnh như cũ.

**Blocked by:** 02

**Status:** todo

- [ ] Trong chế độ: chọn một hạng mục khác thì thanh phát sóng và nút ĐUA đổi theo hạng mục đó
- [ ] Hạng mục bị khoá có trong danh sách, không chọn được, và có kèm lý do
- [ ] Ô chọn bị khoá khi `stage` khác `idle`
- [ ] Ngoài chế độ thì không có ô chọn
- [ ] Test ở `CatRaceEventScreen`. Typecheck, lint, test xanh.
