# 03: Toast thành công cho dialog Đua mèo

**What to build:** Admin tạo đợt đua, chọn người tham gia, thêm/sửa/xoá giải, chọn entrants, huỷ vòng, kết thúc đợt - mỗi thao tác thành công đều có toast xác nhận. Lỗi vẫn hiện inline trong dialog.

**Blocked by:** 01 (Quy tắc mới và toast thành công trong `MutationForm`).

**Status:** done

- [x] Tạo đợt đua và kết thúc đợt hiện toast thành công; tạo đợt nêu tên khi có đặt tên, kết thúc đợt không nêu tên vì nút chỉ nhận id.
- [x] Lưu người tham gia và entrants hiện toast thành công.
- [x] Thêm, sửa, xoá giải hiện toast thành công nêu tên giải.
- [x] Huỷ vòng hiện toast thành công.
- [x] Công tắc "Hiện ở trang chủ" hiện toast khi bật và khi tắt. Bốc thăm vòng đua không toast: kết quả là phần diễn hoạt của màn hình, toast sẽ lộ người thắng.
- [x] Test của các dialog liên quan kiểm tra toast thành công.
- [x] Test, typecheck, lint của web xanh.
