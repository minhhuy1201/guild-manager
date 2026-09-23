# Cỡ quân cờ trên toolbar, viền theo màu đội, chọn vùng nhiều phần tử - Design

Ngày: 2026-09-23 · Phạm vi: `apps/web` (feature `tactics`, tách bảng màu đội của `team-builder` ra
`apps/web/lib`), tài liệu. Không đụng `packages/shared`, không đụng `apps/api`, không đổi lược đồ,
không đổi `TACTIC_SCHEMA_VERSION`, không thêm biến môi trường, không đổi endpoint.

## Bối cảnh

Ba yêu cầu từ `feat.md`:

1. Trên thanh action, thêm action chỉnh kích thước quân cờ, mặc định là "Vừa".
2. Viền quanh quân cờ Đội 1 đến Đội 10 lấy màu của header cột tương ứng ở `/xep-team`.
3. Ở công cụ Chọn, nhấn giữ chuột trái và kéo vẽ ra một hình chữ nhật; thả chuột thì chọn mọi phần
   tử nằm trong hình đó, giống các công cụ vẽ.

Hiện trạng liên quan:

- Quân cờ đã có trường `size: "sm" | "md" | "lg"` trong schema. `createToken` luôn ghi `"md"`. Đổi
  cỡ chỉ làm được qua thanh nổi `SelectionActions`, từng quân một.
- Viền quân cờ là `COLOR_HEX[token.color]`, tức màu vẽ đang chọn trên toolbar lúc đặt quân.
- Store chỉ giữ **một** phần tử được chọn (`selectedElementId`). Kéo quân cờ dùng `draggable` của
  Konva, chỉ áp cho token. Mũi tên, nét vẽ, chữ không kéo được.

## Quyết định

### 1. Cỡ quân cờ trên toolbar = cỡ mặc định, và áp luôn cho quân đang chọn

Toolbar có thêm nhóm ba nút **Nhỏ / Vừa / Lớn**, đặt sau nhóm độ dày nét, cùng khuôn với nhóm màu
và nhóm nét:

- Store có thêm `tokenSize: TacticTokenSize`, mặc định `"md"`, reset về `"md"` khi `reset()`.
- `createToken` nhận thêm tham số `size`. Quân cờ mới đặt lấy `tokenSize` của store.
- Bấm một nút trên toolbar: đặt `tokenSize`, **và** nếu vùng chọn có quân cờ thì đổi cỡ tất cả quân
  cờ đó trong **một** bước undo. Vùng chọn không có quân cờ thì chỉ đổi cỡ mặc định, không tạo bước
  undo.
- Nút trên toolbar hiển thị cỡ mặc định, không hiển thị cỡ của vùng chọn. Cỡ của vùng chọn đã hiện
  trên thanh nổi.
- Thanh nổi `SelectionActions` giữ nguyên vai trò: chỉ đổi cỡ vùng chọn, không đổi cỡ mặc định.
- Nhãn "Nhỏ/Vừa/Lớn" và "Cỡ nhỏ/Cỡ vừa/Cỡ lớn" đang nằm trong `selection-actions.tsx`. Chúng được
  chuyển ra `lib/token-icon.ts` để toolbar và thanh nổi dùng chung một nguồn.
- Không thêm phím tắt. Phím `[` `]` vẫn chỉ đổi độ dày nét.

Không đổi schema: cỡ đã được lưu trên từng quân cờ từ trước.

### 2. Viền quân Đội N lấy màu nhóm đội, tính lúc vẽ

Chỉ quân cờ mang icon số (`number-1` đến `number-10`, tức nhóm "Đội" trong palette) đổi viền. Quân
hiệu và quân custom giữ viền theo `color` như hôm nay. Chữ số bên trong quân Đội N vẫn theo `color`.

**Tính lúc vẽ, không lưu.** Màu viền suy ra từ `icon` của token mỗi lần render. Lý do:

- Không đổi schema, không cần `schemaVersion` 3, bản vẽ đã lưu tự có viền mới.
- Đổi nhóm màu đội ở `/xep-team` thì bảng chiến thuật đổi theo, vì chỉ có một nguồn.

**Một nguồn cho việc chia nhóm.** Hôm nay `features/team-builder/lib/team-colors.ts` vừa chia đội
thành nhóm (1-5 jade, 6-7 stone, 8 navy, 9-10 gold), vừa gán class Tailwind cho từng nhóm.
Tactics không được import file nội bộ của feature khác (architecture.md §4.2), và canvas Konva cần
mã hex, không dùng được class Tailwind hay biến CSS. Cách tách:

