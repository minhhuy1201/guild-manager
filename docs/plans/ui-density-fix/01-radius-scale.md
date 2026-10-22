# 01: Bo góc theo thang Geist

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md)

**What to build:** Bo góc bớt cong trên toàn app. Khối chứa khối khác (card, banner, panel) bo 12px, phần bên trong (tab, nút, ô, chip) bo 6px, theo [Vercel Geist Materials](https://vercel.com/geist/materials) ("material-base: Radius 6px", "material-medium: Radius 12px"). Trước đây là 20px / 10px.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Token bo góc khối chứa là 12px, bo góc phần bên trong là 6px, cả sáng lẫn tối.
- [x] Không còn class bo góc lớn lẻ loi (`rounded-2xl`, `rounded-4xl`...) lệch khỏi thang. `rounded-full` cho chấm tròn, avatar, pill được giữ.
- [x] Spec và `docs/design-direction.md` ghi mức bo góc mới và lý do.
- [x] `pnpm --filter web typecheck`, `lint`, `test` xanh.
