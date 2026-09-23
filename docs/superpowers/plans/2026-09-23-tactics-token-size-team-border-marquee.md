# Cỡ quân cờ trên toolbar, viền theo màu đội, chọn vùng nhiều phần tử - Implementation Plan

> **For agentic workers:** Thực thi inline, task theo thứ tự (CLAUDE.md dự án: không spawn subagent
> trừ khi được yêu cầu). Steps dùng checkbox (`- [x]`).

**Goal:** Toolbar có nhóm cỡ quân cờ (mặc định "Vừa"); quân Đội 1-10 có viền theo màu nhóm đội ở
`/xep-team`; công cụ Chọn có khung chọn kéo chuột, Shift+nhấn, kéo cả nhóm, đổi cỡ và xoá cả nhóm.

**Architecture:** Luật hình học và biến đổi scene là hàm thuần trong `lib/element-geometry.ts` và
`lib/scene.ts`. Store đổi từ một id được chọn sang một mảng id. `useTacticEditor` giữ toàn bộ máy
trạng thái cử chỉ (khung chọn, kéo nhóm) và bỏ `draggable` của Konva. `TacticStageView` chỉ vẽ.

**Tech Stack:** Next.js 16 · React 19 · react-konva · Zustand · Vitest + @testing-library/react

**Spec:** [`docs/superpowers/specs/2026-09-23-tactics-token-size-team-border-marquee-design.md`](../specs/2026-09-23-tactics-token-size-team-border-marquee-design.md)

## Global Constraints

- Mọi lệnh chạy qua `pnpm --filter web …`.
- Code, tên file, comment tiếng Anh; chuỗi hiển thị tiếng Việt; tài liệu `docs/superpowers` tiếng
  Việt. Mỗi hàm có JSDoc tiếng Anh.
- Không đột biến dữ liệu; switch trên `kind` kết bằng `assertNever`; không giá trị ma
  (`DRAG_THRESHOLD = 4`, hex nhóm đội là hằng số có tên).
- Không dùng dấu gạch dài.
- Không đụng `packages/shared`, `apps/api`, Prisma, env, endpoint, `TACTIC_SCHEMA_VERSION`.
- Chỉ mở rộng file test đã có, không tạo file test mới.
- Nhánh `feat/tactics-token-size-team-colors-marquee`. Commit Conventional Commits, scope `tactics`
  (Task 2 dùng scope `web`).

## Cấu trúc file

| File | Thay đổi |
|---|---|
| `apps/web/lib/team-color-group.ts` (mới) | `TeamColorGroup`, `teamColorGroup(team)` |
| `apps/web/features/team-builder/lib/team-colors.ts` | Map nhóm sang class qua `teamColorGroup` |
| `apps/web/features/tactics/lib/token-icon.ts` | `TEAM_GROUP_HEX`, `tokenBorderHex`, `TOKEN_SIZE_LABELS`, `TOKEN_SIZE_TEXT` |
| `apps/web/features/tactics/lib/element-geometry.ts` | `left`/`right` trong `ElementBounds`, `MapRect`, `rectFromPoints`, `elementsInRect`, `unionBounds` |
| `apps/web/features/tactics/lib/scene.ts` | `translateElements`, `resizeTokens`, `removeElements`; bỏ `moveToken`, `resizeToken` nếu hết người dùng |
| `apps/web/features/tactics/lib/create-element.ts` | `createToken(source, point, color, size)` |
| `apps/web/features/tactics/lib/selection-anchor.ts` | Tham số thu lại thành `Pick<ElementBounds, "centerX" \| "top" \| "bottom">`; nhận `unionBounds` |
| `apps/web/features/tactics/store/editor-store.ts` | `tokenSize`, `selectedElementIds`, `selectElements`, `toggleElementSelection`, `clearSelection`, `updateElements` |
| `apps/web/features/tactics/hooks/use-tactic-editor.ts` | Máy trạng thái cử chỉ, `selectedElements`, `marquee`, `isMoving`, `onToolbarTokenSizeChange` |
| `apps/web/features/tactics/hooks/use-tactic-export.ts` | `selectElement(null)` thành `clearSelection()` |
| `apps/web/features/tactics/components/tactic-stage-view.tsx` | Bỏ Konva drag; `selectedElementIds`, `marquee`; hộp nét đứt; `tokenBorderHex`; `onPointerDown(point, { shift })` |
| `apps/web/features/tactics/components/editor-toolbar.tsx` | Nhóm cỡ quân cờ |
| `apps/web/features/tactics/components/selection-actions.tsx` | Nhãn từ `token-icon.ts`; prop `tokenSizes` (rỗng thì ẩn nút cỡ, khác cỡ thì không nút nào sáng) |
| `apps/web/features/tactics/components/tactic-editor-screen.tsx` | Nối các prop mới |
| `apps/web/features/tactics/hooks/use-editor-shortcuts.ts` | Doc: Delete xoá cả vùng chọn |