- Tạo `apps/web/lib/team-color-group.ts`: kiểu `TeamColorGroup = "jade" | "stone" | "navy" | "gold"`
  và hàm `teamColorGroup(team: number): TeamColorGroup | null`. Đây là fact dùng chung, cùng loại
  với `lib/guild-class.ts` đang có.
- `team-builder/lib/team-colors.ts` giữ phần class Tailwind, map `TeamColorGroup` sang class, và
  lấy nhóm qua `teamColorGroup`. Đội không có nhóm vẫn rơi về `DEFAULT_TEAM_COLORS` như cũ.
- `tactics/lib/token-icon.ts` thêm `TEAM_GROUP_HEX: Record<TeamColorGroup, string>` và hàm
  `tokenBorderHex(token)`: icon số có nhóm thì trả hex của nhóm, còn lại trả `COLOR_HEX[token.color]`.

**Mã hex.** Header ở `/xep-team` là tint nhạt trên nền sáng; viền trên map tối cần bản đậm và sáng
hơn của **cùng sắc độ**. Giá trị chốt (quy đổi từ oklch, cùng hue với token của palette):

| Nhóm | Đội | Nguồn | Hex |
|---|---|---|---|
| jade | 1-5 | `--jade` bản dark theme, oklch(0.72 0.08 170) | `#6fb59d` |
| stone | 6-7 | trung tính ấm, oklch(0.8 0.01 70) | `#c2bdb7` |
| navy | 8 | hue 268 của `--primary`, nâng sáng lên oklch(0.62 0.1 268) | `#6c84c3` |
| gold | 9-10 | `--gold` bản dark theme, oklch(0.78 0.085 80) | `#d4b278` |

Màu cố định, không đổi theo theme sáng/tối của trang: map là một bức ảnh, không có theme, đúng như
`COLOR_HEX` hôm nay.

**Mọi thứ vẽ theo viền đều dùng `tokenBorderHex`:** viền, quầng hover, vệt đuôi khi animation. Nếu
không, quân Đội 3 có viền jade nhưng quầng xanh dương, trông như hai quân khác nhau.

Palette bên trái (DOM) không đổi trong đợt này.

### 3. Vùng chọn là một tập, không phải một phần tử

`selectedElementId: string | null` thành `selectedElementIds: readonly string[]`. Action của store:

- `selectElements(ids)`: thay toàn bộ vùng chọn.
- `toggleElementSelection(id)`: thêm hoặc bớt một phần tử.
- `clearSelection()`: xoá vùng chọn. Thay cho `selectElement(null)`.

Các chỗ đang xoá vùng chọn giữ nguyên hành vi: đổi công cụ, đổi giai đoạn, undo, redo, load scene,
xuất ảnh.

Hook `useTacticEditor` trả `selectedElements: TacticElement[]` (lọc từ giai đoạn đang mở theo
`selectedElementIds`) thay cho `selectedElement`. Id không còn trên giai đoạn tự rơi khỏi kết quả,
nên không phải dọn ở mỗi chỗ xoá phần tử.

### 4. Cử chỉ chuột

Mọi cử chỉ dưới đây chỉ dành cho admin, giống hôm nay. Người xem không chọn được gì.

`onPointerDown` nhận thêm `{ shift: boolean }` từ `event.evt.shiftKey` của Konva.

**Công cụ Chọn:**

| Nhấn chuột trái vào | Không giữ Shift | Giữ Shift |
|---|---|---|
| Chỗ trống | Xoá vùng chọn, bắt đầu vẽ khung chọn | Giữ vùng chọn, bắt đầu vẽ khung chọn |
| Phần tử chưa chọn | Chọn đúng phần tử đó, sẵn sàng kéo | Thêm phần tử vào vùng chọn, không kéo |
| Phần tử đang chọn | Giữ vùng chọn, sẵn sàng kéo cả nhóm | Bớt phần tử khỏi vùng chọn, không kéo |

Nhấn vào phần tử đang chọn rồi thả mà không kéo, khi vùng chọn có nhiều hơn một phần tử: vùng chọn
thu lại còn đúng phần tử đó. Đây là hành vi của Figma và Excalidraw: nhấn không kéo nghĩa là "chọn cái
này", còn kéo nghĩa là "di chuyển cả nhóm".

