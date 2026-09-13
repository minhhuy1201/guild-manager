# Lịch sử điểm danh - bộ lọc đặt đúng chỗ tác động, biểu đồ đọc được số (HS1, HS2) - Implementation Plan

**Spec:** [`docs/custom-spec/2026-09-13-ux-review-overview.md`](../custom-spec/2026-09-13-ux-review-overview.md),
mục HS1, HS2.

**Goal:** Mỗi bộ lọc nằm ngay trên phần nó thực sự lọc, nên chọn một lưu phái mà biểu đồ không đổi
không còn trông như lỗi. Header của mỗi thẻ biểu đồ đọc được số mà không cần hover.

**Architecture:** Chỉ đổi `apps/web/features/attendance` và trang `app/lich-su-diem-danh`. Store
`attendance-filter-store` giữ nguyên hình dạng; chỉ đổi chỗ render.

- `AttendanceHistoryScope` (mới): Tuần và Ngày đánh, đặt trên cùng, áp dụng cho cả trang.
- `AttendanceHistoryFilters`: chỉ còn tìm kiếm, lưu phái, trạng thái và "Xoá bộ lọc" trên **cùng một
  hàng** (HS2), nằm trong `CardHeader` của `AttendanceLogTable`. Nút "Xoá bộ lọc" giữ nguyên hành vi
  (`resetHistoryFilters` xoá cả năm thứ) - hàm có sẵn giữ nguyên hoạt động.
- `AttendanceSummaryDashboard` đếm trên **toàn bang** (`useCharacters`), chỉ theo tuần và ngày đánh.
- `AttendanceSummaryCard`: header ghi "Có X · Không Y · Chưa Z" (tổng các lưu phái) thay cho
  "đã điểm danh a/b".

## Quyết định khi làm (spec để ngỏ)

- **Tìm kiếm không còn lọc biểu đồ.** Đọc code thì biểu đồ đang nhận `useFilteredCharacters`, tức là
  theo cả từ khoá **và** lọc lưu phái (chọn một lưu phái thì các lưu phái khác về 0), trái với
  comment "không theo lọc lưu phái". Biểu đồ trả lời "cả bang đi bao nhiêu, chia theo lưu phái"; tìm
  một cái tên không có nghĩa gì với câu hỏi đó. Nên cả ba bộ lọc về người (tìm kiếm, lưu phái, trạng
  thái) chuyển xuống bảng, còn trên cùng chỉ giữ hai bộ lọc chọn dữ liệu (tuần, ngày đánh).

## Global Constraints

- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt.
- **TDD**: test đỏ trước, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/history-filter-scope`, tách từ nhánh của PR thanh tab (chuỗi PR).
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck`.

---

### Task 1: Tách bộ lọc (HS1, HS2)

**Files:** `attendance-history-filters.tsx`, `attendance-history-scope.tsx` (mới),
`attendance-log-table.tsx`, `app/lich-su-diem-danh/page.tsx`, `index.ts` + test

- [x] Test đỏ: thanh trên cùng chỉ có Tuần và Ngày đánh; thanh của bảng có tìm kiếm, lưu phái, trạng
      thái và Xoá bộ lọc, không có Tuần/Ngày đánh; bảng lịch sử chứa thanh lọc trong header. Các test
      cũ của nút Xoá bộ lọc và nút X từng ô chuyển theo component chứa ô đó.

### Task 2: Biểu đồ theo toàn bang, header có số (HS1, HS2)

**Files:** `attendance-summary-dashboard.tsx`, `attendance-summary-card.tsx` + test

- [x] Test đỏ: có từ khoá hay lưu phái đang lọc thì biểu đồ vẫn tính cả bang.
- [x] Test đỏ: header thẻ ghi "Có X · Không Y · Chưa Z".

### Task 3: Tài liệu và kiểm tra

- [x] `apps/web/docs/frontend.md` §5/§6: biểu đồ chỉ theo tuần và ngày đánh; thanh lọc của bảng.
- [x] `pnpm --filter web test`, `lint`, `typecheck`.
- [x] Mở `/lich-su-diem-danh` ở 1440px và 390px.
