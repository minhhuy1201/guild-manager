# Rà soát bảng chiến thuật `/chien-thuat` (T1-T6) - Tổng quan

Ngày: 2026-09-22 · Phạm vi: feature tactics (`apps/api/src/modules/tactics`,
`apps/web/features/tactics`, `apps/web/app/chien-thuat`, `packages/shared/schemas/tactic.schema.ts`,
`packages/shared/schemas/lift-tactic-scene.ts`) ở commit `4bf58a8`, cộng luồng phân quyền admin /
member đi qua route đó.

Bốn đợt rà soát trước ([đợt 4](./2026-09-20-architecture-review-4-overview.md) là gần nhất) không
chạm tới tactics vì feature vào sau (#145-#151). Đợt này đóng vai lần lượt admin và member, liệt kê
bug đã kiểm chứng tại source, chỗ spec lệch code, và các cơ hội **làm sâu module** (deepening).

Từ vựng giống các đợt trước: *module*, *interface*, *implementation*, *seam*, *adapter*, *depth*,
*leverage*, *locality*.

## 1. Hiện trạng đã kiểm

- Test: web 1131/1131, api 611/611. Lint web + api sạch.
- E2E chưa đăng nhập (api + web dev local): mọi trang cần session trả `307` về
  `/dang-nhap?redirect=…`, `/` về `/trang-chu`, `GET /api/tactics` và `GET /api/tactics/:id` trả
  `401`. Đúng thiết kế.
- E2E sau đăng nhập **chưa chạy**: login đi qua Discord OAuth, và bước tự ký JWT local bị chặn trong
  phiên rà soát. Walkthrough admin / member bên dưới là đọc code theo đúng đường render; mỗi bug đã
  mở source kiểm lại. Mỗi PR sửa bug phải tái hiện bug trên trình duyệt trước khi sửa.

### Member

Không có lỗ phân quyền. Nav ẩn *Xếp team*, *Thiết lập*; proxy đẩy member gõ tay các route đó về `/`.
`/chien-thuat` không có nút ghi; trang chi tiết dùng `TacticViewer` chỉ đọc, không có nút xuất ảnh
(đúng spec gốc dòng 38, 339). Mọi handler ghi có `@UseGuards(AdminGuard)`
(`tactics.controller.ts:68,79,103,116,132,146`). Khoảng trống duy nhất: test phân quyền chỉ đọc
metadata của guard, chưa có test đi qua HTTP như spec gốc dòng 403 yêu cầu.

### Admin

Các bug dưới đây đều nằm ở luồng của admin trên desktop.

## 2. Bug đã kiểm chứng

| | Vấn đề | Chỗ | Mức |
|---|---|---|---|
| **B1** | `markSaved` set `dirty:false` vô điều kiện. Nét vẽ trong lúc `PUT` đang chạy bị coi là đã lưu, `beforeunload` tắt, reload là mất | `store/editor-store.ts:264`, `hooks/use-tactic-editor.ts` `onSave` | Cao |
| **B2** | Draft nạp một lần từ cache (`staleTime` 60s), refetch nền bị bỏ qua. Mở lại chiến thuật admin khác vừa lưu thì nhận bản cũ, lưu tiếp là ghi đè | `use-tactic-editor.ts:133-140`, `components/providers.tsx:26` | Vừa |
| **B3** | Nét vẽ chỉ kết thúc ở `onMouseUp` / `onTouchEnd` của Stage. Nhả chuột ngoài canvas thì nét tiếp tục kéo dài khi rê vào lại. Pan đã nghe `window` mouseup + blur | `components/tactic-stage-view.tsx:170-183`, `hooks/use-stage-zoom.ts:114-117` | Vừa |
| **B4** | Xoá giai đoạn không hỏi xác nhận và không undo được. Spec gốc (dòng 320-321) và comment store (`editor-store.ts:192-193`) đều dựa vào một hộp xác nhận không tồn tại | `components/stage-bar.tsx:122-134` | Cao |
| **B5** | Điều hướng trong app (breadcrumb, nav) khi chưa lưu làm mất bản vẽ không cảnh báo. `useUnsavedGuard` chỉ bắt `beforeunload`, `reset` chạy khi unmount. Spec gốc dòng 32 hứa "chặn rời trang" | `hooks/use-unsaved-guard.ts`, `use-tactic-editor.ts:142` | Cao |
| **B6** | Xuất ảnh gọi `toDataURL` trên Stage đang hiển thị, Stage này mang scale + offset của zoom/pan: ảnh chỉ là phần viewport, độ phân giải theo bề rộng khung, dính vòng chọn / hover. Trái spec gốc dòng 101-103 | `hooks/use-tactic-export.ts:67,83` | Vừa |
| **B7** | `migrateScene` throw trong `useEffect`, lỗi rơi ra error boundary của route thay vì `QueryBoundary` | `use-tactic-editor.ts:139` | Thấp |
| **B8** | Lỗi bị nuốt: `void deletePreset.mutateAsync(...)`, `exportAllStages` chỉ có try/finally rồi gọi bằng `void`. Spec gốc dòng 381-382 yêu cầu báo lỗi | `components/token-preset-dialog.tsx:139`, `use-tactic-export.ts:73-100` | Thấp |
| **B10** | `isTypingTarget` chỉ loại input / textarea / contentEditable. Dialog mở, focus ở button: `Delete` vẫn xoá phần tử trên map, phím số vẫn đổi tool | `lib/shortcuts.ts`, `hooks/use-editor-shortcuts.ts:38,79` | Vừa |
| **B11** | `GET /tactics` parse mọi scene chỉ để đếm giai đoạn; một row hỏng làm cả list `500` | `tactics.service.ts` `list()`, `tactics.codec.ts` `toSummary` | Thấp |

Nghi ngờ, cần tái hiện trên trình duyệt trước khi xếp vào PR:

- **B13** - đang ở tool mũi tên / vẽ tự do, mousedown trúng token có thể vừa bắt đầu nét vừa kéo
  token (`draggable` không xét tool, `tactic-stage-view.tsx:200`).
- **B14** - bấm `←` / `→` khi export-all đang chạy có thể đổi giai đoạn giữa vòng lặp.
- **B16** - `Ctrl+S` không chặn khi `isPending`, có thể bắn hai `PUT` song song.

**Không bàn lại:** last-write-wins giữa hai admin (spec gốc §7, `architecture.md` §8). B2 chỉ sửa
phần cache cũ làm rộng cửa sổ rủi ro, không thêm khoá lạc quan.

## 3. Spec gốc lệch code

`docs/superpowers/specs/2026-09-20-tactics-board-design.md` chưa sửa lần nào từ #145, trong khi
#146-#151 đổi behaviour:

- Phím tắt: spec `1-5`, không có tool select; code `1` select … `6` tẩy. Doc comment
  `use-editor-shortcuts.ts:10` cũng còn ghi "1-5".
- Nút đổi cỡ token: spec đặt trên toolbar; code ở `SelectionActions` dưới phần tử (#151).
- Trang chi tiết: spec nói không banner; code có `PageHeader banner="tactics"` (#150).
- Màu: spec đỏ / xanh / vàng / trắng; enum là xanh / đỏ / vàng / đen.
- `schemaVersion`: spec `literal(1)`, code v2; phần nâng version đã chuyển sang shared
  `lift-tactic-scene.ts`, không còn ở `lib/migrate-scene.ts`.
- Sơ đồ layout (dòng 355) đã cũ.

## 4. Cơ hội làm sâu module

| | Deepening | Mức | Bug được đóng |
|---|---|---|---|
| **T1** | Editor session thành một deep module | Strong | B1, B2, B16 |
| **T2** | Pointer gesture có một seam kết thúc | Strong | B3, B13 |
| **T3** | Một đường đọc scene trong `packages/shared` | Strong | B7, B11 |
| **T4** | Keyboard scope dùng chung | Worth exploring | B10 |
| **T5** | Hình học phần tử theo kind | Worth exploring | - |
| **T6** | List tactics không parse cả scene | Speculative | B11 (gộp vào T3) |

### T1 - Editor session

Draft hiện có ba interface chồng nhau. Store tự nhận "mọi rule ở `lib/scene`", nhưng viết lại
`replaceStage` ba lần (`editor-store.ts:119-124, 148-155, 179-186`) và tự prune history khi xoá giai
đoạn (`:245-248`) thay vì để `lib/history.ts` làm. `useTacticEditor` trả 24 field và bypass action của
store bằng `useTacticEditorStore.setState` thô cho nét đang vẽ (`use-tactic-editor.ts:249-266`).
Screen lại đọc khoảng 20 selector trực tiếp, trong đó `scene` và `loadedScene` là cùng một selector
(`tactic-editor-screen.tsx:59, 82`).

**Giải pháp.** Store thành module "editor session" duy nhất với thao tác ở mức ý định: bắt đầu / nối /
kết thúc nét, đặt token, tẩy, undo / redo, thao tác giai đoạn, và vòng đời lưu nhận snapshot đã gửi.
`dirty` được **suy ra** bằng so sánh scene hiện tại với snapshot server đã xác nhận, giống
`formation-diff.ts` bên team-builder. `useTacticEditor` chỉ còn là adapter React: query, ref Konva,
toast.

- B1 hết theo thiết kế: lưu xong chỉ cập nhật snapshot bằng đúng bản đã gửi; nét vẽ sau đó vẫn khác
  snapshot nên vẫn `dirty`.
- B2: khi mở editor, draft nạp từ lần fetch mới (không lấy bản cache đã stale); sau khi đã nạp thì
  refetch nền vẫn không ghi đè draft, giữ nguyên quyết định hiện tại. Fetch mới hỏng mà còn cache thì
  nạp cache kèm cảnh báo (mục 6).
- B16: session từ chối bắt đầu lần lưu thứ hai khi lần đầu còn chạy.
- Test: chuyển trạng thái thuần trên store, không cần `renderHook`.

### T2 - Pointer gesture

Nét vẽ kết thúc ở chỗ không bảo đảm, pan thì có (xem B3): hai gesture xử lý không đối xứng. Chính
sách theo tool rò vào view (`draggable={!readOnly && element.kind === "token"}` không xét tool), và
selection đi hai đường (Konva `onClick` và `hitTest` ở mousedown).

**Giải pháp.** Stroke dùng chung seam "gesture end" với pan: `window` pointerup + blur. View chỉ dịch
event thô sang toạ độ map; session (T1) quyết định phần tử nào kéo được / click được theo tool. Tách
`ElementShape` / `TokenArt` ra file riêng chỉ khi làm cùng, tách riêng là split nông.

### T3 - Đọc scene một đường

`tactics.codec.ts:52-78` (`parseScene`) và `lib/migrate-scene.ts:19-38` (`migrateScene`) là cùng ba
bước: chặn version mới hơn, `liftTacticScene`, `tacticSceneSchema.safeParse`. Trái luật
"`packages/shared` sở hữu mọi validation rule".

**Giải pháp.** `readTacticScene(raw)` trong shared trả union có tag `ok | newer | corrupt`, kết thúc
bằng `assertNever` ở mỗi nơi gọi. API map sang `InternalServerErrorException`; web gọi ở seam fetch
(`fetchTactic`) nên bản hỏng thành lỗi query, hiện trong `QueryBoundary` (B7). Test gộp về shared.

List (B11, T6): `toSummary` chỉ cần số giai đoạn. Đếm bằng `jsonb_array_length` qua `$queryRaw` có
tham số, hoặc đọc mảng `stages` mà không parse toàn scene. Một row hỏng không còn làm hỏng cả list.

### T4 - Keyboard scope

Tactics có `isTypingTarget` riêng; team-builder có `lib/keyboard-target.ts` (`isInsideDialog`). Hai
adapter đã tồn tại, nên đây là seam thật. Chuyển một helper vào `apps/web/hooks/` (hoặc `apps/web/lib/`
theo §7 của `architecture.md`), cả hai feature dùng; shortcut tactics tắt khi focus ở trong dialog
(B10). Behaviour team-builder giữ nguyên.

### T5 - Hình học phần tử

Ba switch theo kind: `lib/hit-test.ts`, `lib/selection-anchor.ts`, `tactic-stage-view.tsx`. Hằng số
rải rác (`TEXT_WIDTH_RATIO` export chéo, `TOKEN_RADIUS` ở `token-icon.ts`). Một module geometry theo kind
(bounds, hit, anchor) để hit test và vị trí action bar luôn khớp. Chỉ làm khi thêm kind phần tử mới.

### Không phải candidate

`use-tactic`, `use-tactics`, `use-save-tactic`, `use-token-presets` là pass-through nhưng
`architecture.md` §4.2 bắt buộc. `tactic-canvas.tsx` là adapter `ssr:false` bắt buộc. Gộp stage
switcher của editor với viewer: hai cái cố ý khác nhau.

## 5. Kế hoạch PR

Ước lượng: **8 PR**. Bug liên quan gộp cùng PR; mỗi PR sửa bug kèm test
tái hiện đỏ trước khi sửa, và cập nhật spec gốc nếu đổi behaviour.

| PR | Branch | Nội dung | Đổi behaviour | Phụ thuộc |
|---|---|---|---|---|
| **1** | `docs/tactics-spec-reconcile` | Mục 3: kéo spec gốc khớp #146-#151 | Không | - |
| **2** | `fix/tactics-protect-unsaved-work` | B4 hộp xác nhận xoá giai đoạn; B5 chặn điều hướng trong app khi `dirty` | Có | 1 |
| **3** | `fix/tactics-keyboard-and-errors` | T4 + B10; B8 báo lỗi xoá preset và export-all | Có | 1 |
| **4** | `refactor/tactics-editor-session` | T1 + B1, B2, B16 | Có (B1, B2, B16) | 2 |
| **5** | `fix/tactics-pointer-gesture` | T2 + B3, B13 (nếu tái hiện được) | Có | 4 |
| **6** | `refactor/tactics-scene-read` | T3 + B7, B11; test HTTP member nhận `403` trên mọi route ghi | Có (B7, B11) | 1 |
| **7** | `fix/tactics-export-image` | B6 + B14 | Có | 4 |
| **8** | `refactor/tactics-element-geometry` | T5 | Không | 5 |

Thứ tự đề xuất: 1 → 2 và 3 và 6 song song → 4 → 5 và 7.

### Ghi chú từng PR

- **PR 2 - B5.** App Router không có sự kiện route change để chặn. Hướng: khi `dirty`, bắt click trên
  `<a>` cùng origin ở pha capture và `popstate`, mở hộp xác nhận dùng chung; `beforeunload` giữ nguyên.
  Hộp xác nhận B4 và B5 dùng cùng một component dialog có sẵn của repo.
- **PR 4.** Trước khi code, grilling interface của editor session; refactor nhiều file nên vào plan
  mode. Test hiện có của store / hook phải còn xanh hoặc đổi cùng commit, message nói rõ lý do.
- **PR 5.** Phụ thuộc PR 4 vì quyết định "phần tử nào kéo được theo tool" chuyển vào session.
- **PR 6.** Đếm giai đoạn bằng SQL phải qua `$queryRaw` tagged template, không nối chuỗi.
- **PR 7 - B6.** Mỗi lần xuất một giai đoạn: `stage.clone()` rồi đặt scale về `1`, vị trí `(0, 0)`,
  kích thước `1920×1071`, ẩn vòng chọn / hover, `toDataURL`, `destroy`. Chỉ một canvas phụ tồn tại
  mỗi lúc, giữ đúng lý do bộ nhớ của spec gốc. B14: khoá đổi giai đoạn (phím mũi tên, tab) khi
  `exporting`.

## 6. Quyết định đã chốt

1. **B5 - hộp xác nhận rời trang có ba lựa chọn:** *Lưu rồi rời*, *Bỏ thay đổi*, *Ở lại*. *Lưu rồi
   rời* chạy đúng đường lưu của editor; lưu thành công mới điều hướng, lưu hỏng thì ở lại trang, giữ
   draft và hiện toast lỗi như khi lưu bình thường. Hộp xác nhận xoá giai đoạn (B4) không có lựa chọn
   lưu, chỉ *Xoá* / *Huỷ*.
2. **B2 - fetch mới thất bại nhưng còn cache:** dùng bản cache và hiện cảnh báo rằng bản vẽ có thể
   chưa phải bản mới nhất. Không có cache thì hiện lỗi qua `QueryBoundary` như hiện tại.
3. **T5 - giữ PR 8.** Sẽ có kind phần tử mới (vùng tròn, vùng chữ nhật…), nên module hình học theo
   kind làm trước khi thêm kind đầu tiên.
