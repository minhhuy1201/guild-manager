# 03: Card đội bỏ vạch màu trên cùng

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md)

**What to build:** Card mỗi đội trong trang xếp team không còn vạch màu chạy sát mép trên. Vạch này bị góc bo cắt cong nên nhìn lệch. Màu đội nằm ở nền header nhạt và một chấm màu nhỏ cạnh tên đội. Viền card trung tính.

**Blocked by:** 01 (Bo góc theo thang Geist)

**Status:** done

- [x] Card đội không có phần tử nào chạm vào góc bo ở mép trên. Hai góc trên nhìn đối xứng.
- [x] Mỗi nhóm màu đội có một chấm màu cạnh tên đội, đủ tương phản ở cả sáng lẫn tối. Chấm này chỉ để trang trí (`aria-hidden`).
- [x] Bảng màu đội đổi khoá `accent` thành `marker`. Mỗi nhóm màu vẫn ghi đầy đủ class Tailwind.
- [x] Ảnh đội hình gửi Discord vẫn hiện đúng màu đội.
- [x] `pnpm --filter web typecheck`, `lint`, `test` xanh.
