# Mobile 2/3 - Các trang: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Điểm danh, Lịch sử, Thiết lập dùng tốt bằng tay ở 360-430px: không thông tin nào chỉ nằm sau
hover, vùng chạm từ 44px.

**Architecture:** Chỉ đổi `apps/web`. Một component mới trong feature attendance cho lý do nghỉ bị cắt;
còn lại là sửa class và bỏ tooltip. Tách từ nhánh của PR 1 (cần cỡ chữ 110%).

**Tech Stack:** Next.js 16, Tailwind 4, Base UI Popover, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-15-mobile-optimization-design.md`](../specs/2026-09-15-mobile-optimization-design.md)
§4.2, §8.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt. Không dùng em dash.
- TDD cho mọi thay đổi hành vi. Thay đổi chỉ là bố cục thì nghiệm thu bằng render (Task 4).
- Nhánh `feat/web-mobile-pages`, tách từ `feat/web-mobile-foundation`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: Lý do nghỉ đọc được bằng chạm

**Files:** tạo `apps/web/features/attendance/components/absence-reason-text.tsx`; sửa
`attendance-row.tsx`, `attendance-log-table.tsx`; test mới
`apps/web/features/attendance/__tests__/absence-reason-text.test.tsx`, cập nhật
`attendance-row.test.tsx`, `attendance-log-table.test.tsx` nếu chúng kiểm `title`.

**Interfaces:** `AbsenceReasonText({ reason }: { reason: string; className?: string })`.

- [ ] Test đỏ: `"bấm vào lý do thì thấy lý do đầy đủ"` (bấm nút mang tên lý do, `Popover` mở, có đoạn
      chữ đầy đủ); `"không dùng title làm chỗ chứa lý do"`.
- [ ] Xác nhận đỏ (module chưa có).
- [ ] Component: `PopoverTrigger` render một `<button type="button">` chữ `text-xs text-left
      text-muted-foreground line-clamp-2`, `PopoverContent` chứa lý do đầy đủ (`max-w-72 text-sm
      break-words`).
- [ ] `attendance-row.tsx`: thay `<span className="block max-w-32 truncate" title>` bằng
      `<AbsenceReasonText reason={record.reason} className="max-w-32" />`. Ô bấm `size-9` thành
      `size-10`.
- [ ] `attendance-log-table.tsx`: thay `span.block.truncate[title]` bằng `AbsenceReasonText`, giữ
      `max-w-56`; khi không có lý do vẫn là "—". Sửa comment về tooltip.
- [ ] Xanh. Commit `feat(web): open a cut-off absence reason on tap`.

### Task 2: Ô lý do nghỉ của thành viên

**Files:** `apps/web/features/attendance/components/absence-reason-input.tsx`, test trong
`member-attendance-card.test.tsx` (hoặc test mới `absence-reason-input.test.tsx`)

- [ ] Test đỏ: `"đang có chữ chưa lưu thì dòng dưới ô nói cách lưu"`: gõ vào ô, thấy chữ
      "Chưa lưu. Bấm Enter hoặc Lưu để lưu, Esc để huỷ."; `"không có tooltip hay title"`: ô không có
      thuộc tính `title`.
- [ ] Xác nhận đỏ.
- [ ] Bỏ `Tooltip` và `title`; `Input` bỏ `h-8 text-sm` (dùng `h-11` mặc định); nút "Lưu" bỏ
      `size="xs"`; dòng "chưa lưu" thành câu trên. JSDoc cập nhật.
- [ ] Xanh. Commit `feat(web): make the absence reason field touch sized and say how to save`.

### Task 3: Cột tên và Thiết lập

**Files:** `apps/web/features/attendance/components/character-name.tsx`,
`apps/web/components/shared/roster-filter-bar.tsx`,
`apps/web/features/settings/components/date-time-field.tsx`

Chỉ bố cục; nghiệm thu ở Task 4.

- [ ] `CharacterName`: `max-w-36` thành `max-w-28`, giữ `sm:max-w-none`.
- [ ] `RosterFilterBar` inline: `w-64` thành `w-full sm:w-64`, `w-60` thành `w-full sm:w-60`.
- [ ] `DateTimeField`: hàng `flex gap-2` thành `flex flex-col gap-2 sm:flex-row`; ô giờ full width dưới
      `sm` (wrapper `relative sm:w-auto`, input giữ `TIME_INPUT_CLASS` từ `sm`).
- [ ] Test, lint, typecheck xanh. Commit `fix(web): stop the members filters and the date field
      overflowing a phone`.

### Task 4: Nghiệm thu, PR

- [ ] Render ở 360/390/420/915x412: `scrollWidth === innerWidth` trên `/`, `/lich-su-diem-danh`,
      `/thiet-lap` (cả `?tab=members`); mở dialog tạo trận ở 360, ô ngày không bị cắt; với tài khoản
      đã gán nhân vật, trả lời Có/Không và lưu lý do ở 360 và 420.
- [ ] Push, mở PR 2 (base `feat/web-mobile-foundation`), có `/pr-review`.
