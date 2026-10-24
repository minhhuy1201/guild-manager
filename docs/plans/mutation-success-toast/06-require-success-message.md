# 06: Bắt buộc `successMessage` trên dialog ghi dữ liệu

**What to build:** Sau khi mọi dialog đã chuyển sang câu báo thành công, prop này thành bắt buộc để dialog mới không thể quên toast. Người dùng không thấy gì thay đổi thêm.

**Blocked by:** 02 (Cài đặt và Chiến thuật), 03 (Đua mèo).

**Status:** done

- [x] `successMessage` (kiểu `string | null`) là prop bắt buộc của `MutationForm`, `MutationDialog` và `ConfirmDeleteDialog`.
- [x] Mọi chỗ dùng đều truyền `successMessage`. `stage-bar` (xoá giai đoạn trên bản nháp) truyền `null` kèm lý do.
- [x] Test, typecheck, lint của web xanh.
