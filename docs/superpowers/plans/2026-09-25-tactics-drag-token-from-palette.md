# Plan: kéo quân cờ từ bảng quân cờ ra map

Spec: [`../specs/2026-09-25-tactics-drag-token-from-palette-design.md`](../specs/2026-09-25-tactics-drag-token-from-palette-design.md)

Nhánh: `feat/tactics-drag-token-from-sidebar`. Mỗi bước viết test trước, chạy đỏ, rồi mới code.

## 1. `lib/stage-scale.ts` - `canvasToMapPoint`

- Thêm `canvasToMapPoint(pointer, zoom, fitScale)`: trừ `zoom.offset`, gọi `toMapPoint` với
  `fitScale * zoom.zoom`.
- `tactic-stage-view.tsx`: `pointerPoint` gọi hàm này thay cho công thức viết tay.
- Test: `__tests__/stage-scale.test.ts`.

## 2. `useTacticEditor` - kéo và thả

- Ref `draggedTokenRef: BuiltInToken | null` (không cần render lại khi đổi).
- Tách phần kiểm giai đoạn đầy + toast trong `onPointerDown` thành `refuseFullStage(stage)`, và phần
  "tạo quân + commit" của nhánh `token` thành `placeToken(stage, token, point)`, để bấm và thả dùng
  chung một luật.
- Trả thêm:
  - `onPaletteDragStart(token)` - nhớ quân.
  - `onPaletteDragEnd()` - quên quân.
  - `isDraggingPaletteToken()` - vùng thả hỏi lúc `dragover`.
  - `onPaletteDrop(point)` - nếu có quân đang kéo và là admin: chọn sẵn ô đó, `setTool("token")`,
    rồi `placeToken`. Quên quân sau khi thả.
- Test: `hooks/__tests__/use-tactic-editor.test.tsx`, nhóm `describe` mới.

## 3. `TokenPalette` - ô kéo được

- Hằng `TOKEN_DRAG_TYPE = "application/x-guild-tactic-token"` trong `lib/built-in-tokens.ts` (cạnh
  kiểu `BuiltInToken`).
- Prop mới `onDragStart(token)`, `onDragEnd()`. Nút mỗi ô có `draggable`, `onDragStart` đặt
  `setData(TOKEN_DRAG_TYPE, token.label)` + `effectAllowed = "copy"` rồi gọi prop.
- Test: `__tests__/token-palette.test.tsx`.

## 4. `TacticEditorScreen` - vùng thả

- Div bọc canvas: `onDragOver` (chỉ `preventDefault` khi `editor.isDraggingPaletteToken()`), `onDrop`
  đổi `clientX/Y - rect` qua `canvasToMapPoint(…, stageZoom.zoom, stageZoom.viewport.fitScale)`.
- Nối `onDragStart/onDragEnd` của bảng vào editor.
- Test: `__tests__/tactic-editor-screen.test.tsx`.

## 5. Quân đang kéo rõ hơn (sau review tay trên PR #164)

- `useTacticEditor`: `draggedTokenRef` thành state `draggedPaletteToken`, trả ra cho màn hình;
  `isDraggingPaletteToken()` đọc state đó.
- `TokenPalette`: `dragstart` gọi `setDragImage(ảnh trong suốt 1×1, 0, 0)`. Ảnh tạo sẵn một lần ở
  phía trình duyệt, vì ảnh chưa tải xong thì trình duyệt quay về ảnh ma mặc định.
- `components/palette-drag-preview.tsx` (mới): nghe `dragover` trên `document`, vẽ quân đậm tại con
  trỏ.
- `tokenBorderHex` nhận `Pick<TacticToken, "icon" | "color">`, để hình xem trước dùng chung luật viền
  mà không phải dựng một quân giả.
- `TacticEditorScreen` dựng `PaletteDragPreview` khi `editor.draggedPaletteToken` khác null.
- Test: `__tests__/palette-drag-preview.test.tsx`, cập nhật `token-palette.test.tsx`.

## 6. Tài liệu và kiểm

- Ghi thêm một dòng "Cập nhật 2026-09-25" vào spec tactics board (mục quân cờ trên map).
- `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web build`.
- Chạy app thật, kéo thả trên trình duyệt (Chromium qua Playwright, chuột thật).
- Commit, push, mở PR vào `main` theo template, review một lượt, sửa nit.
