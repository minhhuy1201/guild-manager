# Animation chuyển giai đoạn của bảng chiến thuật - Design

Ngày: 2026-09-23 · Phạm vi: `apps/web` (feature `tactics`: một module thuần mới, ba hook mới, một
component điều khiển mới, đổi interface của `TacticStageView`, sửa `duplicateStage`), tài liệu.
Không đụng `packages/shared`, không đụng `apps/api`, không đổi lược đồ, không thêm biến môi trường,
không đổi endpoint.

## Bối cảnh

[`2026-09-20-tactics-board-design.md`](2026-09-20-tactics-board-design.md) dựng bảng chiến thuật như
một **công cụ vẽ**, và nói rõ "không có timeline chạy, không có animation". Đúng cho lần giao đầu:
việc cần làm khi đó là vẽ và lưu được.

Sau khi dùng thật, chỗ hụt lộ ra ở phía **người xem**, không phải người vẽ. Đổi giai đoạn hôm nay là
thay thẳng `stage` đưa vào Konva: quân cờ biến mất ở chỗ này rồi hiện ra ở chỗ khác. Người xem đọc
được *trạng thái* của từng giai đoạn nhưng không đọc được **quân nào đi đâu** - mà đó chính là thông
tin một bảng chiến thuật nhiều giai đoạn tồn tại để truyền đạt. Admin phải bù bằng cách bấm qua bấm
lại hai tab và mô tả bằng lời trong Discord, đúng cái việc mà bảng chiến thuật sinh ra để thay thế.

Spec này thêm chuyển động **giữa** các giai đoạn. Nó không mở lại phạm vi "mô phỏng trận đấu": không
có trục thời gian trong tài liệu scene, không có tốc độ hay thời điểm lưu cùng bản vẽ, không có tính
toán nào trên dữ liệu vẽ. Chuyển động là một tính chất của **màn hình**, suy ra hoàn toàn từ hai giai
đoạn liền kề đã lưu.

### Sửa lại lời của spec cũ

Câu "không có animation" trong spec bảng chiến thuật hết hiệu lực từ đây. Spec đó được bổ sung một
dòng trỏ sang tài liệu này, thay vì sửa lịch sử của nó.

### `MOTION_INTENSITY`

Spec cũ đặt `MOTION_INTENSITY = 2` cho feature này, lý do: "chuyển động trong một trình vẽ là nhiễu".
Lý do đó vẫn đúng **cho thanh công cụ và bảng quân cờ**, và không đổi ở đó.

Chuyển động thêm vào đây thuộc loại khác: nó không trang trí, nó **là** nội dung. Đường đi của quân
cờ là dữ liệu mà người xem cần. Cho nên núm này giữ nguyên giá trị 2 cho phần chrome, và canvas được
tách ra như một ngoại lệ có lý do, ghi ngay tại chỗ.

## Quyết định

### 1. Quân cờ có danh tính xuyên giai đoạn, giữ bằng `duplicateStage`

Nội suy cần biết quân nào ở giai đoạn 1 ứng với quân nào ở giai đoạn 2. Hôm nay không có liên kết
đó: `duplicateStage` (`apps/web/features/tactics/lib/scene.ts`) cấp `newId()` cho **mọi** phần tử
được sao chép, mà nhân bản giai đoạn rồi kéo quân sang chỗ mới chính là cách người ta dựng một chiến
thuật nhiều giai đoạn.

Quyết định: `duplicateStage` **giữ nguyên `id` của phần tử `kind: "token"`**, và vẫn cấp id mới cho
`arrow`, `freehand`, `text`.

Vì sao được phép:

- `id` chỉ cần duy nhất **trong một giai đoạn**. `tacticElementSchema` không ràng buộc gì toàn cục,
  và mọi thao tác sửa (`moveToken`, `removeElement`, `resizeToken`, undo/redo) đều chạy trên đúng một
  `TacticStage`.
- Không đổi schema, không cần `schemaVersion` 3, không migration. Tài liệu đã lưu vẫn đọc được y
  nguyên.

Vì sao nét vẽ **không** được giữ id: hai nét vẽ trùng id ở hai giai đoạn không mang ý nghĩa gì cho
người xem - không ai theo dõi "mũi tên này đi đâu". Giữ id cho chúng chỉ tạo ra khả năng gán nhầm.
Lý do gốc trong doc comment hiện tại ("undo và tẩy sẽ tác động lên cả hai") vẫn đúng cho nét vẽ, và
không đúng cho token vì token đã được thao tác theo từng giai đoạn sẵn.

### 2. Bản vẽ cũ vẫn chạy được, nhờ ghép dự phòng theo `label + icon`

