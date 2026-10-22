# 03: Sân khấu giang hồ cố định một màu

Spec: [`docs/specs/2026-10-22-cat-race-drama.md`](../../specs/2026-10-22-cat-race-drama.md) §3, §7.
Prototype: [`assets/2026-10-22-cat-race-drama-prototype.html`](../../specs/assets/2026-10-22-cat-race-drama-prototype.html).

**What to build:** Đường đua thành sân khấu y như prototype, giống hệt ở theme sáng và tối: dải trời
hoàng hôn (94px, 66px khi rộng < 600px) có trăng, hai lớp núi, chùa, dây đèn lồng đung đưa có quầng
sáng, khán giả hai hàng sau hàng rào nhún theo độ phấn khích (chờ 0.5, đếm ngược 1.6, chạy 1.2, nước
rút 3.2, về đích 4, từ 3 giơ tay), cờ mốc 25/50/75%, cột xuất phát, cổng tam quan "ĐÍCH", bảng gỗ
"ĐUA MÈO · n mèo · m người". Làn đất hai tông có đốm, vạch chia nét đứt, nét đứt dọc ở các mốc, làn
dẫn đầu phủ vàng, vạch đích ca-rô 3 cột. Cột tên nền gỗ: ô màu phái, tên (dẫn đầu vàng đậm), số hạng
khi đang đua (top 3 vàng). Kích thước theo spec §3.

Bảng màu cố định là bảng hằng trong `lib/` cho canvas, và biến CSS dưới scope sân khấu trong
`globals.css` cho DOM. Bungee nạp bằng `next/font` trong feature, chỉ trang đua mèo tải. Canvas thôi
đọc token theme và thôi theo dõi đổi theme. Ghi một dòng vào `display.md` rằng bảng màu sân khấu là
màu cố định hợp lệ.

**Blocked by:** 01

**Status:** done

- [x] Sân khấu vẽ đủ các thành phần trên, khớp prototype; dải trời vẽ sẵn ra canvas phụ khi đổi kích
      thước, không vẽ lại mỗi khung hình. (Đối chiếu bằng ảnh chụp chromium headless trên app local,
      1440px và 390px, theme sáng và tối. Sân khấu chuyển động lúc chờ được bổ sung ở vé 04.)
- [x] Đổi theme không đổi sân khấu; test "đọc lại bảng màu khi đổi theme" bỏ vì canvas không đọc token theme nữa, commit ghi lý do.
- [x] Vẫn chỉ vẽ làn trong khung nhìn với 240 mèo; `?fps` còn. Có test.
- [x] Số hạng ở cột tên chỉ hiện khi đang đua. Có test.
- [x] Bố cục đúng ở 360px và 1440px. (Test thuần trên `race-layout`; chưa xem bằng mắt.)
- [x] `pnpm --filter web test`, `typecheck`, `lint` xanh.
