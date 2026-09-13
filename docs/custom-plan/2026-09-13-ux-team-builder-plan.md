# Xếp team - thanh Lưu dính đáy và các chỉnh sửa nhỏ (TB1-TB7) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục TB1-TB7.

**Goal:** Admin luôn thấy nút Lưu khi có thay đổi, và các chi tiết nhỏ của màn Xếp team (đếm lưu
phái, ghi chú, đổi tên đội, Gửi Discord, người đã báo nghỉ, banner) bớt vướng.

**Đổi so với spec ban đầu:** bố cục hai cột của TB1 (kho sticky bên phải) đã dựng, xem ở 1440px rồi
**bỏ** theo quyết định của chủ bang: cột kho làm lưới đội hình hẹp, tên nhân vật co lại khó đọc. Kho
giữ chỗ cũ dưới lưới. Cũng theo chủ bang, sau khi xem bản dựng: bỏ số "n/6" ở header đội (TB2), bỏ
ghi chú thu gọn (TB3, ghi chú giữ cột bên phải thành viên như cũ), tên đội căn giữa như cũ. Spec đã
cập nhật theo.

**Architecture:** Chỉ đổi `apps/web`. Không đổi API, schema, store shape hay quy tắc hạn chót.

- `FormationGrid` bỏ prop `fixedColumns`, thay bằng `layout: "screen" | "capture"`. Ảnh gửi Discord
  (`capture`) giữ nguyên như hôm nay: 5 cột cố định, banner cao. Màn hình (`screen`) dùng banner
  gọn (TB7). Một prop gom hai khác biệt vốn cùng một lý do - "đây là ảnh chụp".
- Thanh Lưu dính đáy là `components/shared/unsaved-changes-bar.tsx`, vì AT4 sẽ dùng lại. Nó là
  `sticky bottom-*` ở cuối cột nội dung, không phải `fixed`: không che nội dung cuối trang, và
  `sticky` không tạo containing block cho `DragOverlay` hay `FormationCaptureSheet` (cả hai
  `position: fixed`).
- Số "N thay đổi" là hàm thuần: `countDayChanges` (`lib/formation-diff.ts`) cho ngày đang mở,
  `countNameChanges` (`lib/team-name-diff.ts`) cho tên đội. Thêm/xoá trận 2 tính là một thay đổi.
- Ctrl+S / Cmd+S: hook `useSaveShortcut` trong `features/team-builder/hooks/`.

## Quyết định khi làm

- **Đếm theo lưu phái (TB2)** tính trên kho của trận (người đi, chưa xếp), **bỏ qua** cả hai bộ lọc:
  chip là để chọn lọc, nên nó phải cho biết mỗi lưu phái còn bao nhiêu người trước khi lọc. Chip là
  icon lưu phái kèm số, tên lưu phái ở tooltip, đúng §6 "Guild class → an icon with a tooltip".
- ~~**"4/6" ở header đội (TB2)**~~: đã dựng rồi bỏ theo quyết định của chủ bang.
- **Gỡ người đã báo nghỉ (TB6)** chỉ gỡ khỏi trận đang mở, vì dấu đỏ và banner đều tính trên trận
  đang mở. Người bị gỡ về kho (họ không đi nên không hiện trong kho, đúng như hiện tại).
- **Toolbar trên cùng** giữ Copy và Gửi Discord; "Đặt lại", "Lưu", chữ "Chưa lưu" và lỗi lưu chuyển
  xuống thanh dính đáy.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt, theo tiền lệ.
