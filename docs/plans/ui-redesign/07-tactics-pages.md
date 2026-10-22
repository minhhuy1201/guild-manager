# 07: Trang chiến thuật

Spec: [`docs/specs/2026-10-22-ui-redesign.md`](../../specs/2026-10-22-ui-redesign.md) · PR 4 (chiến thuật + thiết lập)

**What to build:**
- Danh sách chiến thuật là lưới card. Mỗi card ghi tên, số giai đoạn và lần sửa cuối.
- Card nổi nhẹ khi hover, viền sáng theo con trỏ (spotlight).
- Sửa/xoá vẫn nằm trên card.
- Editor và viewer theo bề mặt mới, nhóm công cụ trên toolbar tách bằng nền.

**Blocked by:** 03 (Khung app)

**Status:** todo

- [ ] Cả card vẫn là một `Link` với overlay `absolute inset-0`. `RowActions` vẫn nằm trên overlay.
      Focus ring vẫn hiện trên card.
- [ ] Spotlight: hook client ghi vị trí con trỏ vào CSS variable, chỉ bật với `pointer: fine`, tắt
      khi reduced motion. Có test hook.
- [ ] Lưới co về một cột trên điện thoại, không cuộn ngang.
- [ ] Editor: khung, toolbar, palette, notes, stage bar theo token mới. Canvas Konva không đổi. Phím
      tắt và `Kbd` không đổi. Mỗi nhóm palette vẫn có viền và tint riêng (test palette xanh).
- [ ] Viewer (không phải admin) theo bề mặt mới.
- [ ] Rule "row that opens a page" trong `interaction.md` cập nhật cho card lưới và spotlight.
- [ ] Ảnh 1440 + 420, sáng + tối, danh sách và editor.
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh.
