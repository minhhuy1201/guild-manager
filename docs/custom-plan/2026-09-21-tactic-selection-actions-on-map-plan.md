# Plan: đưa action sửa quân cờ xuống ngay dưới quân cờ trên map

## Vấn đề

Trên `/chien-thuat/[id]`, chọn một quân cờ thì nhóm nút sửa (ba nút cỡ + nút xoá) hiện trong
`EditorToolbar` ở tận trên đầu trang. Mắt đang nhìn quân cờ giữa map, tay phải kéo chuột lên
toolbar rồi kéo ngược xuống để xem kết quả — xa và khó thao tác.

## Mục tiêu

Chọn một phần tử bất kỳ trên map → thanh action nổi ngay **dưới** phần tử đó, trên chính canvas.

## Quyết định

### 1. Toolbar không còn nhóm "phần tử đang chọn"

- Xoá hẳn nhóm đó khỏi `EditorToolbar` cùng bốn prop `selectedTokenSize`, `hasSelection`,
  `onTokenSizeChange`, `onDeleteSelected`. Giữ cả hai chỗ là nhân đôi một action — user sẽ không
  biết chỗ nào mới là chỗ dùng.
- Phím `Delete` (qua `useEditorShortcuts`) không đổi.

### 2. `lib/selection-anchor.ts` — toán vị trí, thuần và test được

- `elementAnchor(element)`: điểm **giữa - đáy** của phần tử, tính bằng đơn vị map.
  - `token`: `x`, `y + bán kính` (+ khoảng nhãn khi quân cờ có nhãn, để thanh action không đè nhãn).
  - `text`: giữa bề rộng ước lượng, đáy là `y + fontSize`.
  - `arrow` / `freehand`: giữa - đáy của bounding box các điểm.
  - `default` → `assertNever`, thêm loại phần tử mới là lỗi biên dịch.
- `selectionPlacement(anchor, viewport)`: đổi điểm map sang pixel canvas rồi trả `{ left, top,
  above }`, hoặc `null` khi điểm neo nằm ngoài khung nhìn (pan/zoom đẩy phần tử ra khỏi canvas thì
  thanh action biến mất chứ không dính mép).
  - Gần đáy canvas thì lật lên trên (`above`), nếu không thì nằm dưới.
  - `left` kẹp trong khung để thanh không tràn ra ngoài canvas.
- Hằng số nhãn quân cờ (`TOKEN_LABEL_GAP`, `TOKEN_LABEL_FONT_SIZE`) và `TEXT_WIDTH_RATIO` chuyển ra
  lib dùng chung thay vì khai báo lại — `tactic-stage-view` và `hit-test` cùng dùng một con số.

### 3. `components/selection-actions.tsx` — thanh action nổi

- Nhận `placement`, `tokenSize`, `onTokenSizeChange`, `onDeleteSelected`.
- Ba nút cỡ chỉ hiện với quân cờ; nút xoá hiện với mọi loại phần tử — đúng như toolbar cũ.
- Dựng ở cỡ `xs`, nền `bg-card/90 backdrop-blur`, giống `ZoomReadout`: nó nổi trên bản vẽ.
- `role="toolbar"` + `aria-label="Sửa phần tử đang chọn"`, có `aria-pressed` trên nút cỡ đang chọn.

### 4. Nối dây

- `useTacticEditor` trả `selectedElement` (cả phần tử) thay cho `selectedTokenSize` — màn hình cần
  toạ độ chứ không chỉ cỡ.
- `useStageZoom` trả thêm `viewport` (nó đã tính sẵn), để màn hình không tính lại.
- `TacticEditorScreen` đặt `SelectionActions` trong đúng cái box `relative` đang chứa canvas và
  `ZoomReadout`.

## Kiểm tra (TDD — test viết trước)

- `selection-anchor.test.ts`: neo của từng loại phần tử, lật lên khi sát đáy, kẹp trái/phải, ẩn khi
  ra ngoài khung.
- `selection-actions.test.tsx`: nút cỡ chỉ cho quân cờ, nút xoá cho mọi phần tử, callback, nhãn.
- `editor-toolbar.test.tsx`: toolbar không còn nút cỡ / nút xoá.
- `tactic-editor-screen.test.tsx`: chọn phần tử → thanh action hiện trên map; bỏ chọn → biến mất.
- `use-tactic-editor.test.tsx`: `selectedElement`.
- Chạy `pnpm --filter web test`, `lint`, `build`.
