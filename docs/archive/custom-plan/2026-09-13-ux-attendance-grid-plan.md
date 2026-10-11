# Bảng điểm danh - 50 dòng, hàng tổng, lọc "Chưa điểm danh", sửa nhiều ô một lần (AT3, AT4) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục AT3, AT4.

**Goal:** Admin thấy cả bang trên một trang, biết mỗi trận bao nhiêu người đi mà không cần sang trang
Lịch sử, lọc ra người chưa điểm danh, và điểm danh hộ nhiều người bằng cách bấm thẳng vào ô rồi Lưu
một lần.

**Architecture:** Chỉ đổi `apps/web/features/attendance`. Không đổi API: vẫn là endpoint `POST` ghi
từng ô, gọi song song như `handleConfirm` cũ.

- **AT3** - `AttendanceGrid` truyền `initialPageSize: 50`. Hàng tổng nằm ngay dưới tiêu đề cột (hàng
  thứ hai của `thead`, ô `td` để số `th` không đổi), mỗi ngày "Có / Không / Chưa" tính trên **toàn
  bang** (`useCharacters`, không qua bộ lọc) bằng hàm thuần `countDayTotals`
  (`lib/day-totals.ts`). Chip "Chưa điểm danh" nằm trong `AttendanceFilters`, giá trị lưu ở
  `unansweredOnly` của `attendance-filter-store` (chỉ màn Điểm danh dùng, như `presence` chỉ màn
  Lịch sử dùng); lọc bằng `countUnanswered(...) > 0` của PR trước.
- **AT4** - bỏ chế độ "sửa một hàng", bỏ cột thao tác sticky bên phải. Admin bấm thẳng vào ô: chưa
  điểm danh → Có → Không → Có (**không quay về "chưa điểm danh"**, chủ bang đã chốt: API không có
  endpoint xoá). Bản nháp nằm ở mức cả bảng (`GridDraft`, khoá theo `recordKey`), logic xoay vòng là
  hàm thuần `clickCell` (`lib/grid-draft.ts`): ô quay về đúng giá trị server thì tự rời khỏi nháp.
  Ô đã đổi có viền `primary`. `UnsavedChangesBar` (từ PR Xếp team): "N ô đã đổi · Huỷ · Lưu".
- **Lưu lỗi một phần** (đã chốt): `Promise.allSettled`, ô lưu được rời khỏi nháp, ô lỗi ở lại, câu
  lỗi hiện trên thanh. **Rời trang khi còn nháp** (đã chốt): cảnh báo `beforeunload` như Xếp team.
- Member vẫn đọc bảng, không bấm được ô nào.

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt.
- **TDD**: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/attendance-grid-bulk-editing`, tách từ nhánh của PR thẻ tuần (chuỗi PR).
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: Hàm thuần

**Files:** `lib/grid-draft.ts`, `lib/day-totals.ts` + test

- [x] Test đỏ `clickCell`: ô chưa trả lời bấm lần đầu thành Có; Có thành Không; Không thành Có; về
      đúng giá trị server thì rời nháp; không sửa nháp gốc.
- [x] Test đỏ `countDayTotals`: đếm Có, Không, Chưa theo từng ngày; người không có bản ghi là Chưa.

### Task 2: Hàng và bảng (AT3, AT4)

**Files:** `attendance-row.tsx`, `attendance-grid.tsx`, `lib/sticky-columns.ts` + test

- [x] Test đỏ hàng: admin bấm ô gọi `onCellClick`; ô đã đổi hiện câu trả lời mới và đánh dấu; member
      không có nút; không còn ô thao tác.
- [x] Test đỏ bảng: 50 dòng mỗi trang; hàng tổng tính toàn bang; lọc "Chưa điểm danh"; bấm ô xoay vòng;
      thanh "N ô đã đổi", Huỷ, Lưu gửi song song; lỗi một phần giữ ô lỗi; `beforeunload` khi còn nháp;
      không còn cột "Điểm danh".

### Task 3: Chip lọc (AT3)

**Files:** `store/attendance-filter-store.ts`, `attendance-filters.tsx` + test

- [x] Test đỏ: bấm chip bật/tắt `unansweredOnly`, `aria-pressed` theo giá trị.

### Task 4: Tài liệu và kiểm tra

- [x] `apps/web/docs/frontend.md` §6: `AttendanceToggle` và cột thao tác không còn; ô bảng là nút xoay
      vòng; lỗi của bảng nằm trên thanh Lưu.
- [x] `pnpm --filter web test`, `lint`, `typecheck`.
- [x] Mở `/` thật ở 1440px và 390px bằng tài khoản admin.
