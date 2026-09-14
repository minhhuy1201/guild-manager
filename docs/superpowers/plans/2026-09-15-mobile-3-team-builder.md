# Mobile 3/3 - Xếp team: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Trên điện thoại (dưới `md`), admin đọc rõ đội hình và sửa nhẹ được: mỗi lúc một team, vuốt
là cuộn, nhấn giữ mới kéo, có nút Hoàn tác.

**Architecture:** Chỉ đổi `apps/web`. Team đang xem nằm trong một store Zustand mới, tách khỏi
`formation-store` (bản nháp và lịch sử hoàn tác). `FormationGrid` ẩn các team khác bằng CSS ở layout
`screen`; layout `capture` không đổi. Tách từ nhánh của PR 1.

**Tech Stack:** Next.js 16, Tailwind 4, dnd-kit core 6, Zustand 5, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-15-mobile-optimization-design.md`](../specs/2026-09-15-mobile-optimization-design.md)
§4.3, §6, §8.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt. Không dùng em dash.
- TDD cho mọi thay đổi hành vi. Cảm biến kéo thả chỉ kiểm được bằng tay trên máy thật.
- Đội hình: `TEAM_COUNT = 10`, `SLOTS_PER_TEAM = 6` (`lib/mock-formation.ts`); không viết số cứng.
- Nhánh `feat/web-mobile-team-builder`, tách từ `feat/web-mobile-foundation`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: `team-view-store`

**Files:** tạo `apps/web/features/team-builder/store/team-view-store.ts`, test
`store/__tests__/team-view-store.test.ts`

**Interfaces:** `useTeamViewStore` với `{ selectedTeam: number; selectTeam: (team: number) => void }`,
mặc định `1`.

- [x] Test đỏ: `"mặc định xem team 1"`, `"chọn team 3 thì selectedTeam là 3"`,
      `"đổi team không đụng tới bản nháp và lịch sử hoàn tác"` (state của `useFormationStore` giữ nguyên).
- [x] Xác nhận đỏ, viết store theo mẫu `pool-filter-store.ts`, xanh. Commit cùng Task 2.

### Task 2: `TeamSwitcher`

**Files:** tạo `apps/web/features/team-builder/components/team-switcher.tsx`, test
`components/__tests__/team-switcher.test.tsx`

**Interfaces:** `TeamSwitcher({ teams, slotsPerTeam, selectedTeam, onSelect })`,
`teams: { team: number; label: string; filled: number }[]`.

- [x] Test đỏ: `"hiện đủ 10 chip, mỗi chip có tên và số ô đã xếp trên 6"`,
      `"chip đang chọn mang aria-pressed=true, các chip khác false"`, `"bấm chip thì gọi onSelect với số
      team"`.
- [x] Xác nhận đỏ. Component: `grid grid-cols-5 gap-1.5 md:hidden`; mỗi chip là `<button type="button"
      aria-pressed>` hai dòng (`truncate` tên, `tabular-nums` `filled/slotsPerTeam`), `min-h-11`, chọn
      thì `bg-primary text-primary-foreground`, không chọn thì `border bg-card
      hover:bg-foreground/5` (frontend.md §6).
- [x] Xanh. Commit `feat(web): pick one team at a time in the team builder on a phone`.

### Task 3: `FormationGrid` chỉ hiện team đang chọn dưới `md`

**Files:** `formation-grid.tsx`, `team-column.tsx`, test mới `components/__tests__/formation-grid.test.tsx`

- [x] Test đỏ (mock `useDroppable`/`useDraggable` như test hiện có của team builder, hoặc bọc
      `DndContext`): layout `screen`, `selectedTeam = 2` thì card của team 1 mang `max-md:hidden`, team 2
      không; có 10 chip. Layout `capture` thì không card nào mang `max-md:hidden` và không có chip.
- [x] Xác nhận đỏ.
- [x] `TeamColumn` nhận `className` và nối vào `Card`. `FormationGrid` đọc `useTeamViewStore`, tính
      `filled` từng team từ `occupants`, tên theo cùng quy tắc `TeamNameField` (tên hoặc số team); ở
      layout `screen` chèn `TeamSwitcher` sau banner (chiếm full hàng lưới: `col-span-full`) và gắn
      `max-md:hidden` cho team không chọn.
- [x] Xanh. Commit `feat(web): show only the picked team below md`.

### Task 4: Thẻ thành viên không phụ thuộc hover

**Files:** `member-card.tsx`, test mới `components/__tests__/member-card.test.tsx`

- [x] Test đỏ: `"có cảnh báo thì cảnh báo hiện bằng chữ trên thẻ"` (tìm được "Đã báo nghỉ trận này"
      ngoài tooltip, tooltip đóng); `"tên xuống tối đa hai dòng thay vì bị cắt một dòng"` (span tên mang
      `line-clamp-2`, không `truncate`).
- [x] Xác nhận đỏ. Cảnh báo thành dòng `text-xs text-destructive` với icon `TriangleAlert` dưới tên
      (thay vị trí `note` khi có cảnh báo, `note` vẫn hiện nếu không có). Tooltip giữ tên đầy đủ.