**Khung chọn.** Khi đang vẽ khung, di chuột cập nhật một hình chữ nhật từ điểm nhấn tới con trỏ, theo
mọi hướng. Thả chuột: chọn mọi phần tử có hộp bao **nằm trọn** trong khung. Không giữ Shift thì kết
quả thay vùng chọn; giữ Shift (tính lúc nhấn) thì kết quả cộng vào vùng chọn cũ. Thả chuột ở bất kỳ
đâu, kể cả ngoài canvas, đều kết thúc khung: dùng lại listener `mouseup`/`touchend`/`blur` trên
`window` đang có.

**Ngưỡng kéo.** Chuột phải đi quá `DRAG_THRESHOLD` (4 đơn vị map) mới tính là kéo. Dưới ngưỡng là một
cú nhấn: không có khung, không có bước undo nào.

**Công cụ Đội hình (token):** nhấn vào phần tử có sẵn thì xử lý như cột "Không giữ Shift" của công cụ
Chọn (chọn và sẵn sàng kéo). Nhấn vào chỗ trống vẫn đặt quân cờ như hôm nay. Không có khung chọn ở
công cụ này, vì nhấn chỗ trống đã có nghĩa là đặt quân.

Các công cụ khác (mũi tên, vẽ tự do, chữ, tẩy) không đổi.

### 5. Kéo cả nhóm, một cơ chế kéo duy nhất

Kéo phần tử chuyển hẳn sang logic con trỏ của `useTacticEditor`, và **bỏ `draggable` của Konva**. Lý
do:

- Kéo nhóm phải kéo được mũi tên, nét vẽ, chữ. Konva chỉ đang cho token kéo, và gộp một nhóm vừa
  Konva-drag vừa không thì phải đồng bộ hai nguồn vị trí.
- Một cơ chế thay vì hai: bỏ `onTokenDragStart`, `onTokenMoved`, `draggingTokenId`, và
  `moveToken` nếu không còn ai dùng.

Cách chạy:

- Khi sẵn sàng kéo, hook nhớ điểm nhấn và danh sách phần tử của giai đoạn lúc đó.
- Lần di chuyển đầu tiên vượt ngưỡng: `commit` bản đã dịch (ghi một bước undo cho cả cú kéo).
- Các lần di chuyển sau: thay tại chỗ, không ghi bước undo, qua action mới `updateElements(stageId,
  elements)` của store. Đây là cùng khuôn với nét vẽ tự do: một nét một bước undo.
- Dịch chuyển tính từ điểm nhấn, áp lên bản gốc đã nhớ, không cộng dồn, nên không trôi sai số.
- Hàm thuần `translateElements(stage, ids, dx, dy)` trong `lib/scene.ts`: token và chữ dịch `x`, `y`;
  mũi tên và nét vẽ dịch mọi cặp toạ độ trong `points`. Switch trên `kind`, kết bằng `assertNever`.
- Không kéo được trong lúc animation chuyển giai đoạn đang chạy, như hôm nay.
- Con trỏ `grab` khi hover token giữ nguyên cho admin.

### 6. Hình học: hộp bao đầy đủ

`ElementBounds` hiện chỉ có `centerX`, `top`, `bottom`. Thêm `left` và `right` để kiểm tra "nằm
trọn" (`centerX` giữ lại cho thanh nổi):

- Token: hình tròn, `x ± radius`; `top`/`bottom` như cũ (gồm nhãn dưới chân). Nhãn không tính vào
  bề ngang: hộp chữ Konva rộng `radius * 6` nhưng chữ thật hẹp hơn, lấy bề ngang hộp chữ sẽ làm
  khung chọn phải to vô lý mới bắt được quân.
- Chữ: `x` tới `x + textWidth` như hit test đang ước lượng.
- Mũi tên, nét vẽ: min/max của các điểm, như `polylineBounds` đang tính.

Hàm thuần mới trong `lib/element-geometry.ts`:

- `rectFromPoints(a, b): MapRect` chuẩn hoá hai góc theo mọi hướng kéo.
- `elementsInRect(stage, rect): string[]` trả id các phần tử có hộp bao nằm trọn trong khung.
- `unionBounds(bounds[]): ElementBounds` gộp hộp bao, cho thanh nổi của vùng chọn nhiều phần tử.

### 7. Hiển thị vùng chọn

- **Khung chọn:** `TacticStageView` nhận prop `marquee: MapRect | null`, vẽ một `Rect` nét đứt trên
  một layer `listening={false}`. Độ dày nét và nét đứt chia cho `scale`, để nhìn như nhau ở mọi mức
  zoom.
