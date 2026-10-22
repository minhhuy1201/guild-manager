# 06: Trang xếp team

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 3 (xếp team)

**What to build:** Trang xếp team có thứ bậc rõ.
- Tab trận, tab match và toolbar gom thành một vùng điều khiển.
- Headline đội hình là băng rôn viền vàng mảnh.
- Cột đội có header rõ, ô slot dịu, màu đội làm accent.
- Member pool là khay dưới đội hình.
- Kéo thả có vùng thả sáng rõ.
- Tab trận đang chọn ở theme tối hết lệch tông.

**Blocked by:** 03 (Khung app)

**Status:** todo

- [ ] Vùng điều khiển gồm `SessionTabs`, `MatchTabs` và `FormationToolbar` gom thành một khối.
      Hành vi, phím tắt, tooltip và lý do disable giữ nguyên.
- [ ] Tab trận đang chọn dùng bề mặt `primary` khớp theme tối, không ra khối xanh nhạt lạc tông.
- [ ] Headline đội hình là băng rôn viền vàng mảnh. Chữ composed từ `banner-title` không đổi.
- [ ] Cột đội: màu đội từ `team-colors` làm accent. Chữ luôn `foreground`. Trên điện thoại vẫn một đội
      một lúc qua `TeamSwitcher`, các đội khác `max-md:hidden`.
- [ ] Drag: vẫn kích hoạt sau 8px (chuột) hoặc 250ms (chạm). Không `touch-none` trên card. Vùng thả
      có highlight rõ. Lưới đội hình không reveal.
- [ ] Bản `capture` (ảnh Discord) không đổi bố cục: 5 cột, 10 đội, banner cao, không chip. Test capture
      sheet xanh.
- [ ] Undo, save bar, Ctrl+S/Ctrl+Z, xung đột lưu không đổi.
- [ ] Ảnh 1440 + 420 + 360, sáng + tối, có cả lúc đang kéo.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
