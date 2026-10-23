# Đua mèo - Khán giả hò hét, mèo kêu "meow" và đèn giao thông

Ngày: 2026-10-23 · Trạng thái: **approved** (người dùng duyệt, 2026-10-23)
· Nối tiếp: [`2026-10-22-cat-race-drama.md`](2026-10-22-cat-race-drama.md) §2 (đếm ngược) và §3
(sân khấu). Chỉ sửa web; không đổi API, không migration.

## Problem Statement

Màn đua đã có khán giả pixel nhún theo độ hồi hộp, nhưng họ câm: người xem không "nghe" thấy sân
khấu phản ứng khi đổi ngôi hay vào nước rút. Mèo cũng câm. Đếm ngược dùng 3 đèn lồng đỏ, đỏ, vàng;
người xem không đọc ngay được "sắp chạy" như đèn giao thông.

## Solution

- **Bong bóng thoại của khán giả**: trong lúc đua, bong bóng nhỏ bật lên trên đầu khán giả trong dải
  trời, nổi lên rồi mờ dần. Câu hô theo diễn biến: đếm số khi đếm ngược, "Chạy điii!" khi xuất phát,
  hô tên mèo mới dẫn đầu khi đổi ngôi, hò hét khi nước rút, "Ảnh! Ảnh!" khi về đích. Giữa các cue thì
  câu cổ vũ chung, nhiều hơn khi độ hồi hộp tăng.
- **Bong bóng "meow" của mèo**: bám theo con mèo trên đường đua. Mèo ngẫu nhiên trong tầm nhìn kêu
  "meow", "meo meo"...; con mới dẫn đầu kêu "MEOW!!" nổi bật; nước rút thì vài con gào "MEEEOW!!";
  con ở cuối đàn kêu mệt.
- **Đèn giao thông**: 3 đèn tròn trong một hộp đèn, **mỗi lúc chỉ sáng một đèn**: đỏ (3) -> vàng
  (2) -> xanh lá (1). Đèn tắt vẫn thấy màu của nó ở độ sáng thấp. Số đếm đổi màu theo đèn đang sáng.

## User Stories

1. Là người xem, tôi muốn thấy khán giả hô tên con vừa vượt lên, để cảm giác cả sân đang theo dõi.
2. Là người xem, tôi muốn sân khấu ồn ào hơn khi vào nước rút, để thấy cao trào.
3. Là người xem, tôi muốn mèo kêu "meow" trên đường đua, để màn đua vui và sống động.
4. Là người xem, tôi muốn đọc đếm ngược như đèn giao thông, để biết ngay lúc nào mèo xuất phát.
5. Là người xem có bật giảm chuyển động, tôi không muốn thấy thêm hiệu ứng nào (màn đua vốn bị bỏ qua).

## Implementation Decisions

### 1. Đèn giao thông (DOM overlay)

- `RaceCountdown` gán màu theo vị trí đèn: type alias `CountdownSignal = "red" | "amber" | "green"`,
  một mảng 3 phần tử theo thứ tự. `data-lit` chỉ đúng cho đèn `index === step`; bỏ `data-gold`.
- Hộp đèn: nền tối có viền, góc bo, đèn tròn. Màu là token mới trong khối `--stage-*` của
  `globals.css`: `--stage-signal-red`, `--stage-signal-amber`, `--stage-signal-green` (độ bão hoà
  dưới 80%, hợp bảng màu hoàng hôn). Đèn tắt: màu của nó trộn với `--stage-lantern-off`; đèn sáng:
  màu đầy đủ + quầng sáng cùng màu (không dùng bóng đen).
- Số đếm lấy màu của đèn đang sáng qua `data-signal` trên phần tử số.

### 2. Mô hình bong bóng (module thuần `lib/race-chatter.ts`)

- Một bong bóng: `id`, neo (`{ kind: "crowd"; x }` hoặc `{ kind: "cat"; catKey }`), `text`, `tone`
  (type alias `ChatTone = "plain" | "hype" | "lead"`), thời điểm sinh, tuổi thọ.