---

## Task 1: Hình học và biến đổi scene (thuần)

**Files:** `lib/element-geometry.ts`, `lib/scene.ts`, `lib/create-element.ts` · Test:
`__tests__/element-geometry.test.ts`, `__tests__/scene.test.ts`, `__tests__/create-element.test.ts`

**Produces:**
- `interface MapRect { left: number; top: number; right: number; bottom: number }`
- `ElementBounds` thêm `left: number; right: number`
- `rectFromPoints(a: MapPoint, b: MapPoint): MapRect`
- `elementsInRect(stage: TacticStage, rect: MapRect): string[]` (thứ tự theo `stage.elements`)
- `unionBounds(bounds: readonly ElementBounds[]): ElementBounds` (mảng rỗng là lỗi lập trình, gọi
  chỉ khi có vùng chọn)
- `translateElements(stage, ids: readonly string[], dx: number, dy: number): TacticStage`
- `resizeTokens(stage, ids: readonly string[], size: TacticTokenSize): TacticStage`
- `removeElements(stage, ids: readonly string[]): TacticStage`
- `createToken(source, point, color, size: TacticTokenSize): TacticToken`

- [x] Viết test hỏng cho từng hàm theo mục "Kiểm thử" của spec (bốn hướng kéo, nằm trọn / chạm mép /
  lòi ra, bốn `kind` khi dịch, không đột biến đầu vào, phần tử ngoài `ids` giữ nguyên tham chiếu).
- [x] `pnpm --filter web test -- element-geometry scene create-element`: thấy hỏng.
- [x] Cài đặt. Token bounds: `left/right = x ∓ radius`. `polylineBounds` trả thêm `left/right`.
  "Nằm trọn" dùng `>=`/`<=` (chạm mép vẫn tính).
- [x] Cập nhật caller của `createToken` trong `use-tactic-editor.ts` truyền tạm `"md"` để build xanh.
- [x] Chạy lại test: xanh. Commit `feat(tactics): add marquee geometry and multi-element scene edits`.

## Task 2: Tách nhóm màu đội ra `apps/web/lib`

**Files:** `apps/web/lib/team-color-group.ts` (mới), `features/team-builder/lib/team-colors.ts`

**Produces:** `type TeamColorGroup = "jade" | "stone" | "navy" | "gold"`;
`teamColorGroup(team: number): TeamColorGroup | null`.

- [x] Chuyển bảng đội sang nhóm (1-5 jade, 6-7 stone, 8 navy, 9-10 gold) vào file mới, kèm comment
  lý do đang có ("four groups the guild splits its ten teams into").
- [x] `team-colors.ts`: `GROUP_COLORS: Record<TeamColorGroup, TeamColors>`, `getTeamColors` =
  `group ? GROUP_COLORS[group] : DEFAULT_TEAM_COLORS`. Chữ ký `getTeamColors` không đổi.
- [x] `pnpm --filter web test -- team-builder` xanh; `pnpm --filter web lint` xanh.
- [x] Commit `refactor(web): share the team color grouping outside the team builder`.

## Task 3: Viền quân Đội N theo màu nhóm

**Files:** `lib/token-icon.ts`, `components/tactic-stage-view.tsx` · Test:
`__tests__/tactic-stage-view.test.tsx` (và test của `token-icon` nếu đã có trong `icon-paths.test.ts`
hoặc tương tự; không tạo file mới)

