# AC6 - Tách plan/spec đã xong khỏi search path

Ngày: 2026-10-10 · Trạng thái: **spec, đã triển khai (PR `chore/agent-context-trim`)** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md)

## 1. Vấn đề

`docs/superpowers` (62 file), `docs/custom-plan` (36) và `docs/custom-spec` (40) có tổng 138 file,
khoảng 3,2 MB. Phần lớn mô tả trạng thái code tại thời điểm viết. Khi agent grep tên một hàm, kết quả
trúng cả plan cũ, và agent có thể coi plan cũ là sự thật hiện tại.

Chưa có bằng chứng việc này đã xảy ra [unknown].

## 2. Điều kiện để làm

Điều kiện cũ (agent mở plan/spec cũ trong ít nhất 2 trên 18 lượt pilot, đo bằng log Read) **đã bỏ**:
pilot đổi sang đo tất định ngày 2026-10-11 và không đo log Read (tổng quan, mục 3). Không có bằng
chứng ủng hộ hay bác bỏ [unknown]. Làm hay đóng AC6 là quyết định của user. Nếu làm, lý do là rủi ro ở
mục 1, không phải một số đo.

## 3. Thiết kế

- `git mv` plan/spec đã merge sang `docs/archive/<thư mục cũ>/`. Plan/spec đang mở giữ nguyên chỗ.
- Tìm mọi tham chiếu bằng `git grep -nE 'docs/(superpowers|custom-plan|custom-spec)'` ngoài các thư mục
  đó (gồm comment trong code và config, không chỉ markdown), rồi sửa các link trỏ vào chúng.
  Ví dụ: `.claude/rules/api/discord.md` trỏ `docs/superpowers/specs/2026-09-02-discord-attendance-commands-design.md` §9. Link đó phải trỏ
  sang path mới, hoặc chuyển phần nội dung còn sống vào doc sống.
- Root `CLAUDE.md` thêm một dòng: `docs/archive/` là lịch sử, không phải nguồn sự thật. Code và doc
  sống thắng khi hai bên lệch nhau.

## 4. Quyết định mở

Đã chốt 2026-10-11:

- Tiêu chí "đã xong": chuyển tất cả, trừ danh sách giữ lại. Dòng trạng thái không đáng tin (AC1, AC3
  ghi "đang triển khai" dù đã merge; f14 ghi "chưa triển khai" dù đã merge ở #177). Giữ lại: tổng quan
  AC, spec AC4-AC6, plan AC5+AC6 và `2026-10-04-feature-ideas-overview.md` (bản nháp ý tưởng). Lần
  archive sau chuyển cả loạt AC khi AC4 xong.
- Không chặn `docs/archive/**` bằng `permissions.deny`, không thêm `.ignore`: đôi khi cần đọc lịch sử
  để hiểu lý do; đường dẫn `archive` và dòng trong `CLAUDE.md` báo agent đây là lịch sử.
- Link từ doc sống và code sang spec đã archive: sửa path, không chuyển nội dung.

## 5. Kích thước

1 PR. `git diff --shortstat` tính file đổi tên nguyên vẹn là 0 dòng, vì git nhận ra rename mặc định
từ bản 2.9 (máy đang dùng git 2.56.0). Phần thật sự đổi là link, khoảng 40 dòng.
