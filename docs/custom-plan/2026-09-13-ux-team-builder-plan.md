# Xếp team - thanh Lưu dính đáy và các chỉnh sửa nhỏ (TB1-TB7) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục TB1-TB7.

**Goal:** Admin luôn thấy nút Lưu khi có thay đổi, và các chi tiết nhỏ của màn Xếp team (đếm lưu
phái, ghi chú, đổi tên đội, Gửi Discord, người đã báo nghỉ, banner) bớt vướng.

**Đổi so với spec ban đầu:** bố cục hai cột của TB1 (kho sticky bên phải) đã dựng, xem ở 1440px rồi
**bỏ** theo quyết định của chủ bang: cột kho làm lưới đội hình hẹp, tên nhân vật co lại khó đọc. Kho
giữ chỗ cũ dưới lưới; spec đã cập nhật theo.

**Architecture:** Chỉ đổi `apps/web`. Không đổi API, schema, store shape hay quy tắc hạn chót.

- `FormationGrid` bỏ prop `fixedColumns`, thay bằng `layout: "screen" | "capture"`. Ảnh gửi Discord
  (`capture`) giữ nguyên như hôm nay: 5 cột cố định, banner cao, cột ghi chú `w-2/5`. Màn hình
  (`screen`) dùng banner gọn (TB7) và ghi chú thu gọn (TB3). Một prop gom ba khác biệt vốn cùng
  một lý do - "đây là ảnh chụp".
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
- **"4/6" ở header đội (TB2)** hiện cả trong ảnh Discord: số người mỗi đội cũng là thông tin cho
  người xem ảnh.
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
- [x] Chip bấm được, đang lọc thì tô `primary`. Header đội hiện "n/6".

### Task 5: Ghi chú thu gọn, banner gọn (TB3, TB7)

**Files:** `formation-grid.tsx`, `team-column.tsx`, `slot-cell.tsx`, `slot-note-input.tsx`,
`formation-banner.tsx`, `formation-capture-sheet.tsx` + test

Trạng thái "đang sửa ghi chú" nằm trong `SlotCell` chứ không tách component riêng: nút thêm ghi
chú đứng cạnh ô, còn chữ ghi chú nằm dưới ô, nên chỉ `SlotCell` đặt được cả hai.

- [x] Test đỏ `SlotCell` (layout `screen`): ô trống chỉ có nút "Thêm ghi chú"; bấm thì mở ô nhập;
      blur hoặc Esc thì đóng; ô có ghi chú hiện chữ, bấm để sửa; chỉ đọc và trống thì không render gì.
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
