# 04: Editor fit bản đồ theo cả hai chiều, ghi quy ước

Spec: [`docs/specs/tactic-focus-mode.md`](../../specs/tactic-focus-mode.md).

**What to build:** Chế độ toàn màn hình của editor dùng cùng cách fit hai chiều như viewer. Token thả từ palette rơi đúng chỗ thả, và thanh hành động của vùng chọn đi theo hộp bản đồ đã fit. Quy ước tương tác ghi thêm màn chiến thuật.

**Blocked by:** 02, 03

**Status:** done

- [x] Bản đồ editor fit chiều rộng và chiều cao khi bật, căn giữa, có `ring`, nền lưới và vignette
- [x] Điểm thả từ palette và thanh hành động của vùng chọn tính theo hộp đã fit
- [x] `.claude/rules/web/interaction.md` ghi thêm: một màn có hai nửa (mỗi nửa một focus mode) và bản đồ fit hai chiều