**Produces:** `TEAM_GROUP_HEX: Record<TeamColorGroup, string>` =
`{ jade: "#6fb59d", stone: "#c2bdb7", navy: "#6c84c3", gold: "#d4b278" }`;
`tokenBorderHex(token: TacticToken): string`.

- [x] Test hỏng: quân `number-3` viền `#6fb59d`, `number-8` viền `#6c84c3`, quân `swords` màu `red`
  viền `COLOR_HEX.red`; chữ số vẫn `COLOR_HEX[color]`.
- [x] Cài đặt: số đội lấy qua `Number(numberIconDigits(icon))`. Dùng `tokenBorderHex` cho viền,
  quầng hover, vệt đuôi.
- [x] Test xanh. Commit `feat(tactics): border team tokens in their team builder color`.

## Task 4: Store: cỡ mặc định và vùng chọn nhiều phần tử

**Files:** `store/editor-store.ts`, `hooks/use-tactic-export.ts` · Test:
`__tests__/editor-store.test.ts`, `hooks/__tests__/use-tactic-export.test.tsx`

**Produces:** `tokenSize: TacticTokenSize` (mặc định `"md"`), `setTokenSize`;
`selectedElementIds: readonly string[]`, `selectElements(ids)`, `toggleElementSelection(id)`,
`clearSelection()`; `updateElements(stageId, elements)` (không ghi undo, `dirty: true`). Bỏ
`selectedElementId` và `selectElement`.

- [x] Test hỏng theo spec. Giữ nguyên các test đang kiểm "đổi tool/stage/undo/redo/loadScene xoá
  vùng chọn", chỉ đổi sang `selectedElementIds` rỗng.
- [x] Cài đặt. Comment ở `setTool` sửa lại lý do (không còn gắn với nút cỡ của công cụ token).
- [x] Cập nhật `use-tactic-export.ts` sang `clearSelection()`.
- [x] Test xanh (build sẽ còn đỏ ở hook/screen đến Task 5-6: không commit riêng, gộp commit với
  Task 5).

## Task 5: Hook: cử chỉ chọn, khung chọn, kéo nhóm, cỡ

**Files:** `hooks/use-tactic-editor.ts` · Test: `hooks/__tests__/use-tactic-editor.test.tsx`

**Interface đổi của `TacticEditorScreen`:**
- Bỏ: `selectedElement`, `draggingTokenId`, `onTokenDragStart`, `onTokenMoved`,
  `onTokenSizeChange`.
- Thêm: `selectedElements: TacticElement[]`; `marquee: MapRect | null`; `isMoving: boolean`;
  `onPointerDown(point, modifiers: { shift: boolean })`; `onSelectionTokenSizeChange(size)` (chỉ áp
  vùng chọn); `onToolbarTokenSizeChange(size)` (đặt `tokenSize` rồi áp vùng chọn nếu có token);
  `onDeleteSelected` xoá cả vùng chọn.

**Máy trạng thái** (một `gestureRef` kiểu union có `kind`, switch kết `assertNever`):
- `{ kind: "marquee", origin, additive, base: readonly string[] }`
- `{ kind: "move", origin, stage, ids, pressedId, written }` - `written` là mảng phần tử cú kéo ghi lần
  cuối (ban đầu là `stage.elements`); khác mảng hiện có của giai đoạn nghĩa là có ai sửa giữa chừng,
  cú kéo dừng (spec §5).
- `null` khi không có cử chỉ. `marquee` hiển thị giữ trong `useState` để canvas vẽ lại.

Luật theo bảng ở spec §4. Điểm cần chú ý:
- `onPointerMove` vượt `DRAG_THRESHOLD` lần đầu với `move`: `commit(translateElements(base…))`;
  các lần sau `updateElements`. Dịch luôn tính từ `origin` trên `baseElements`.
- `onPointerUp`: `marquee` thì `selectElements(additive ? union(base, hits) : hits)` (bỏ trùng, giữ
  thứ tự); `move` chưa `moved` và vùng chọn > 1 thì `selectElements([pressedId])`. Luôn xoá gesture.
