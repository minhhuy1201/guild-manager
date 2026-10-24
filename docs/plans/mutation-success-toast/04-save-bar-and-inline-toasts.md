# 04: Toast thành công cho màn hình có thanh lưu hoặc lưu inline

**What to build:** Admin lưu đội hình, lưu tên đội, lưu hàng loạt trên lưới điểm danh, lưu bản vẽ chiến thuật, lưu ghi chú chiến thuật, xoá quân cờ tự đặt - mỗi lần lưu thành công đều có toast xác nhận, thay vì chỉ thấy thanh lưu biến mất. Cách báo lỗi hiện có (thanh lưu, dòng inline, toast) giữ nguyên.

**Blocked by:** 01 (Quy tắc mới và toast thành công trong `MutationForm`).

**Status:** done

- [x] Lưu đội hình hiện toast thành công nêu ngày; 412 (xung đột), 409 (ngày đã khoá) và 401 không raise toast thành công.
- [x] Lưu tên đội hiện toast thành công.
- [x] Lưu lưới điểm danh hiện toast thành công khi mọi ô đều ghi được; ghi một phần thì không toast thành công, dòng lỗi giữ nguyên.
- [x] Lưu bản vẽ chiến thuật (nút lưu và Ctrl/Cmd+S) hiện toast thành công.
- [x] Lưu ghi chú chiến thuật và xoá quân cờ tự đặt hiện toast thành công.
- [x] Test của các hook/màn hình liên quan kiểm tra toast thành công và không toast khi lỗi.
- [x] Test, typecheck, lint của web xanh.