- **Phần tử đang chọn:** token giữ viền dày như hôm nay. Mũi tên, nét vẽ, chữ đang chọn có thêm một
  hộp nét đứt theo hộp bao, cũng trên layer `listening={false}`. Hôm nay chúng không có dấu hiệu
  chọn nào ngoài thanh nổi; với vùng chọn nhiều phần tử, không có dấu hiệu thì không biết cái gì đang
  được chọn. `TacticStageView` nhận `selectedElementIds` thay cho `selectedElementId`.
- **Thanh nổi:** neo vào `unionBounds` của vùng chọn. Ẩn trong lúc kéo và lúc vẽ khung. Nút cỡ hiện
  khi vùng chọn có ít nhất một token; nút nào được bấm sáng lên chỉ khi mọi token trong vùng chọn cùng
  cỡ đó. Nút xoá xoá cả vùng chọn.
- **Xuất ảnh:** đã xoá vùng chọn trước khi chụp; khung chọn chỉ tồn tại trong lúc kéo. Không đổi gì.

### 8. Xoá

`Delete`/`Backspace` và nút xoá trên thanh nổi xoá mọi phần tử đang chọn trong **một** bước undo, rồi
xoá vùng chọn. Hàm thuần `removeElements(stage, ids)`; `removeElement` giữ cho công cụ tẩy.

## Phạm vi áp dụng

Chỉ editor (`TacticEditorScreen`). Viewer chỉ đọc hưởng phần viền màu đội vì dùng chung
`TacticStageView`; phần chọn và kéo không áp dụng cho viewer.

## Không làm

- Không thêm phím tắt cho cỡ quân cờ, không thêm `Escape` bỏ chọn, không thêm `Ctrl+A`.
- Không copy/paste, không nhóm cố định (group), không căn lề hay phân bố đều.
- Không đổi màu phần tử đang chọn từ toolbar.
- Không đổi màu viền trong palette (DOM).
- Không kéo khung chọn bằng cảm ứng: editor chỉ chạy trên desktop (`MobileEditorNotice`).
- Không lưu màu đội vào dữ liệu.

## Kiểm thử

Chỉ mở rộng các file test đã có trong `apps/web/features/tactics/__tests__/` và
`apps/web/features/tactics/hooks/__tests__/`; không tạo file test mới trừ khi được yêu cầu.

- `element-geometry.test.ts`: `rectFromPoints` theo bốn hướng kéo; `elementsInRect` với từng `kind`,
  phần tử nằm trọn, chạm mép, lòi ra ngoài; `elementBounds` có `left`/`right`; `unionBounds`.
- `scene.test.ts`: `translateElements` cho cả bốn `kind`, không đột biến đầu vào, phần tử ngoài `ids`
  giữ nguyên; `resizeTokens` bỏ qua phần tử không phải token; `removeElements`.
- `create-element.test.ts`: `createToken` ghi đúng `size` truyền vào.
- `editor-store.test.ts`: `tokenSize` mặc định `"md"`; `selectElements`, `toggleElementSelection`,
  `clearSelection`; `updateElements` không ghi undo; các chỗ đang xoá vùng chọn vẫn xoá.
- `use-tactic-editor.test.tsx`: đặt quân lấy `tokenSize`; đổi cỡ toolbar áp cho token đang chọn trong
  một bước undo; khung chọn chọn đúng phần tử nằm trọn; Shift cộng dồn; Shift+nhấn thêm/bớt; nhấn
  dưới ngưỡng không tạo undo; kéo nhóm dịch mọi `kind` và là một bước undo; nhấn không kéo trên vùng
  chọn nhiều phần tử thu về một; xoá nhiều phần tử là một bước undo.
- `editor-toolbar.test.tsx`: nhóm cỡ hiển thị, `aria-pressed` theo `tokenSize`, gọi callback.
- `selection-actions.test.tsx`: trạng thái nút cỡ khi token cùng cỡ / khác cỡ / không có token.
- `tactic-stage-view.test.tsx`: có khung chọn khi truyền `marquee`; viền quân Đội N theo nhóm, quân
  hiệu theo `color`.
- `team-builder` chưa có test cho màu cột; sau khi tách `teamColorGroup`, kiểm tra tay `/xep-team`
  còn đúng bốn nhóm màu.
- Kiểm tra tay trên trình duyệt: vẽ khung ở mọi hướng, khi zoom và khi đã pan; kéo nhóm lẫn token,
  mũi tên, chữ; undo sau kéo nhóm; thả chuột ngoài canvas; viền bốn nhóm màu đọc rõ trên map; ảnh
  xuất không có khung hay hộp nét đứt.