- Listener `window` `mouseup`/`touchend`/`blur` đang có tiếp tục gọi `onPointerUp`. Cần điểm cuối cho
  khung: lấy từ `marquee` state đã cập nhật ở lần move cuối, không phải từ event.
- Không bắt đầu `move` khi `animating`: `TacticStageView` (đã có prop `animating`) bỏ qua cú nhấn,
  hook không cần thêm prop.

- [x] Test hỏng cho từng dòng mục `use-tactic-editor.test.tsx` trong spec. Cập nhật test đang dùng
  `onTokenMoved` sang cử chỉ con trỏ.
- [x] Cài đặt; bỏ `moveToken`, `resizeToken` khỏi `scene.ts` nếu không còn ai import (xoá test của
  chúng cùng lúc).
- [x] Test xanh.

## Task 6: Canvas, toolbar, thanh nổi, màn hình

**Files:** `components/tactic-stage-view.tsx`, `components/editor-toolbar.tsx`,
`components/selection-actions.tsx`, `components/tactic-editor-screen.tsx`,
`components/tactic-viewer.tsx`, `lib/token-icon.ts` · Test: `tactic-stage-view.test.tsx`,
`editor-toolbar.test.tsx`, `selection-actions.test.tsx`, `tactic-editor-screen.test.tsx`,
`tactic-viewer.test.tsx`

- [x] `token-icon.ts`: chuyển `SIZE_LABELS`/`SIZE_TEXT` từ `selection-actions.tsx` thành
  `TOKEN_SIZE_LABELS`/`TOKEN_SIZE_TEXT`.
- [x] `TacticStageView`: bỏ `draggable`, `onTokenDragStart`, `onTokenMoved`; prop
  `selectedElementIds?: readonly string[]`, `marquee?: MapRect | null`; `onPointerDown` truyền
  `{ shift: event.evt.shiftKey }` (touch: `false`); layer `listening={false}` vẽ khung chọn và hộp
  nét đứt của phần tử không phải token, nét chia `scale`. Cursor `grab` giữ theo `!readOnly`.
- [x] `EditorToolbar`: props `tokenSize`, `onTokenSizeChange`; nhóm ba nút sau nhóm nét, `title`
  `"Cỡ quân cờ: Vừa"` v.v.
- [x] `SelectionActions`: `tokenSizes: readonly TacticTokenSize[]`.
- [x] `TacticEditorScreen`: placement từ `unionBounds(selectedElements.map(elementBounds))`; ẩn thanh
  khi `isMoving` hoặc `marquee`; nối toolbar với `onToolbarTokenSizeChange`.
- [x] Test hỏng trước, rồi cài đặt, rồi xanh:
  `pnpm --filter web test -- tactics`.
- [x] `pnpm --filter web lint` và `pnpm --filter web typecheck` xanh.
- [x] Commit `feat(tactics): select several elements with a marquee and move them together`, rồi
  commit riêng `feat(tactics): pick the token size from the toolbar` nếu tách được sạch; không thì
  gộp.

## Task 7: Kiểm tra tay trên trình duyệt

- [x] `pnpm --filter api dev` + `pnpm --filter web dev`, đăng nhập admin, mở một chiến thuật.
- [x] Làm hết danh sách "Kiểm tra tay" ở cuối spec, và `/xep-team` còn đúng bốn nhóm màu.
- [x] Sai ở đâu thì sửa spec/plan trước (nếu là sai giả định), rồi sửa code.

## Task 8: Tài liệu

- [x] `docs/superpowers/specs/2026-09-20-tactics-board-design.md`: thêm một dòng trỏ sang spec này ở
  chỗ nói về chọn một phần tử và kéo quân cờ (không sửa lịch sử).
- [x] `docs/architecture.md` §4.2: thêm `team-color-group.ts` vào dòng liệt kê `lib/`.
- [x] Commit `docs(tactics): record marquee selection and team token borders`.

## Verify (chạy hết sau Task 8)

- [x] `pnpm --filter web test` xanh toàn bộ.
- [x] `pnpm --filter web lint` xanh.
- [x] `pnpm --filter web typecheck` xanh.
- [x] `pnpm --filter web build` xanh.
- [x] Spec, plan, code, test khớp nhau.
