# 01: Khoá trận đã đánh

**What to build:** Ở Thiết lập > Lịch đánh, trận đã qua giờ đánh (trận đã đánh) không còn sửa hay xoá được. Nút Sửa và Xoá bị disable, có tooltip nêu lý do và nhãn "Đã đánh" ngay trên dòng. Nút tự khoá đúng lúc qua giờ đánh mà không cần tải lại trang. API từ chối cùng thao tác bằng 400, và cũng từ chối tạo hoặc dời trận về giờ đã qua.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Trận có `dateTime <= now` có nút Sửa và Xoá bị disable; tooltip vẫn hiện trên nút disable và nói rõ lý do.
- [x] Nút khoá khi qua giờ đánh lúc trang đang mở.
- [x] `PATCH` và `DELETE` trên trận đó trả 400 kèm câu tiếng Việt; đổi tên đối thủ cũng bị chặn.
- [x] Tạo hoặc dời trận về giờ đã qua trả 400.
- [x] Trận chưa đánh và luật Bang Chiến giữ nguyên; khoá ở API áp cho mọi trận đã đánh, kể cả Bang Chiến.
- [x] Có test cho cả web và API.
