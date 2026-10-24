# 02: Toast thành công cho dialog Cài đặt và Chiến thuật

**What to build:** Admin tạo, sửa, xoá ngày đánh; tạo, sửa, xoá chiến thuật; thêm quân cờ tự đặt - mỗi thao tác thành công đều có toast xác nhận. Lỗi vẫn hiện inline trong dialog.

**Blocked by:** 01 (Quy tắc mới và toast thành công trong `MutationForm`).

**Status:** done

- [x] Tạo, sửa, xoá ngày đánh hiện toast thành công; sửa nêu nhãn ngày, thêm trận scrim không nêu (nhãn do backend dựng).
- [x] Tạo, sửa, xoá chiến thuật hiện toast thành công nêu tên chiến thuật.
- [x] Thêm quân cờ tự đặt hiện toast thành công. Xoá giai đoạn không toast: nó chỉ sửa bản nháp trong editor, toast lúc lưu bản vẽ (ticket 04) mới là lúc ghi thật.
- [x] Test của các dialog liên quan kiểm tra toast thành công.
- [x] Test, typecheck, lint của web xanh.