- `stepChatter(state, frame, random)` trả state mới (không mutate): bỏ bong bóng hết hạn, sinh bong
  bóng cho các cue của frame, rồi sinh bong bóng ngẫu nhiên theo tốc độ tỉ lệ với `excitementAt`.
- Giới hạn đồng thời: khán giả 3 (2 khi hẹp hơn `NARROW_WIDTH`), mèo 4. Cue luôn được ưu tiên: khi
  đầy, bong bóng ngẫu nhiên cũ nhất nhường chỗ.
- Cue -> câu:
  - `countdown` bước n: khán giả hô số đếm.
  - `go`: 2 bong bóng khán giả "Chạy điii!" (`hype`).
  - `lead-change`: khán giả hô `"<tên> lên rồi!"` (`lead`), con mới dẫn đầu kêu "MEOW!!" (`lead`).
  - `sprint`: khán giả "NƯỚC RÚT!!" (`hype`), 2-3 con trong tầm nhìn "MEEEOW!!".
  - `finish`: khán giả "Ảnh! Ảnh!" (`hype`).
  - `slow-motion`: không câu riêng.
- Câu ngẫu nhiên chung: danh sách cố định cho khán giả và cho mèo; con thuộc 20% cuối đàn dùng câu
  mệt ("meo…", "hộc hộc"). Tên mèo lấy từ `catLabels`, cắt ngắn bằng dấu "…".
- Chỉ chạy ở chế độ `replay`. Preview đứng yên và giảm chuyển động không có bong bóng.
- Thời gian bong bóng theo đồng hồ thật, không chậm lại trong slow-mo.

### 3. Vẽ bong bóng (`lib/paint-chat-bubbles.ts`)

- Hộp bo góc, đuôi tam giác chỉ xuống chủ của nó, bóng đặc lệch 2px màu tối pha tím (đồng bộ kiểu
  `box-shadow` đặc của banner hiện có).
- `plain`: nền `paper`, chữ `night`, font thân 600. `hype`: nền `lacquer`, chữ `paper`, font display
  (Bungee). `lead`: nền `gold`, chữ `night`, font display.
- Chuyển động: bật lên kiểu lò xo (scale 0 -> ~1.12 -> 1 trong ~160ms), trôi lên vài px suốt đời,
  mờ dần ở 25% cuối.
- Khán giả: vẽ trong dải trời, sau khán giả và trước hàng rào, đáy đuôi chạm trên đầu khán giả.
- Mèo: vẽ trong vùng làn (bị dải trời che như mèo), phía trên-phải đầu mèo; kẹp trong bề ngang canvas.

### 4. Nối vào canvas

- `RaceCanvas` giữ state bong bóng trong effect (như bụi), gọi `stepChatter` mỗi frame replay với
  các cue `nextCues` vừa trả, các làn đang trong tầm nhìn và thứ hạng hiện tại. Không đổi props của
  `RaceCanvas`.
- `paintStageBand` nhận thêm một tham số: các bong bóng khán giả của frame. `BandScene` không đổi
  (nó chỉ đổi khi resize, còn bong bóng đổi mỗi frame). Phần vẽ khác giữ nguyên.

## Testing Decisions

- `race-chatter`: dùng `seeded-random`. Cue sinh đúng câu và tone; `lead-change` sinh cả bong bóng
  khán giả có tên lẫn bong bóng mèo neo đúng `catKey`; không vượt giới hạn đồng thời; cue đẩy bong
  bóng ngẫu nhiên cũ nhất khi đầy; bong bóng hết hạn bị bỏ; excitement cao sinh nhiều hơn excitement
  thấp qua cùng khoảng thời gian; state cũ không bị đổi.
- `race-overlays`: đèn đúng màu theo vị trí, chỉ một đèn `data-lit` mỗi bước, số mang `data-signal`
  đúng.
- Vẽ canvas không test pixel; kiểm tra bằng chạy app.

## Out of Scope

- Âm thanh.
- Chat thật từ người xem (nhập tin nhắn) hay tin nhắn có tên thành viên guild gửi.
- Bong bóng ở preview đứng yên hay ở thẻ kết quả.
