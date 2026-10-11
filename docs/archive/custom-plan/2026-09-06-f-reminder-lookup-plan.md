# F — Nhắc điểm danh: suy ra tuần một lần, dò người vắng bằng tra khoá — Implementation Plan

**Goal:** Một lượt nhắc chỉ suy ra tuần **một** lần, và việc dò người vắng đọc ra đúng câu hỏi
nghiệp vụ. Không endpoint, không schema, không luật nghiệp vụ nào đổi.

**Architecture:** Thay đổi nằm gọn trong `ReminderService.run`
(`apps/api/src/modules/discord-bot/reminder.service.ts`). Không thêm interface: PR #62 đã dựng
`AttendanceService.getRecordsForSessions` và `attendance-board.ts` đã là người dùng thứ nhất —
`ReminderService` là call site còn lại chưa chuyển sang.

**Spec:** [`docs/custom-spec/2026-09-06-f-reminder-lookup-design.md`](../custom-spec/2026-09-06-f-reminder-lookup-design.md)

## Hai vấn đề rời nhau, và độ lớn thật của chúng

1. **Suy ra tuần hai lần.** `run` gọi `listByWeek()`, rồi `getRecords()` lại mở đầu bằng
   `listByWeek()`. Mỗi lượt cron và mỗi `/nhac-diem-danh` chạy thừa một `upsert` Bang Chiến và một
   `findMany` có `_count`. Đây là việc thật, và đo được.
2. **Dò người vắng bằng quét lồng.** `records.some(...)` quét lại toàn mảng cho từng thành viên,
   từng ngày. Với ~50 người, ~4 ngày, ~200 bản ghi là dưới một mili giây, một lần mỗi ngày — **không
   phải việc hiệu năng.** Nó đi kèm vì vấn đề 1 đằng nào cũng mở đúng hàm đó ra, và vì `Set` viết ra
   được câu hỏi "có bản ghi nào cho cặp này chưa" thay vì giấu nó trong một vòng quét. Không hứa gì
   về tốc độ ở mục này.

## Điểm phải làm đúng

**Truyền `sessions`, không phải `dueSessions`.** `getRecords()` hôm nay đọc bản ghi của cả tuần và
`buildReminder` chỉ dùng phần thuộc `dueSessions`. Thu hẹp phạm vi đọc là một thay đổi riêng, spec
này không làm — truyền `sessions` giữ tập bản ghi đúng y hệt hôm nay.

## Global Constraints

- Không đổi behaviour. `ReminderOutcome` giữ ba nhánh, `buildReminder` nhận đúng kiểu cũ.
- Không thêm dependency, không thêm file nguồn.
- Comment, JSDoc, tên biến: tiếng Anh. Tên test: tiếng Việt, theo spec đang có.
- **TDD**: mỗi thay đổi bắt đầu bằng một test đỏ, xác nhận nó đỏ đúng lý do, rồi mới viết code.
- Nhánh: `perf/reminder-single-week-read`.
- Lệnh kiểm: `pnpm --filter api test`, `pnpm --filter api lint`.

---

### Task 1: Test đỏ chốt số lần suy ra tuần

**Files:** `apps/api/src/modules/discord-bot/__tests__/reminder.service.spec.ts`

- [x] `makeService` stub thêm `getRecordsForSessions` (cùng dữ liệu với `getRecords`) và trả các mock
      ra ngoài để test khẳng định được. Stub cả hai nên các test cũ xanh trước lẫn sau thay đổi.
- [x] Test đỏ — "một lượt nhắc chỉ suy ra tuần một lần": `listByWeek` gọi đúng một lần,
      `getRecords` **không** được gọi, `getRecordsForSessions` nhận id của **cả tuần** (`sessions`,
      không phải `dueSessions`).
- [x] Test xanh sẵn (chống hồi quy cho khoá ghép của vấn đề 2) — "bản ghi của người khác trong cùng
      ngày không tính là mình đã trả lời": hai thành viên, một bản ghi, người còn lại vẫn bị nhắc.
      Chiều ngược lại (đúng người, khác ngày) đã có test "bỏ ngày đã đủ người, giữ ngày còn thiếu".
- [x] Chạy test, xác nhận test mới thứ nhất đỏ đúng lý do.

### Task 2: Đọc điểm danh theo session đã có

**Files:** `apps/api/src/modules/discord-bot/reminder.service.ts`

- [x] `this.attendance.getRecords()` → `this.attendance.getRecordsForSessions(sessions.map((session) => session.id))`.
- [x] Comment nói vì sao, giống tiền lệ ở `attendance-board.ts:196`: `getRecords()` sẽ suy ra tuần
      lần hai, mà materialise tuần là một lệnh ghi.

### Task 3: Dò người vắng bằng tra khoá

**Files:** `apps/api/src/modules/discord-bot/reminder.service.ts`

- [x] Dựng một `Set` khoá `` `${sessionId}:${characterId}` `` một lần từ `records`, rồi tra trong
      vòng `filter`.
- [x] Giữ nguyên comment "A record existing is the whole test" — `Set` chỉ chứa khoá cặp, không chứa
      `isPresent`, nên luật không thể vô tình đổi.
- [x] `:` an toàn làm dấu nối: id `Character` là slug, id `BattleSession` là `gw-<YYYY-MM-DD>` hoặc
      `cuid()`, không cái nào chứa `:`.

### Task 4: Kiểm

- [x] `pnpm --filter api test` · `lint` xanh, không test cũ nào phải sửa kỳ vọng.

## Ảnh hưởng contract

Không có.

## Đo lại

Bỏ một `upsert` và một `findMany` ở mỗi lượt cron và mỗi `/nhac-diem-danh`. Vấn đề 2 không đo được.
