# 06: Thẻ kết quả theo nhịp, tỉ lệ, kèo dưới, confetti theo bậc

Spec: [`docs/specs/2026-10-22-cat-race-drama.md`](../../specs/2026-10-22-cat-race-drama.md) §6.
Prototype: [`assets/2026-10-22-cat-race-drama-prototype.html`](../../specs/assets/2026-10-22-cat-race-drama-prototype.html).

**What to build:** Thẻ kết quả y như prototype: lớp phủ tối, viền và quầng sáng theo màu bậc, các dòng
hiện lần lượt (60, 260, 520, 680, 900, 1100ms), tên người thắng phóng từ 2.2 về 1. Dòng: bậc + hạng
mục ("GIẢI ĐẶC BIỆT · <tên giải>" với icon bậc R5); avatar Discord và tên người thắng (Bungee); phái
(kèm "mèo #n" khi nhiều vé); tỉ lệ ("Thắng với x/y vé · tỉ lệ z%" chế độ Vé, "Thắng giữa n người · tỉ lệ
z%" chế độ thường); hạng 2 và 3 từ thứ hạng cuối; nút "Đua tiếp". Tem "KÈO DƯỚI" khi tỉ lệ < 1 / số
người và số người > 2. Confetti theo bậc như spec §6.

**Blocked by:** 01

**Status:** todo

- [ ] Tỉ lệ đúng ở hai chế độ, một chữ số thập phân. Có test thuần trên lớp `lib/`.
- [ ] Tem kèo dưới đúng ngưỡng, kể cả 2 người. Có test.
- [ ] Hạng 2-3 lấy từ thứ hạng cuối; thiếu thì không hiện. Có test.
- [ ] Confetti đúng số hạt và số đợt theo bậc; không confetti khi giảm chuyển động. Có test.
- [ ] Giữ avatar và fallback chữ cái đầu; test cũ của thẻ kết quả cập nhật.
- [ ] `pnpm --filter web test`, `typecheck`, `lint` xanh.
