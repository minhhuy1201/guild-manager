# 04: Mèo pixel phi nước đại, phụ kiện theo phái, hiệu ứng tốc độ

Spec: [`docs/specs/2026-10-22-cat-race-drama.md`](../../specs/2026-10-22-cat-race-drama.md) §4.
Prototype: [`assets/2026-10-22-cat-race-drama-prototype.html`](../../specs/assets/2026-10-22-cat-race-drama-prototype.html).

**What to build:** Mèo y như prototype: sprite 14 × 10 ô (2 hàng phụ kiện theo phái, 6 hàng thân có 3
sọc vằn tối hơn 28%, 2 hàng chân), 4 frame chân, nhịp chân theo thời gian đua (chậm lại trong slow-mo),
frame chẵn nhún lên, đứng frame 0 lúc chờ. Phụ kiện: Cửu Linh quả cầu, Huyết Hà lông vũ đỏ, Long Ngâm
sừng vàng, Thần Tướng nón lá, Thiết Y mũ sắt, Toái Mộng trăng khuyết, Tố Vấn hoa; bản vẽ từng ô chép
đúng prototype. Con dẫn đầu đội vương miện pixel. Vệt gió khi tốc độ tức thời > 1.12; bụi sau chân
tối đa 420 hạt, tỉ lệ sinh giảm theo số mèo. Ảnh đích dùng cùng sprite.

**Blocked by:** 03

**Status:** done

- [x] Sprite mới thay sprite cũ; mỗi phái có phụ kiện riêng; bộ nhớ đệm theo (phái, chiều rộng,
      frame). Có test trên lớp `lib/`.
- [x] Vương miện chỉ trên con dẫn đầu khi đang đua. Có test.
- [x] Vệt gió và bụi chỉ khi đang chạy; số hạt không vượt 420. Có test.
- [ ] 240 mèo khoảng 60fps trên laptop phổ thông (đo bằng `?fps`, ghi kết quả vào commit hoặc PR). Chưa đo: không đo được trên trình duyệt (not measured in a browser).
- [x] `pnpm --filter web test`, `typecheck`, `lint` xanh.
