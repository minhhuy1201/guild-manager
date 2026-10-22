# 01: Token, font và brief mới

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 1 (nền tảng)

**What to build:** Mở bất kỳ trang nào cũng thấy ngay nền mới.
- Nền đá ấm có vân giấy và vân mực tĩnh. Theme tối là navy mực.
- Tiêu đề dùng Playfair Display, body vẫn là Be Vietnam Pro.
- Có token cho glow ngọc/vàng, viền sáng trong của card nổi, bo trong/ngoài khác nhau, `--ease-spring`
  và duration dài cho Ken Burns.
- Brief `design-direction.md` viết lại theo hướng "Thuỷ mặc hiện đại" 55/30/15, kèm rule
  `display.md`, `interaction.md`, `frontend.md` §6 phần token/font/motion.
- Chưa đổi component nào. Ticket này chỉ đổi token, font và nền.

**Blocked by:** None (can start immediately)

**Status:** todo

- [ ] Heading font đổi sang Playfair Display (subset `latin` + `vietnamese`, chỉ các weight dùng đến);
      `font-heading` và `font-serif` trỏ về nó. Tiêu đề tiếng Việt có dấu hiển thị đúng.
- [ ] Token mới khai báo ở cả `:root` và `.dark`. Mỗi token mới có comment nói vai trò.
- [ ] Nền plane có vân mực tĩnh và glow, không có animation.
- [ ] Ba duration và `--ease-out-soft` giữ nguyên. Thêm `--ease-spring` và một duration Ken Burns.
- [ ] Khối `--stage-*`, `.race-*` và keyframes đua mèo không đổi một byte.
- [ ] Rule reduced motion cuối `globals.css` vẫn phủ mọi animation mới.
- [ ] `design-direction.md` mới ghi cân bằng 55/30/15, ghi mục được phép và mục vẫn cấm (theo spec).
      Rule `display.md`, `interaction.md` cập nhật phần font và motion token.
- [ ] Ảnh 1440 + 420, sáng + tối, của trang điểm danh và landing cho thấy nền và font mới, không vỡ
      bố cục.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
