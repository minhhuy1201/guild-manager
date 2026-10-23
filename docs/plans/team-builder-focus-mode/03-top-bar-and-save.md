# 03: Thanh trên, thanh lưu và lớp hoàn thiện

Spec: [`docs/specs/team-builder-focus-mode.md`](../../specs/team-builder-focus-mode.md).

**What to build:** Thanh trên của chế độ toàn màn hình có đủ: tên trận, chọn trận 1/2, dòng báo
người vắng thu gọn kèm nút gỡ, nút ✕ có cap `Esc`. Kiểu kính tối giống site header. Có thay đổi chưa
lưu thì `UnsavedChangesBar` sticky ở đáy cột grid (Đặt lại / Hoàn tác / Lưu, kèm lỗi lưu). Lớp phủ
fade opacity `--duration-base`, vùng grid có vignette radial tĩnh, pool nền lõm có `border-l`. Quy
ước mới được ghi vào `.claude/rules/web/interaction.md`.

UI: chạy skill `redesign-skill` cho thanh trên và lớp hoàn thiện, giữ quy ước trong `.claude/rules/web/`.

**Blocked by:** 02

**Status:** todo

- [ ] Đổi trận 1/2 ngay trong chế độ, không thoát ra
- [ ] Có người vắng thì thấy dòng báo và gỡ được trong chế độ
- [ ] Có thay đổi thì thanh lưu hiện trong lớp phủ. `Ctrl/Cmd+S`, `Ctrl/Cmd+Z` chạy. Lớp phủ "Đang lưu đội hình..." vẫn che grid khi lưu.
- [ ] Hộp thoại xung đột khi lưu hiện trên lớp phủ
- [ ] Grid không có hiệu ứng xuất hiện. Motion chỉ dùng token, và reduced motion được tôn trọng (rule chung ở `globals.css`).
- [ ] `.claude/rules/web/interaction.md` có mục chế độ toàn màn hình
- [ ] Test ở `TeamBuilderScreen`: match tabs, absent banner, thanh lưu nằm trong dialog. Typecheck, lint, test xanh.