Mọi chiến thuật đã lưu trước thay đổi ở mục 1 đều có id token lệch nhau giữa các giai đoạn. Nếu chỉ
ghép theo id thì chúng mất animation cho tới khi ai đó vẽ lại - tức là tính năng này vô hình với đúng
tập dữ liệu đang có.

Quyết định: ghép **hai tầng**. Ghép theo `id` trước. Token còn dư hai bên thì ghép tiếp theo khoá
`label + icon`, theo thứ tự xuất hiện, mỗi token bên trái ăn nhiều nhất một token bên phải.

Đây là hai cơ chế, không phải một - chấp nhận có chủ đích. Tầng `id` là đường đi đúng và chính xác
tuyệt đối kể cả khi hai quân trùng tên trùng icon. Tầng `label + icon` là đường cứu dữ liệu cũ, không
chính xác tuyệt đối (hai quân trùng tên trùng icon có thể bị ghép chéo) nhưng sai ở đây chỉ làm
đường trượt lạ mắt, không làm hỏng dữ liệu. Không có tầng thứ ba: token không ghép được thì fade.

### 3. Canvas nhận một khung hình, không nhận một giai đoạn

`TacticStageView` hôm nay nhận `stage: TacticStage` và vẽ thẳng. Nếu thêm animation bằng cách thêm
một nhánh render thì canvas có hai đường vẽ, và nhánh ít chạy hơn sẽ mục.

Quyết định: đổi prop thành `frame: StageFrame` - một cấu trúc **đã nội suy xong**, đủ để vẽ, không
biết gì về thời gian:

```ts
/** Một quân cờ trong một khung hình, toạ độ đã nội suy xong. */
interface FrameToken {
  token: TacticToken;
  opacity: number;
  /** [x0, y0, x, y] khi đang di chuyển; null khi đứng yên */
  trail: number[] | null;
}

/** Một khung hình của scene, đủ để vẽ và không hơn. */
interface StageFrame {
  /** Nét vẽ của giai đoạn đi ra, đang mờ dần */
  outgoing: { elements: TacticElement[]; opacity: number };
  /** Nét vẽ của giai đoạn đi vào, đang rõ dần */
  incoming: { elements: TacticElement[]; opacity: number };
  tokens: FrameToken[];
  /** Onion skin; rỗng khi tắt */
  ghosts: FrameToken[];
}
```

Lúc đứng yên, người gọi dựng `staticFrame(stage)`: `outgoing` rỗng, mọi opacity bằng 1. Canvas vì thế
có **đúng một** đường vẽ cho mọi trạng thái. Hướng này nối tiếp `f8e0067`
(*read the scene through one shared pipeline*).

Thứ tự layer: map → onion skin → vệt đuôi → nét vẽ `outgoing` → nét vẽ `incoming` → token.

### 4. Quy tắc chuyển động nằm trong một module thuần

`lib/stage-transition.ts` không import React, không import Konva. Nó nhận hai `TacticStage` và một
`t` trong `[0, 1]`, trả về `StageFrame`. Toàn bộ quy tắc - ghép token, nội suy, fade, vệt đuôi,
onion skin - ở đây, nên test được bằng giá trị chứ không phải bằng canvas.

Hook `use-stage-transition.ts` chỉ làm một việc: đẩy `t` theo `requestAnimationFrame`.

### 5. Đi lùi là cùng một hàm, đảo `from`/`to`

Không có nhánh riêng cho "tua ngược". Chuyển từ giai đoạn 3 về giai đoạn 2 là `transitionFrame(giai
đoạn 3, giai đoạn 2, t)`. Chuyển động đảo lại là hệ quả, không phải tính năng được viết thêm.

Nhảy cách nhiều giai đoạn (bấm thẳng từ tab 1 sang tab 5) vẫn chạy đúng một lần 280ms, không cộng
dồn: người dùng muốn tới nơi, không muốn xem lại bốn chặng.

### 6. Ngắt giữa chừng thì nối tiếp, không giật

Bấm tab liên tục là chuyện bình thường. Khi một animation đang chạy mà đích đổi, `from` mới được
**tổng hợp từ khung hình đang hiện trên màn hình**: token lấy toạ độ đã nội suy, nét vẽ lấy của đích
cũ. Quân cờ vì thế đổi hướng từ chỗ nó đang đứng, thay vì nhảy về điểm xuất phát rồi chạy lại.

### 7. Thời lượng và đường cong

`TRANSITION_MS = 280`, `easeOutCubic`. Đủ để mắt bám được đường đi, đủ ngắn để bấm qua bấm lại không
thấy phải chờ. Hai giá trị này là hằng số có tên trong module thuần, không rải trong component.

