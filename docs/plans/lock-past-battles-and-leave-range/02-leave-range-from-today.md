# 02: Chọn khoảng ngày nghỉ từ hôm nay

**What to build:** Hộp thoại xin nghỉ chọn cả khoảng ngày bằng một lịch chọn khoảng. Không ai chọn được ngày trước hôm nay (giờ VN), admin cũng vậy. Bấm một ngày rồi khai là nghỉ một ngày. Server từ chối nghỉ bắt đầu trước hôm nay với mọi người, và `docs/architecture.md` nêu luật mới.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Một nút mở lịch `range`, hiện `dd/mm → dd/mm`; các ngày trước hôm nay bị disable.
- [x] Khai khi chưa chọn ngày thì hiện lỗi "Vui lòng chọn ngày nghỉ."
- [x] `POST /leaves` trả 400 khi `startDate` trước hôm nay, với thành viên lẫn admin.
- [x] `docs/architecture.md` không còn cho admin khai nghỉ ngày đã qua.
- [x] Có test cho hành vi mới ở web và API.
