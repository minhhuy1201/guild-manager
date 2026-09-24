# Kéo quân cờ từ bảng quân cờ ra map - Design

Ngày: 2026-09-25 · Phạm vi: `apps/web` (feature `tactics`), tài liệu. Không đụng `packages/shared`,
không đụng `apps/api`, không đổi lược đồ scene, không thêm biến môi trường, không đổi endpoint.

## Bối cảnh

Trên `/chien-thuat/[id]`, đặt một quân cờ hiện cần hai bước: bấm một ô trong bảng quân cờ bên trái
(ô đó được "chọn sẵn", công cụ chuyển sang "Đội hình"), rồi bấm lên map để thả quân tại điểm bấm.

Yêu cầu: thêm cách thứ hai - nhấn giữ một ô trong bảng quân cờ, kéo ra map, thả chuột thì quân cờ
nằm đúng chỗ thả. Cách "bấm ô rồi bấm map" giữ nguyên.

## Quyết định

### 1. Dùng HTML5 drag and drop gốc của trình duyệt

- Ô trong bảng quân cờ là `draggable`. Map (cái `div` bọc canvas Konva) là vùng thả.
- Lý do chọn DnD gốc thay vì tự theo dõi con trỏ: trình duyệt tự vẽ ảnh ma của ô đang kéo, tự đổi
  con trỏ, `Esc` tự huỷ, và sự kiện `drop` rơi đúng vào phần tử DOM dưới con trỏ - không phải tự
  tính con trỏ đang ở trên bảng hay trên map. Editor chỉ mở trên máy tính (`canDraw` cần
  `useIsDesktop`), nên việc DnD gốc không chạy trên màn cảm ứng không ảnh hưởng.
- Kéo không đi qua `onPointerDown/Move/Up` của Konva: DnD gốc nuốt các sự kiện chuột trong lúc kéo,
  và thả là một thao tác một phát, không có trạng thái "đang giữ" trên map.

### 2. Quân đang kéo nằm trong editor, không nằm trong `dataTransfer`

- `dragstart` trên một ô gọi `onPaletteDragStart(token)` của editor; editor nhớ quân đó. `dragend`
  (thả xong hoặc huỷ) gọi `onPaletteDragEnd()`; editor quên nó.
- `dataTransfer` chỉ mang một kiểu MIME riêng, `application/x-guild-tactic-token` (`TOKEN_DRAG_TYPE`),
  giá trị là tên quân nhưng editor không đọc nó: Firefox không bắt đầu kéo nếu `dataTransfer` trống.
- Lý do không nhét `{ label, icon }` vào `dataTransfer`: dữ liệu đó có thể đến từ tab khác hoặc app
  khác, nên phải parse lại bằng Zod. Giữ quân trong editor thì không có gì để parse: một lần thả mà
  editor không có quân đang kéo (kéo từ tab khác, kéo file) bị bỏ qua.

### 3. Vùng thả

- `dragover` trên map: chỉ khi editor đang có quân được kéo (`isDraggingPaletteToken()`) thì
  `preventDefault()` (cho phép thả) và đặt `dropEffect = "copy"`. Kéo file hay chữ vào map thì
  trình duyệt giữ hành vi mặc định là không cho thả.
- `drop`: đổi `clientX/clientY` thành toạ độ map rồi gọi `onPaletteDrop(point)`.
- Công thức đổi toạ độ màn hình sang toạ độ map (trừ offset của zoom/pan, chia cho scale) hiện nằm
  riêng trong `pointerPoint` của `tactic-stage-view.tsx`. Nó được tách thành hàm thuần
  `canvasToMapPoint(pointer, zoom, fitScale)` trong `lib/stage-scale.ts`; canvas và vùng thả cùng
  gọi một hàm, để hai đường không thể lệch nhau.

### 4. Thả quân làm gì

Theo đúng luật đặt quân bằng bấm, trừ một chỗ:

- Chỉ admin mới đặt được (`isAdmin`), như mọi thao tác ghi khác.
- Giai đoạn đã đủ `TACTIC_LIMITS.elementsPerStage` phần tử: không đặt, toast cùng câu lỗi khi bấm.
- Màu và cỡ lấy từ toolbar (`color`, `tokenSize`), như khi bấm.
- Một lần thả là **một** bước undo.
- **Khác bấm**: bấm với công cụ "Đội hình" lên một phần tử có sẵn thì nhặt phần tử đó lên thay vì
  đặt chồng. Thả thì **luôn đặt** quân mới, kể cả khi điểm thả trùng một phần tử: kéo một quân từ
  bảng ra là ý định rõ ràng là thêm quân, không có gì để nhặt.