### 8. `prefers-reduced-motion` cắt thẳng

Người bật "giảm chuyển động" trong hệ điều hành nhận `staticFrame` ngay, không chạy `requestAnimation
Frame`. Không có animation rút gọn, không có phiên bản nhẹ hơn - cắt thẳng là cái họ yêu cầu.

### 9. Ba tính năng đi kèm

| Tính năng | Quy tắc |
|---|---|
| Nút Play | Chạy tự động lần lượt qua các giai đoạn, dừng hẳn ở giai đoạn cuối, không lặp. Giữa hai giai đoạn dừng `PLAYBACK_DWELL_MS = 900` để đọc. Bấm tab hoặc bấm phím mũi tên thì dừng playback ngay |
| Onion skin | Bật/tắt bằng nút. Khi bật, vẽ mờ vị trí token của giai đoạn **liền trước**, lúc đứng yên. Trong lúc animation chạy thì không vẽ: vệt đuôi đã nói quân đến từ đâu, thêm bóng mờ chỉ là nhiễu. Giai đoạn đầu tiên không có gì để vẽ mờ |
| Vệt đuôi | Không có nút. Chỉ tồn tại trong lúc animation chạy: một đoạn thẳng mờ từ điểm xuất phát tới vị trí hiện tại, màu của chính token đó |

Nút Play và nút onion skin dùng chung một component (`stage-playback-controls.tsx`) cho cả viewer lẫn
editor, để hai màn không lệch nhau.

### 10. Xuất ảnh phải sạch

`exportAllStages` (`apps/web/features/tactics/hooks/use-tactic-export.ts`) đổi giai đoạn rồi chờ hai
khung hình rồi chụp. Với animation, nó sẽ chụp đúng khung hình **giữa chừng** - mỗi ảnh trong file
ZIP là một cảnh quân cờ đang lơ lửng giữa hai vị trí.

Quyết định: trong lúc xuất ảnh, `useStageTransition` chạy với `enabled: false`, và onion skin bị tắt
theo. Ảnh xuất ra giữ đúng như hôm nay: chỉ map và nội dung của giai đoạn, không bóng mờ, không vệt
đuôi, không khung hình dở dang.

Đây cùng một lý do đã khiến `90a2254` bỏ vòng chọn khỏi ảnh xuất: **thứ giúp đọc màn hình không
thuộc về bản vẽ.**

### 11. Không kéo được quân trong lúc animation chạy

Token đặt `draggable={!readOnly && !animating}`. Kéo một quân đang trượt sẽ ghi toạ độ nội suy - một
vị trí không ai chọn - vào tài liệu.

## Phạm vi áp dụng

Cả hai màn: `TacticViewer` (member, và admin trên điện thoại) và canvas của `TacticEditorScreen`
(admin trên desktop). Một hành vi, một component điều khiển.

## Không làm

- Không có trục thời gian, tốc độ hay thời điểm lưu trong tài liệu scene.
- Không lặp vô hạn ở nút Play.
- Không xuất ảnh động (GIF/video).
- Không nội suy nét vẽ (`arrow`, `freehand`, `text`) - chúng crossfade. Biến một mũi tên thành một
  mũi tên khác không mang nghĩa gì cho người xem.
- Không đổi `TACTIC_SCHEMA_VERSION`.

## Kiểm thử

Module thuần và hook chịu phần lớn tải test, vì chúng trả về giá trị:

| Đơn vị | Kiểm gì |
|---|---|
| `lib/scene.ts` | `duplicateStage` giữ id token, đổi id nét vẽ |
| `lib/stage-transition.ts` | Ghép theo id; ghép dự phòng theo `label + icon`; không ăn hai token; token vào/ra thì fade; nội suy tuyến tính ở `t = 0, 0.5, 1`; đảo `from`/`to` cho đúng chuyển động ngược; `staticFrame` mọi opacity bằng 1; onion skin rỗng ở giai đoạn đầu |
| `hooks/use-stage-transition.ts` | Chạy tới `t = 1` rồi dừng; `enabled: false` trả thẳng `staticFrame` không gọi rAF; ngắt giữa chừng thì `from` là khung hình đang hiện |
| `hooks/use-stage-playback.ts` | Dừng ở giai đoạn cuối; thao tác thủ công thì dừng playback |
| `components/*` | Nút Play và onion skin đổi trạng thái; canvas nhận `frame` |

Kiểm tay bắt buộc: mở một chiến thuật **đã lưu từ trước** (id token lệch) và xác nhận animation vẫn
chạy nhờ tầng ghép dự phòng; và xuất một file ZIP rồi mở từng ảnh xác nhận không có khung hình dở.
