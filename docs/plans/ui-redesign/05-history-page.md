# 05: Trang lịch sử điểm danh

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 2 (điểm danh + lịch sử)

**What to build:** Trang lịch sử có thứ bậc rõ và không còn card lẻ loi.
- Bộ chọn tuần/trận là một dải lọc `inset` gọn.
- Card biểu đồ lấp đủ hàng dù có bao nhiêu card.
- Card Bang Chiến đánh dấu bằng cạnh nhấn primary, không còn nền xám đục.
- Bảng log dùng skin mới.

**Blocked by:** 03 (Khung app)

**Status:** todo

- [ ] Dải lọc tuần/trận dùng `Card` `inset`, vẫn là hai `Select` có `FieldLabel` đúng `htmlFor`.
- [ ] Lưới biểu đồ tự giãn theo số card: 1 card không nằm lẻ trong lưới 3 cột.
- [ ] Đánh dấu guild war bằng cạnh nhấn, không còn nền `bg-primary/5` trên card biểu đồ. Nếu đổi
      `sessionTintClass` thì kiểm lại mọi nơi dùng nó và cập nhật rule `display.md`.
- [ ] Biểu đồ giữ màu, domain X chung, icon lưu phái trên trục Y.
- [ ] Bảng log vẫn nằm trong card cùng filter (test `closest("[data-slot=card]")` vẫn đúng).
- [ ] Ảnh 1440 + 420, sáng + tối.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