- Sau khi thả: ô vừa kéo thành ô "chọn sẵn" và công cụ chuyển sang "Đội hình" - giống hệt bấm ô đó
  trong bảng. Bấm lên map ngay sau đó sẽ đặt thêm một quân cùng loại, và bảng hiển thị đúng quân
  sẽ được đặt.
- Vùng chọn không đổi thêm gì ngoài việc đổi công cụ vốn đã xoá vùng chọn (`setTool`).

### 5. Quân đang kéo tự vẽ, không dùng ảnh ma của trình duyệt

Ảnh ma trình duyệt vẽ cho một lần kéo gốc luôn bán trong suốt (Chromium tự giảm độ đậm), và trang
web không chỉnh được độ mờ đó: dùng thử thì quân đang cầm quá mờ để nhận ra (#164). Nên:

- `dragstart` thay ảnh ma bằng một ảnh trong suốt 1×1 (`setDragImage`), tức là trình duyệt không vẽ
  gì cả.
- Editor giữ quân đang kéo trong **state** (không còn là ref): màn hình cần vẽ lại khi bắt đầu và
  khi kết thúc kéo.
- `PaletteDragPreview` vẽ quân đó **đậm hoàn toàn**, `position: fixed`, tâm đúng ở con trỏ, không
  nhận con trỏ (`pointer-events: none`). Vị trí lấy từ `dragover` trên `document`: sự kiện này chạy
  ở mọi chỗ con trỏ đi qua, kể cả bảng quân cờ và canvas. `drag` trên ô nguồn thì không dùng được,
  vì Firefox luôn báo toạ độ 0 cho sự kiện đó.
- Hình giống quân sẽ được đặt: nền `TOKEN_FILL` và icon `COLOR_HEX` theo màu toolbar, viền
  `tokenBorderHex` (Đội 1-10 lấy màu nhóm), bán kính `TOKEN_RADIUS[tokenSize]` nhân với scale đang
  hiển thị (`fitScale × zoom`). Thả trên map thì quân thật hiện ra đúng chỗ, đúng cỡ với hình vừa
  cầm.
- Hình chưa hiện cho tới `dragover` đầu tiên, vì trước đó chưa biết con trỏ ở đâu.

### 6. Không đổi

- Bấm ô rồi bấm map vẫn chạy y như cũ.
- Bảng đang thu gọn (`inert`) thì không kéo được, như không bấm được.
- Viewer (thành viên, điện thoại) không có bảng quân cờ, nên không có gì để kéo.

## Kiểm tra

- `stage-scale.test.ts`: `canvasToMapPoint` trừ offset rồi chia scale, ở zoom 1 và zoom khác 1.
- `use-tactic-editor.test.tsx`: thả đặt quân đúng chỗ, một bước undo, dùng màu và cỡ toolbar; thả
  không có quân đang kéo (hoặc sau `onDragEnd`) không làm gì; thả lên phần tử có sẵn vẫn đặt quân
  mới; giai đoạn đầy thì toast; thành viên không ghi được; sau khi thả, ô chọn sẵn và công cụ đổi.
- `token-palette.test.tsx`: ô là `draggable`, `dragstart` báo đúng quân, đặt kiểu MIME và thay ảnh
  ma bằng ảnh trong suốt, `dragend` báo lại.
- `palette-drag-preview.test.tsx`: chưa hiện trước `dragover` đầu tiên; sau đó tâm hình nằm ở con
  trỏ, cỡ bằng bán kính × scale, dùng màu toolbar và viền đội; bỏ listener khi unmount.
- `tactic-editor-screen.test.tsx`: kéo một ô từ bảng và thả lên map thì quân xuất hiện trên
  giai đoạn đang mở, ở toạ độ map tương ứng điểm thả; kéo thứ khác (không phải quân cờ) vào map thì
  `dragover` không được `preventDefault`.
- Chạy trên trình duyệt thật (Chromium qua Playwright, chuột thật): kéo thả ở zoom 100% và 132%,
  đối chiếu toạ độ trong scene đã lưu với điểm thả.
