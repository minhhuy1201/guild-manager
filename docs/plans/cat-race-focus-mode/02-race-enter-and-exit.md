# 02: Vào và thoát toàn màn hình ở màn đua

Spec: [`docs/specs/cat-race-focus-mode.md`](../../specs/cat-race-focus-mode.md).

**What to build:**
- **Vào và thoát:** Ở màn đợt đua đang mở, admin bấm nút "Toàn màn hình" (cap `F`) cạnh nút kết
  thúc đợt, hoặc bấm `F`. Khu vực đua phủ kín màn hình ngay tại chỗ, và trình duyệt vào toàn màn hình
  nếu cho phép. Thoát bằng `Esc`, ✕, hoặc khi trình duyệt rời toàn màn hình. Focus quay về nút.
- **Thứ bị ẩn:** Header đợt, chip hạng mục, ô thời lượng, các nút sửa danh sách và bảng người thắng
  biến mất trong lúc bật.
- **Thanh trên:** Thanh phát sóng (TRỰC TIẾP, hạng mục, số người/vé, đồng hồ) làm thanh trên, chữ to
  hơn.
- **Thân:** Đường đua chiếm `1fr` và hết chiều cao, bảng xếp hạng có độ rộng kẹp ở bên phải. Các nút
  Xáo trộn / ĐUA / Bỏ qua nằm trên một tấm kính nổi ở đáy đường đua.
- **Nền:** Cả lớp phủ dùng nền đêm của sân khấu, không đổi theo theme.
- **Không mount lại:** Vào hoặc thoát giữa lúc đang đua thì cuộc đua không chạy lại.

**Blocked by:** 01

**Status:** done

- [x] Đợt đang mở: có nút "Toàn màn hình" với cap `F`, chỉ từ `lg`. Đợt đã kết thúc: không có nút.
- [x] Bấm nút hoặc `F` thì có dialog "Đua mèo toàn màn hình" chứa thanh phát sóng và nút ĐUA. Header đợt và bảng người thắng không còn trên trang.
- [x] `F` trong ô thời lượng, hoặc kèm phím bổ trợ, không bật chế độ
- [x] `Esc` hoặc ✕ tắt chế độ và trả focus về nút. `Esc` khi đang gõ hoặc khi có dialog khác đang mở thì không tắt.
- [x] Gọi `requestFullscreen` trên `documentElement`. Nếu bị reject thì chế độ vẫn bật. `fullscreenchange` mà không còn `fullscreenElement` thì tắt chế độ.
- [x] Bật và tắt giữa lúc đang đua: canvas (mock) chỉ mount một lần
- [x] Biến `--stage-*` có hiệu lực trên gốc lớp phủ. Thanh phát sóng có biến thể chữ to cho chế độ này.
- [x] Test ở `CatRaceEventScreen` và `RaceStage`. Typecheck, lint, test xanh.
