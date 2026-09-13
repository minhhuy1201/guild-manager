# Điểm danh - gộp lịch tuần vào thẻ cá nhân, ô lý do không mất chữ (AT1, AT2) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục AT1, AT2.

**Goal:** Trang `/` chỉ còn một lưới ô ngày, và việc chính (bấm Có/Không) đứng ngay dưới banner. Ô
lý do vắng không còn âm thầm bỏ chữ khi người dùng click ra ngoài.

**Architecture:** Chỉ đổi `apps/web/features/attendance`. Không đổi API, store hay quy tắc hạn chót.

- `WeekTimeline` bị xoá; `MemberAttendanceCard` thành thẻ "Tuần này của bạn": header có tên nhân
  vật và khoảng tuần, dòng tóm tắt số trận còn thiếu, mỗi ô ngày có nhãn, phụ đề, hạn chót, badge
  "Còn hạn / Đã khoá", rồi nút trả lời hoặc lý do đã lưu. `useDeadlineRefresh` giờ chỉ gọi một lần.
- Số trận chưa điểm danh là hàm thuần `countUnanswered` (`lib/unanswered.ts`): trận chưa khoá (theo
  `isDeadlinePassed` của API) mà nhân vật chưa có câu trả lời.
- Tài khoản chưa gán nhân vật vẫn thấy lịch tuần: các ô ở chế độ chỉ đọc, tô `sessionTintClass` như
  timeline cũ, kèm câu "liên hệ quản trị viên" thay cho dòng tóm tắt.
- `AbsenceReasonInput` tách ra `absence-reason-input.tsx`. Khi chữ trong ô khác lý do đã lưu (so
  sau khi trim): hiện nút "Lưu" và chữ "chưa lưu". Enter vẫn lưu, Esc vẫn khôi phục, blur không làm gì.

## Quyết định khi làm

- Badge trạng thái viết "Đã khoá" (cùng cách viết với phần còn lại của app), không còn "Đã khóa".
- Ô đã khoá không còn dòng chữ "Đã khoá" riêng ở đáy ô: badge đã nói điều đó.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt.
- **TDD**: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/attendance-merged-week-card`, tách từ nhánh của PR Xếp team (chuỗi PR).
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: `countUnanswered`

**Files:** `features/attendance/lib/unanswered.ts` + test

- [x] Test đỏ: đếm trận còn hạn chưa trả lời; bỏ trận đã khoá; trả lời đủ là 0; chỉ tính đúng nhân vật.

### Task 2: Thẻ "Tuần này của bạn" (AT1)

**Files:** `member-attendance-card.tsx`, `attendance-screen.tsx`, xoá `week-timeline.tsx` + test

- [x] Test đỏ màn: thứ tự chỉ còn thẻ cá nhân, bộ lọc, lưới.
- [x] Test đỏ thẻ: tiêu đề và khoảng tuần; dòng tóm tắt khi còn thiếu và khi đủ; hạn chót và badge
      trên từng ô; tài khoản chưa gán nhân vật thấy lịch tuần chỉ đọc.

### Task 3: Ô lý do (AT2)

**Files:** `absence-reason-input.tsx` + test trong `member-attendance-card.test.tsx`

- [x] Test đỏ: gõ rồi blur thì chữ còn, có nút Lưu và chữ "chưa lưu"; bấm Lưu gửi request; lưu xong
      (lý do đã lưu đổi) thì cả hai biến mất; chưa đổi gì thì không có nút Lưu.

### Task 4: Tài liệu và kiểm tra

- [x] `apps/web/docs/frontend.md` §6: bỏ mọi chỗ nói "week timeline" và "thẻ lặp lưới của timeline".
- [x] `pnpm --filter web test`, `lint`, `typecheck`.
- [x] Mở `/` thật ở 1440px và 390px, tài khoản admin (không gán nhân vật) để xem lịch chỉ đọc.
