# 03: Editor vào và thoát chế độ toàn màn hình

Spec: [`docs/specs/tactic-focus-mode.md`](../../specs/tactic-focus-mode.md).

**What to build:** Admin trên màn hình rộng bấm "Toàn màn hình" (hoặc `F`) ở toolbar của editor và vẽ trong một dialog phủ kín cửa sổ: thanh trên có tên chiến thuật và chữ "Chưa lưu", rồi toolbar, palette, bản đồ, ghi chú và thanh giai đoạn. Mọi công cụ, phím tắt và hộp thoại vẫn chạy; không có gì mount lại.

**Blocked by:** 01

**Status:** done

- [x] Nút ở toolbar, trước "Xuất ảnh": icon `Maximize2`, cap `F`, `aria-label`; chữ ẩn dưới `xl`; nút ẩn dưới `lg` và khi đang bật
- [x] Dialog "Vẽ chiến thuật toàn màn hình" chứa toolbar và thanh giai đoạn; header trang không nằm trong đó
- [x] Thanh trên ghi tên và "Chưa lưu" khi bản vẽ hoặc ghi chú còn thay đổi chưa lưu
- [x] Phím tắt editor (vd. `2`, Ctrl+Z, Ctrl+S) chạy trong dialog; `F` không chạy khi đang gõ
- [x] `Esc` trong ô đổi tên giai đoạn chỉ huỷ đổi tên
- [x] `Esc`, nút thoát và `fullscreenchange` đóng chế độ; focus về nút; không hỏi lưu
- [x] Màn hình rơi xuống dưới `lg` (editor nhường chỗ cho viewer) thì chế độ tự đóng
- [x] Bật rồi tắt không mount lại canvas
