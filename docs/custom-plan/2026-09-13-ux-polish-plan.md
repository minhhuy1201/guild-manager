# Các chỉnh sửa nhỏ độc lập (GL2, GL3, GL4, GL5, ST1, ST2) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục GL2, GL3, GL4, GL5, ST1, ST2.

**Goal:** Bớt chiều cao trang trí ở các trang dùng hằng ngày, cho biết còn bao lâu tới hạn chót, gắn
bộ lọc vào đúng bảng nó lọc, có trang 404 và trang lỗi riêng, và làm màn Thiết lập nhớ tab.

**Architecture:** Chỉ đổi `apps/web`. Không đổi API, store hay quy tắc hạn chót.

- **GL2** - `PageHeader` nhận `size: "tall" | "compact"` (bắt buộc, để mặc định không nằm rải rác).
  `tall` giữ như hiện tại cho trang Điểm danh; `compact` (khoảng 120px, mobile khoảng 96px) cho Xếp
  team, Thiết lập, Lịch sử. Vẫn một cảnh mỗi trang; `design-direction.md` ghi thêm hai cỡ này.
- **GL3** - `SessionDeadline` thêm dòng "còn N ngày / giờ / phút" cho trận chưa khoá, qua component
  con `DeadlineCountdown` (client) có đồng hồ riêng cập nhật mỗi phút, nên chỉ dòng chữ đó render
  lại. Chữ tính bằng hàm thuần `timeLeft` (`lib/time-left.ts`). Còn dưới 24 giờ thì chữ đậm màu
  `primary` (navy: màu làm việc của app; amber là "chưa trả lời", đỏ là "Không"). Trạng thái khoá
  vẫn là `isDeadlinePassed` của API: đồng hồ client đã qua hạn mà API chưa khoá thì chữ ghi "sắp
  khoá", badge vẫn "Còn hạn".
- **GL4** - `AttendanceFilters` thôi tự bọc `Card`; `AttendanceGrid` đặt nó trong `CardHeader` của
  chính card bảng.
- **GL5** - `app/not-found.tsx` và `app/error.tsx` (client, nút "Thử lại" gọi `reset()`): con dấu,
  câu ngắn tiếng Việt, nút về trang Điểm danh.
- **ST1** - tab của Thiết lập nằm trên URL: `?tab=members` mở tab thành viên, không có hoặc giá trị lạ
  thì mở tab lịch đánh; đổi tab dùng `router.replace` (không thêm một bước Back cho mỗi lần bấm tab).
- **ST2** - bỏ `h2` lặp tên tab trong hai tab, giữ dòng mô tả.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt.
- **TDD**: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/ux-polish-batch`, tách từ nhánh của PR Lịch sử (chuỗi PR).
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: GL2

- [x] Test đỏ `PageHeader`: `compact` thấp hơn `tall`, vẫn có tiêu đề và mô tả.
- [x] Bốn trang truyền `size`; `design-direction.md` mục Imagery.

### Task 2: GL3

- [x] Test đỏ `timeLeft`: ngày, giờ, phút, "sắp khoá" khi đồng hồ client đã qua hạn; `urgent` dưới 24 giờ.
- [x] Test đỏ `SessionDeadline`: trận chưa khoá có dòng "còn …", trận đã khoá thì không.

### Task 3: GL4

- [x] Test đỏ: thanh lọc nằm trong card của bảng; màn Điểm danh chỉ còn thẻ tuần và card bảng.

### Task 4: GL5

- [x] Test đỏ: trang 404 có câu và link về Điểm danh; trang lỗi có "Thử lại" gọi `reset`.

### Task 5: ST1, ST2

- [x] Test đỏ: `?tab=members` mở tab thành viên; bấm tab thì `router.replace` sang `?tab=…`; giá trị
      lạ mở tab lịch đánh; không còn `h2` trùng tên tab.

### Task 6: Tài liệu và kiểm tra

- [x] `apps/web/docs/frontend.md` §6: `PageHeader` hai cỡ, `SessionDeadline` có đếm ngược, thanh lọc
      trong card bảng, trang 404/lỗi.
- [x] `pnpm --filter web test`, `lint`, `typecheck`.
- [x] Mở `/`, `/thiet-lap?tab=members`, một đường dẫn không tồn tại, ở 1440px và 390px.