- [x] Xanh. Commit `feat(web): show a dropped-out warning on the card itself`.

### Task 5: Kéo thả trên cảm ứng

**Files:** `team-builder-screen.tsx`, `draggable-member.tsx`

- [x] `useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }))`, comment nói lý
      do (vuốt là cuộn, nhấn giữ mới kéo).
- [x] `DraggableMember`: bỏ `touch-none`, thêm `select-none [-webkit-touch-callout:none]`.
- [x] Test hiện có xanh. Commit `feat(web): let a phone scroll the team builder and drag on long press`.

### Task 6: Ghi chú gọn dưới `sm`

**Files:** `slot-cell.tsx`, test mới `components/__tests__/slot-cell.test.tsx`

- [x] Test đỏ: `"có nút ghi chú, bấm thì mở ô nhập và aria-expanded=true"`,
      `"ô đã có ghi chú thì nút có chấm và ghi chú hiện thành chữ dưới hàng"`,
      `"chỉ có một ô nhập ghi chú trong DOM"`.
- [x] Xác nhận đỏ.
- [x] `SlotCell` thành lưới `grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`:
      ô thả ở cột 1; nút `size="icon"` `variant="ghost"` `sm:hidden` (icon `StickyNote`, chấm `bg-jade`
      khi có ghi chú, `aria-expanded`, `aria-label="Ghi chú cho ô này"`), ẩn khi `readOnly`; wrapper ô
      nhập `col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1`, thêm `max-sm:hidden` khi đang đóng;
      dòng xem trước `col-span-2 sm:hidden text-xs text-muted-foreground` khi đóng mà có ghi chú.
      Trạng thái mở là state cục bộ (`useState`), không vào store. Bấm nút lần nữa thì đóng (không
      đóng khi bấm ra ngoài, spec §4.3). Ô thả `h-11` thành `min-h-11` để chứa tên hai dòng và cảnh báo.
- [x] Xanh. Commit `feat(web): fold the slot note behind a button on a phone`.

### Task 7: Thanh công cụ

**Files:** `formation-toolbar.tsx`, `team-builder-screen.tsx`, test `formation-toolbar.test.tsx`

- [x] Test đỏ: `"còn thay đổi chưa lưu thì dòng 'Lưu trước khi gửi' hiện bằng chữ"`;
      `"nút copy có tên truy cập đầy đủ, chữ ngắn cho điện thoại"`.
- [x] Xác nhận đỏ.
- [x] Toolbar: `flex flex-wrap items-center justify-end gap-2`, dưới `sm` hai nút `max-sm:flex-1`; nút
      copy `aria-label` là nhãn đầy đủ, chữ `sm:hidden` "Copy đội hình" và `max-sm:hidden` nhãn đầy đủ;
      bỏ tooltip, thêm `<p className="w-full text-right text-xs text-muted-foreground">Lưu trước khi
      gửi</p>` khi `dirty`. Screen: bỏ wrapper `mt-4` thừa quanh toolbar.
- [x] Xanh. Commit `feat(web): fit the team builder toolbar on a phone`.

### Task 8: Nút Hoàn tác, nút tên team

**Files:** `apps/web/components/shared/unsaved-changes-bar.tsx`, test
`components/shared/__tests__/unsaved-changes-bar.test.tsx`, `team-builder-screen.tsx`,
`team-name-field.tsx`

**Interfaces:** `UnsavedChangesBar` thêm `undo?: { onUndo: () => void; canUndo: boolean }`.

- [x] Test đỏ: `"có undo thì có nút Hoàn tác, bấm gọi onUndo một lần"`, `"canUndo=false thì nút bị
      khoá"`, `"không truyền undo thì không có nút"`.
- [x] `team-name-field.tsx`: nút tên team thêm `max-sm:min-h-11` (đo ở PR 1: 32px).
- [x] Xác nhận đỏ. Nút `variant="outline" size="sm"` icon `Undo2` giữa "Đặt lại" và "Lưu", khoá cả khi
      `saving`. Screen truyền `undo={{ onUndo: screen.draft.undo, canUndo: screen.draft.canUndo &&
      !saving }}`.
- [x] Xanh. Commit `feat(web): add an undo button to the team builder's save bar`.

### Task 9: Tài liệu, nghiệm thu, PR

- [x] `frontend.md` §6: "Unsaved work" (nút Hoàn tác), mục Xếp team trên điện thoại (một team, store
      riêng, ẩn bằng CSS, capture không đổi, cảm biến).
- [ ] Render 420x930 và 360x800: ô đầu tiên của team hiện trong màn đầu; chọn team 3 bằng chip;
      `scrollWidth === innerWidth`. Mở dialog Gửi Discord ở 1440: ảnh 10 team như cũ.
- [ ] Push, mở PR 3 (base `feat/web-mobile-foundation`), có `/pr-review`. Ghi trong PR: kéo thả trên
      Android Chrome thật chưa kiểm được ở đây, cần người dùng thử.
