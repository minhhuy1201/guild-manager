# Quy ước UI (pattern chung)

Các quy ước hiển thị áp dụng **toàn hệ thống** để giao diện đồng nhất. Thêm mới thì bổ sung vào đây.

## Trạng thái nhị phân → icon, không dùng chữ

Mọi cột/thẻ biểu diễn trạng thái kiểu **Có/Không, Đạt/Không, Bật/Tắt...** dùng **icon tròn có màu**, KHÔNG dùng chữ:

- **success** → tick xanh lá (`Check`, nền emerald)
- **danger** → dấu X đỏ (`X`, nền destructive)

Component dùng chung: **`components/shared/status-icon.tsx`** (`<StatusIcon tone label />`).
Bắt buộc truyền `label` để screen-reader vẫn đọc được (icon không có text hiển thị).

Đang áp dụng ở:
- Bảng điểm danh (`attendance-row` — cột từng ngày đánh, cả read-only lẫn toggle khi edit)
- Bảng lịch sử điểm danh (`attendance-log-table` — cột "Trạng thái")

> Phân biệt với `components/shared/status-badge.tsx`: badge **có chữ** dùng cho nhãn
> trạng thái mô tả (vd "Đã khóa" / "Đang mở" ở week-timeline), không phải trạng thái nhị phân.
