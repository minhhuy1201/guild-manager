# 01: Quy tắc mới và toast thành công trong `MutationForm`, áp dụng cho Thành viên

**What to build:** Mọi thao tác ghi thành công đều có toast xác nhận, không chỉ thao tác "không có kết quả nhìn thấy". Dialog ghi dữ liệu nhận một câu báo thành công và tự raise toast sau khi ghi xong; lỗi vẫn hiện inline trong form như hiện tại, vì form còn mở và lỗi nằm cạnh ô nhập. Lát cắt đầu tiên: admin tạo, sửa, xoá thành viên thấy toast thành công.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Quy tắc "Feedback after a write → a toast" trong `.claude/rules/web/interaction.md` nói: mọi write thành công raise `toastSuccess`; lỗi trong dialog giữ dòng inline, lỗi ngoài dialog theo chỗ hiện có (thanh lưu, dòng inline, toast).
- [x] Lý do của quy tắc mới ghi trong `apps/web/docs/frontend.md`.
- [x] `MutationForm` và `MutationDialog` nhận câu báo thành công (bắt buộc, để dialog mới không quên); toast chỉ raise sau khi write resolve, không raise khi lỗi hoặc khi `recoverSession` xử lý 401.
- [x] Dialog nào đã tự gọi `toastSuccess` trong `run` (khai nghỉ, huỷ nghỉ, mở lại điểm danh) chuyển sang prop mới, không toast hai lần.
- [x] Tạo, sửa, xoá thành viên hiện toast thành công có tên thành viên.
- [x] Test `MutationForm`: toast khi thành công; không toast khi lỗi; không toast khi phiên hết hạn.
- [x] Test, typecheck, lint của web xanh.
