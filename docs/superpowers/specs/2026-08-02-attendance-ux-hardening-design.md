# Attendance UX hardening — Design

Ngày: 2026-08-02 · Phạm vi: `apps/web` (không đụng `apps/api`, không đụng schema/DB).

## Bối cảnh

Luồng điểm danh đã chạy end-to-end: `AttendanceGrid` gọi `useMarkAttendance().mutateAsync`
→ `POST /attendance` → `AttendanceService.mark()` upsert `AttendanceRecord` → mutation
`invalidateQueries(attendanceKeys.records())` → `AttendanceLogTable` đọc lại query đó.

Phạm vi dữ liệu **giữ nguyên ở tuần đang mở**: `GET /attendance/records` chỉ trả record của
các session thuộc tuần hiện tại. Xem nhiều tuần và nhật ký từng lượt thay đổi là **ngoài phạm vi**
của spec này.

Spec này xử lý 4 khoảng trống UX còn lại của luồng đó.

## Hạng mục 1 — Trạng thái loading

**Vấn đề gốc:** `AttendanceGrid`, `AttendanceLogTable` đều dùng `data ?? []` khi query chưa xong,
nên "đang tải" và "rỗng thật" render giống hệt nhau — người dùng thấy "Chưa có ai điểm danh."
rồi dữ liệu mới nhảy ra. `WeekTimeline` thì `return null` khi chưa có week, gây nhảy layout.

**Thiết kế:**

- Thêm `components/ui/skeleton.tsx` sinh từ shadcn CLI (biến thể `base-nova`, theo
  `apps/web/CLAUDE.md`). Hiện `components/ui/` chưa có component này.
- Thêm `components/shared/table-skeleton.tsx`: nhận `rows: number`, `columns: number`, render
  `rows` × `<TableRow>` mỗi hàng `columns` ô `<Skeleton>`. Dùng chung cho hai bảng.
- `WeekTimeline`: thay `return null` bằng khung skeleton giữ đúng chiều cao Card thật.

## Hạng mục 2 — Xử lý lỗi

**Vấn đề gốc:** không component nào đọc `isError`. API chết thì bảng im lặng hiện rỗng, người dùng
không phân biệt được "chưa ai điểm danh" với "mất kết nối", và không có đường thử lại.

**Quyết định: error state cục bộ theo từng Card, kèm nút "Thử lại".**
Không dùng `error.tsx` của Next.js, không dùng `throwOnError` của TanStack Query.

Lý do: mỗi Card lấy data từ endpoint riêng; ném lên error boundary cấp trang sẽ xoá trắng cả màn
hình kể cả phần vẫn hoạt động. Error boundary cũng không có đường "thử lại" tự nhiên, trong khi
`refetch()` thì có. `ApiError` (`lib/api-client.ts`) đã mang sẵn message tiếng Việt của backend nên
hiển thị thẳng lên UI được.

**Thiết kế:**

- Thêm `components/shared/error-state.tsx`: props `message: string`, `onRetry: () => void`.
  Render trong `CardContent`, có icon cảnh báo + nút "Thử lại".
- Thêm `features/attendance/hooks/use-attendance-board.ts` export `useAttendanceBoard()`, gộp
  trạng thái của 3 query (characters, sessions, records) thành
  `{ isPending, isError, errorMessage, refetch }`. Cần gộp vì **cả hai màn** đều phụ thuộc đúng 3
  query đó — không gộp thì logic bị lặp ở 2 chỗ.
  `errorMessage` lấy từ error đầu tiên gặp; nếu không phải `ApiError` thì dùng message mặc định.
- Thứ tự nhánh trong mỗi component (early return, theo Rule 42):
  1. `isError` → `<ErrorState message={errorMessage} onRetry={refetch} />`
  2. `isPending` → `<TableSkeleton />`
  3. còn lại → bảng thật

## Hạng mục 3 — Bộ lọc cho màn Lịch sử

**Vấn đề gốc:** `AttendanceFilters` (tìm kiếm + lưu phái) chỉ dùng ở màn Điểm danh. Màn Lịch sử
không lọc được, dù store `attendance-filter-store` và hook `useFilteredCharacters` đã có sẵn.

**Thiết kế:**

- `app/lich-su-diem-danh/page.tsx` compose thêm `<AttendanceFilters />` phía trên
  `<AttendanceLogTable />`. Export `AttendanceFilters` qua `features/attendance/index.ts`.
- `AttendanceLogTable` dùng `useFilteredCharacters()` để dựng `Set<characterId>`, lọc rows theo đó.
  Giữ nguyên sắp xếp mới-nhất-trước hiện có.
- Empty state phân biệt hai trường hợp:
  - chưa có record nào → "Chưa có ai điểm danh."
  - có record nhưng lọc không ra → "Không có lượt điểm danh phù hợp."

**Hành vi đã chốt:** `useAttendanceFilterStore` là store global singleton nên bộ lọc **dính khi
chuyển giữa hai màn**. Đây là hành vi mong muốn (lọc một người rồi xem lịch sử người đó), không
reset store khi unmount.

## Hạng mục 4 — Tự khoá cột khi qua deadline

**Vấn đề gốc:** `isDeadlinePassed()` tính tại thời điểm render từ data đã cache. Không có gì kích
hoạt render lại khi đồng hồ chạy qua mốc deadline, nên tab mở lâu vẫn hiển thị cột "còn hạn" dù
server đã khoá — người dùng bấm điểm danh và ăn lỗi 409 "Đã quá hạn điểm danh ngày này."

**Thiết kế:**

- Thêm `features/attendance/hooks/use-deadline-refresh.ts` export `useDeadlineRefresh(sessions)`:
  - Tìm deadline **gần nhất còn ở tương lai** trong danh sách session.
  - Đặt `setTimeout` tới đúng mốc đó; khi nổ thì `invalidateQueries` cho
    `attendanceKeys.sessions()` và `attendanceKeys.records()`, rồi hẹn tiếp mốc kế.
  - Không còn deadline tương lai → không đặt timer.
  - Dọn timer trong cleanup của `useEffect`.
- Gọi hook trong `AttendanceGrid` và `WeekTimeline`.

**Chọn timer thay vì `refetchInterval`** để không poll mạng vô ích: tab mở cả ngày chỉ bắn đúng số
lần bằng số deadline trong tuần, thay vì một request mỗi phút.

## Ngoài phạm vi

- Không viết test mới (theo quy ước: chỉ tạo test khi được yêu cầu).
- Không đụng `apps/api`, `packages/shared`, `schema.prisma`.
- Không mở rộng dữ liệu ra nhiều tuần, không thêm audit log từng lượt điểm danh.
- Không thêm phân trang cho màn Lịch sử.

## File thay đổi

Thêm mới:

- `apps/web/components/ui/skeleton.tsx` (shadcn CLI)
- `apps/web/components/shared/table-skeleton.tsx`
- `apps/web/components/shared/error-state.tsx`
- `apps/web/features/attendance/hooks/use-attendance-board.ts`
- `apps/web/features/attendance/hooks/use-deadline-refresh.ts`

Sửa:

- `apps/web/features/attendance/components/attendance-grid.tsx`
- `apps/web/features/attendance/components/attendance-log-table.tsx`
- `apps/web/features/attendance/components/week-timeline.tsx`
- `apps/web/features/attendance/index.ts`
- `apps/web/app/lich-su-diem-danh/page.tsx`
