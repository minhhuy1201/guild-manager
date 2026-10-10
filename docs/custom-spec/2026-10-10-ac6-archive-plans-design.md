# AC6 - Tách plan/spec đã xong khỏi search path

Ngày: 2026-10-10 · Trạng thái: **spec, chưa triển khai, có điều kiện** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md)

## 1. Vấn đề

`docs/superpowers` (62 file), `docs/custom-plan` (36) và `docs/custom-spec` (40) có tổng 138 file,
khoảng 3,2 MB. Phần lớn mô tả trạng thái code tại thời điểm viết. Khi agent grep tên một hàm, kết quả
trúng cả plan cũ, và agent có thể coi plan cũ là sự thật hiện tại.

Chưa có bằng chứng việc này đã xảy ra [unknown].

## 2. Điều kiện để làm

Chỉ làm khi pilot A/B cho thấy agent mở file plan/spec cũ trong ít nhất 2 trên 18 lượt, đo bằng log
Read. Nếu không đạt thì đóng spec này.

## 3. Thiết kế

- `git mv` plan/spec đã merge sang `docs/archive/<thư mục cũ>/`. Plan/spec đang mở giữ nguyên chỗ.
- Sửa các link trỏ vào chúng. Ví dụ: `apps/api/CLAUDE.md` trỏ
  `docs/superpowers/specs/2026-09-02-discord-attendance-commands-design.md` §9. Link đó phải trỏ
  sang path mới, hoặc chuyển phần nội dung còn sống vào doc sống.
- Root `CLAUDE.md` thêm một dòng: `docs/archive/` là lịch sử, không phải nguồn sự thật. Code và doc
  sống thắng khi hai bên lệch nhau.

## 4. Quyết định mở

- Tiêu chí "đã xong": PR đã merge, hay spec có trạng thái "đã triển khai"? Nhiều spec không cập nhật
  dòng trạng thái.
- Có nên chặn agent đọc `docs/archive/**` bằng `permissions.deny`? Đề xuất không: đôi khi cần đọc lịch
  sử để hiểu lý do.

## 5. Kích thước

1 PR. `git diff --shortstat` tính file đổi tên nguyên vẹn là 0 dòng, vì git nhận ra rename mặc định
từ bản 2.9 (máy đang dùng git 2.56.0). Phần thật sự đổi là link, khoảng 40 dòng.