- **TDD**: mỗi hành vi mới bắt đầu bằng một test đỏ, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/team-builder-two-column-layout`, tách từ `main`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: Số thay đổi chưa lưu

**Files:** `lib/formation-diff.ts`, `lib/team-name-diff.ts`, `hooks/use-formation-draft.ts`,
`hooks/use-team-name-draft.ts` + test

- [x] Test đỏ `countDayChanges`: chưa có nháp = 0; đổi một ô = 1; đổi ghi chú = 1; thêm trận 2 = 1.
- [x] Test đỏ `countNameChanges`: tên giống nhau = 0; đổi một đội = 1; xoá tên một đội = 1.
- [x] Hai hook trả thêm `changeCount`.

### Task 2: `UnsavedChangesBar` + phím tắt

**Files:** `components/shared/unsaved-changes-bar.tsx`, `features/team-builder/hooks/use-save-shortcut.ts`
+ test

- [x] Test đỏ: không có thay đổi thì không render; có thì hiện câu, "Đặt lại", "Lưu"; đang lưu thì
      khoá hai nút và nút Lưu nói "Đang lưu..."; có lỗi thì hiện lỗi thay cho câu.
- [x] Test đỏ: Ctrl+S và Cmd+S gọi `onSave` và chặn mặc định của trình duyệt; tắt (`enabled`
      false) thì vẫn chặn hộp thoại nhưng không gọi `onSave`; phím S trơn không làm gì.

### Task 3: Thanh Lưu dính đáy, toolbar gọn (TB1, TB5)

**Files:** `team-builder-screen.tsx`, `formation-toolbar.tsx` + test toolbar

- [x] Test đỏ toolbar: không còn nút Lưu/Đặt lại; đang `dirty` thì "Gửi Discord" bị khoá.
- [x] ~~Từ `lg`: `MemberPool` sticky ở cột phải.~~ Đã dựng rồi bỏ (xem đầu plan). Kho giữ chỗ cũ.
- [x] Thanh dính đáy ở cuối màn, Ctrl+S nối vào `handleSave`. Toolbar xuống dòng trên điện thoại
      (nút Copy ghi tên ngày nguồn, rộng hơn màn hình 390px).

### Task 4: Kho đếm theo lưu phái, đội đếm người (TB2)

**Files:** `lib/pool.ts`, `hooks/use-formation-pool.ts`, `member-pool.tsx`, `team-column.tsx` + test

- [x] Test đỏ `countByGuildClass`: theo thứ tự `GUILD_CLASS_OPTIONS`, bỏ lưu phái 0 người.
- [x] Test đỏ `toggleGuildClass`: bật thêm, tắt bớt, không đổi mảng gốc.
- [x] Chip bấm được, đang lọc thì tô `primary`. ~~Header đội hiện "n/6".~~ Đã dựng rồi bỏ.

### Task 5: Banner gọn (TB7); ghi chú thu gọn (TB3) đã bỏ

**Files:** `formation-grid.tsx`, `formation-banner.tsx`, `formation-capture-sheet.tsx` + test

- [x] ~~Ghi chú thu gọn trong `SlotCell`.~~ Đã dựng rồi bỏ (xem đầu plan); `slot-cell.tsx`,
      `slot-note-input.tsx`, `team-column.tsx` trở về như trên `main`.
- [x] Test đỏ `FormationBanner`: cỡ `compact` không giữ `min-h-24`, cỡ `tall` thì giữ.
- [x] Test capture sheet: vẫn có cột ghi chú (textarea chỉ đọc) và banner cao như cũ.

### Task 6: Đổi tên đội dễ thấy (TB4)

**Files:** `team-name-field.tsx` + test

- [x] Test đỏ: có nút bút chì "Đổi tên đội n"; click đơn mở ô nhập. Double-click, Enter/Space giữ nguyên.

### Task 7: Banner người đã báo nghỉ (TB6)

**Files:** `lib/assignment.ts`, `hooks/use-formation-draft.ts`, `absent-banner.tsx` (mới) + test

- [x] Test đỏ `removeCharacters`: gỡ đúng các id, giữ ô khác, trả tham chiếu cũ khi không gỡ ai.
- [x] Test đỏ hook `removeFromActiveMatch`: gỡ khỏi trận đang mở, ngày thành dirty, trận kia giữ nguyên.
- [x] Banner "N người đã báo nghỉ còn trong đội hình · Gỡ ra", ẩn khi N = 0 hoặc ngày chỉ đọc.

### Task 8: Tài liệu và kiểm tra

- [x] `apps/web/docs/frontend.md` §5/§6: thanh Lưu dính đáy, ghi chú thu gọn, banner hai cỡ, câu về
      "Đặt lại" của `formation-toolbar`.
- [x] `pnpm --filter web test`, `lint`, `typecheck`.
- [x] Mở màn thật ở 1440px và 390px (Chromium headless trên stack Docker local) để xác nhận bố cục.

---

## Bổ sung 2026-09-14

### Thanh Lưu không dính trên stack Docker local

Chủ bang báo thanh Lưu nằm cuối trang (cả Xếp team lẫn lưới Điểm danh). Dựng lại trên màn thật:
`bottom` tính ra `auto` vì `--app-bottom-inset` rỗng. Turbopack trong container `web` vẫn phục vụ
`globals.css` bản trước #110 từ cache trong volume `guild-manager_web-next` (sống qua cả restart,
không nhận cả khi file được ghi lại). Bản build production có đủ biến. **Code không đổi**: xoá volume
cache là hết; `docs/development.md` §9 thêm dòng xử lý sự cố.

### Task 9: Ctrl+Z hoàn tác (spec TB1, mục bổ sung)

**Files:** `store/formation-store.ts`, `hooks/use-formation-draft.ts`, `hooks/use-undo-shortcut.ts`
(mới), `team-builder-screen.tsx` + test

- Store giữ `history` theo ngày: mỗi bước là nháp trước thao tác (`undefined` = chưa có nháp), trận
  đang mở, và `mergeKey`. `clearDraft` (Lưu, Đặt lại) và `setWeek` bỏ lịch sử.
- `editActiveDraft` là chỗ duy nhất ghi bước: mọi thao tác sửa nháp đi qua nó, thao tác không đổi gì
  thì không có bước. "Không đổi gì" so theo nội dung (`isDayDirty`), vì dọn sạch và copy luôn dựng
  mảng mới. Ghi chú dùng `mergeKey` theo trận + ô để gộp các phím gõ liền nhau.
- Phím tắt bỏ qua phím trong ô nhập (hoàn tác chữ của trình duyệt) và trong dialog (đội hình nằm khuất
  phía sau).
- [x] Test đỏ store: undo về bước trước; bước đầu bỏ nháp; mở lại trận vừa sửa; gộp theo `mergeKey`;
      lịch sử tách theo ngày; `clearDraft` và đổi tuần bỏ lịch sử.
- [x] Test đỏ hook: kéo thả rồi undo hết dirty; undo ngược thứ tự; gõ liền một ghi chú là một bước;
      thêm trận 2, dọn sạch undo được; thao tác không đổi gì, Đặt lại, Lưu, ngày khoá thì `canUndo` false.
- [x] Test đỏ phím tắt: Ctrl+Z, Cmd+Z, Caps Lock; không bắt khi đang gõ trong ô nhập, khi Ctrl+Shift+Z,
      khi không có gì để hoàn tác.
- [x] `apps/web/docs/frontend.md` §6 nhắc Ctrl+Z.
