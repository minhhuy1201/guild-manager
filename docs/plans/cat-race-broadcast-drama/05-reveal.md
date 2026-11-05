# 05: Màn công bố "Kết quả chính thức"

Spec: [`docs/specs/cat-race-broadcast-drama.md`](../../specs/cat-race-broadcast-drama.md)

**What to build:** Sau ảnh đích, trước khi thẻ người thắng mở, có màn **Reveal**. Màn tối lại (nền tối
hơn nền của thẻ), rồi lần lượt:

| Lúc | Hiện |
|---|---|
| 0 ms | "KẾT QUẢ CHÍNH THỨC" (chữ display vàng, hiệu ứng `race-slam`) |
| 1100 ms | "HẠNG 3 · {tên}" (nhãn màu đồng) |
| 2000 ms | "HẠNG 2 · {tên}" (nhãn màu bạc) |
| 2900 ms | "VÀ VỀ NHẤT LÀ..." |
| 4000 ms | chớp sáng (`race-flash` sẵn có), thẻ người thắng mở |

Tên hạng 2-3 lấy từ cùng nguồn với dòng hạng 2-3 của thẻ (`podiumOf` trên thứ hạng cuối của script).
Hạng nào không có (ít hơn 3 mèo, hoặc không có script) thì bỏ nhịp đó, nhưng mốc thời gian của các
nhịp còn lại giữ nguyên. Bấm vào màn công bố hoặc nhấn `S` thì nhảy thẳng tới thẻ, không chớp sáng.
Phím `S` dùng cùng các guard với phím `S` của "Bỏ qua": bỏ qua khi đang gõ trong field, khi có phím
bổ trợ, hoặc khi `defaultPrevented`. Reduced motion thì mở thẻ ngay. Màn công bố vẫn chạy khi admin đã
bấm "Bỏ qua" trong lúc đua. Confetti chỉ bắn khi thẻ mở. Thẻ giữ nguyên markup và CSS (đã bỏ tỉ lệ ở
ticket 01). Mọi keyframe và thời lượng mới đặt trong khối `--stage-*` của `globals.css`.

Bản tham chiếu đang chạy nằm ở `features/cat-race/prototype/dramatic-result-overlay.tsx`. Bản đó chưa
có skip bằng `S` hay bấm; bản thật thêm phần này.

**Blocked by:** 01 (Bỏ tỉ lệ khỏi thẻ người thắng)

**Model:** sonnet - thêm các nhịp theo thời gian, phím tắt, rẽ nhánh reduced motion

**Status:** todo

- [ ] Test (fake timers, như các test confetti sẵn có): các nhịp hiện đúng thứ tự và đúng mốc; thẻ chưa hiện trước 4000 ms và hiện sau đó
- [ ] Test: thiếu hạng 3 (hai mèo) thì không có dòng "HẠNG 3"; không có script thì không có dòng hạng nào nhưng thẻ vẫn mở
- [ ] Test: bấm vào màn công bố, hoặc nhấn `S`, thì thẻ hiện ngay; `S` trong một ô nhập hay kèm Ctrl thì không có tác dụng
- [ ] Test: reduced motion thì thẻ hiện ngay và không có confetti (như hiện nay)
- [ ] Test: confetti không bắn trước khi thẻ mở, bắn khi thẻ mở
- [ ] Test `RaceStage` hiện có ("shows the winner card when the replay ends...") vẫn xanh, hoặc được cập nhật để chờ qua màn công bố
- [ ] `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` xanh
