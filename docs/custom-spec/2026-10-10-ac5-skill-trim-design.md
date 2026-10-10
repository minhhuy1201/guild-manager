# AC5 - Thu gọn skill tự trigger

Ngày: 2026-10-10 · Trạng thái: **spec, chưa triển khai** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md) · Làm
sau pilot

## 1. Vấn đề

`.claude/skills/` có 8 skill. 7 trong số đó là symlink vào `.agents/skills/`, thư mục được commit
(59 file).

- `design-taste-frontend`, `minimalist-ui`, `redesign-existing-projects` và `web-design-guidelines`
  cùng trigger quanh "UI / redesign / review UI".
- `supabase-postgres-best-practices` đã bị tắt trong `settings.local.json` (`skillOverrides`) của
  user, nhưng vẫn còn trong repo.
- Mô tả của mọi skill model được tự gọi nằm trong context mỗi turn. Hướng dẫn context (xem tổng
  quan), mục Auto-Invoked Skills, dẫn SkillsBench: lợi ích giảm khi task cần từ 4 skill trở lên.

Chưa đo [unknown]: mô tả skill của repo chiếm bao nhiêu token so với plugin user-scope (superpowers,
caveman). Có thể phần lớn không nằm ở repo.

## 2. Thiết kế

- Thêm `disable-model-invocation: true` cho `design-taste-frontend`, `minimalist-ui`,
  `redesign-existing-projects` và `web-design-guidelines`. Bốn skill này chỉ chạy khi user gõ
  `/tên`.
- Xoá symlink `supabase-postgres-best-practices` và thư mục nguồn của nó trong `.agents/skills/`,
  nếu không còn agent nào khác dùng (`.agents/` có thể phục vụ cả công cụ khác ngoài Claude Code;
  kiểm trước khi xoá).
- Giữ `shadcn`, `supabase` và `pr-review` ở chế độ tự trigger.

## 3. Quyết định mở

- Frontmatter nằm trong file vendored ở `.agents/skills/`. Sửa file đó thì lần cập nhật skill sau sẽ
  ghi đè. Cách khác: tắt bằng `skillOverrides` trong `.claude/settings.json` (project, được commit).
  Cần kiểm docs xem `skillOverrides` có hỗ trợ chế độ "chỉ user gọi" không [unknown].

## 4. Tiêu chí xong

`/context` trước và sau cho thấy token mô tả skill giảm. Ghi cả hai con số vào PR.

## 5. Kích thước

1 PR, khoảng 30 dòng. Nếu xoá thư mục vendored thì thêm dòng xoá.
