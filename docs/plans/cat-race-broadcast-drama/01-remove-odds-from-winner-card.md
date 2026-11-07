# 01: Bỏ tỉ lệ khỏi thẻ người thắng

Spec: [`docs/specs/cat-race-broadcast-drama.md`](../../specs/cat-race-broadcast-drama.md)

**What to build:** Thẻ người thắng ở cuối mỗi vòng đua không còn dòng tỉ lệ ("Thắng với 2/5 vé · tỉ
lệ 40%" / "Thắng giữa 4 người · tỉ lệ 25%") và không còn dấu "KÈO DƯỚI". Phần còn lại của thẻ giữ
nguyên: dòng hạng giải, ảnh và tên người thắng, class, "mèo #n" ở chế độ vé, hạng 2-3, nút "Đua
tiếp", confetti. Code tính tỉ lệ (`winShare`, `isUnderdog`, `oddsText`) chỉ thẻ này dùng, nên xoá
hẳn module, test của nó và CSS `.race-odds`, `.race-stamp`, keyframes `race-stamp`. Sửa lại comment
CSS của thẻ đang liệt kê thứ tự các con ("tier line, winner, class, odds, podium, button") cho khớp.

**Blocked by:** None (can start immediately)

**Model:** sonnet - đụng hơn 2 file (overlay, module tỉ lệ + test, `globals.css`, test thẻ kết quả)

**Status:** done

- [x] Thẻ người thắng không còn chữ "tỉ lệ" hay "KÈO DƯỚI" ở cả hai chế độ (thường và vé)
- [x] Module tỉ lệ và test của nó bị xoá; không còn import nào trỏ tới chúng
- [x] CSS `.race-odds`, `.race-stamp`, `@keyframes race-stamp` bị xoá; thứ tự xuất hiện so le của các con trong thẻ vẫn đúng (nút "Đua tiếp" vẫn hiện cuối)
- [x] Test thẻ kết quả: bỏ test dòng tỉ lệ và test dấu; thêm khẳng định thẻ không chứa "tỉ lệ" và "KÈO DƯỚI"; các test còn lại (hạng 2-3, confetti, avatar, khoá nút) vẫn xanh
- [x] `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` xanh
