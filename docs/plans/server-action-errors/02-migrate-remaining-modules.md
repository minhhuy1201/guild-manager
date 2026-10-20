# 02: Mọi Server Action còn lại trả lỗi dưới dạng giá trị

**What to build:** Trên production, mọi màn còn lại hiện đúng câu lỗi của backend, và các nhánh xử lý
lỗi theo status chạy đúng như ở dev:

- Điểm danh và nghỉ phép: toast hiện câu backend. Access token hết hạn qua đêm thì 401 kích hoạt
  `recoverSession` (fix ở #81 đến giờ chưa từng chạy trên prod).
- Xếp team: nhánh 412 (phiên bản cũ) và 409 (ngày đã khoá) của bản nháp đội hình và tên đội chạy được.
- Thành viên, lịch đánh, chiến thuật: dialog hiện câu lỗi backend.
- Auth: `fetchMe` trả `ActionResult`. Hook phiên phía client nhận đúng 401. Header phía server đọc kết
  quả theo `ok`, không `catch` nữa.

Áp dụng đúng cơ chế của ticket 01. `logout` không gọi API nên giữ nguyên.

**Blocked by:** 01 - Lỗi của Server Action đua mèo hiện đúng câu backend trên production

**Status:** done

- [x] Không còn hàm nào trong module `"use server"` gọi API mà vẫn ném `ApiError` ra client.
- [x] Mọi hook gọi server action đi qua adapter của ticket 01.
- [x] Code client đang kiểm tra `ApiError` / `statusCode` giữ nguyên và test của nó vẫn xanh.
- [x] Test api và test hook có mock module api được cập nhật theo hình dạng mới.
- [x] `pnpm --filter web test`, `typecheck`, `lint` xanh.
