# D — `/thiet-lap` không xếp hàng hai request — Implementation Plan

**Goal:** Mở `/thiet-lap` bắn hai request song song thay vì nối đuôi. Không endpoint, không schema,
không luật nghiệp vụ nào đổi.

**Architecture:** Thay đổi nằm gọn trong `apps/web/features/settings`: key factory nhận `weekStart`
tùy chọn, `fetchWeekSessions` bỏ query param khi không có tuần, `useWeekSessions` bỏ `enabled`, và
`SettingsScreen` tách "tuần dùng làm khoá cache" khỏi "tuần hiển thị trên nút chọn".

**Spec:** [`docs/custom-spec/2026-09-06-d-settings-waterfall-design.md`](../custom-spec/2026-09-06-d-settings-waterfall-design.md)

## Điểm phải làm đúng

Spec chốt: **giữ khoá `"current"` cho tới khi admin bấm chọn tuần khác.** Không tự đổi `weekStart`
sang `weeks[0].weekStart` sau khi danh sách tuần về — làm vậy là tái tạo đúng lỗi mục C (một tuần
hai khoá, fetch lần hai).

Hệ quả: `selectedWeek === null` nghĩa là "tuần đang mở, ngầm định". Nút chọn tuần cần một giá trị
hiển thị riêng, suy từ cờ `isActive` chứ không phải từ tham số truyền cho query.

Nhãn không bị trống: `combineQueries` giữ `QueryBoundary` ở skeleton cho tới khi **cả hai** query
xong, nên lúc `WeekSelector` render thì `weeks` đã có.

## Global Constraints

- Không đổi behaviour business. Mọi chuỗi tiếng Việt giữ nguyên từng chữ.
- Không thêm dependency, không thêm file.
- Comment, JSDoc, tên biến: tiếng Anh. Chuỗi hiển thị: tiếng Việt.
- Nhánh: `perf/settings-parallel-week-fetch`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm --filter web lint`.

---

### Task 1: Khoá cache và request cho "tuần đang mở"

**Files:**
- `apps/web/features/settings/api/battle-sessions-keys.ts`
- `apps/web/features/settings/api/battle-sessions-api.ts`
- `apps/web/features/settings/hooks/use-week-sessions.ts`

- [x] `settingsKeys.sessions(weekStart?: string)` → `[...all, "sessions", weekStart ?? "current"]`,
      cùng khuôn với `teamBuilderKeys.formations`.
- [x] `fetchWeekSessions(weekStart?: string)`: bỏ hẳn query param khi không có tuần, giống
      `fetchFormations`. `GET /battle-sessions` không kèm `weekStart` trả tuần đang mở.
- [x] `useWeekSessions(weekStart?: string)`: bỏ `enabled`, bỏ ép kiểu `weekStart as string`. Query
      chạy ngay từ lần render đầu.

### Task 2: Màn hình bắn hai query song song

**Files:**
- `apps/web/features/settings/components/settings-screen.tsx`
- `apps/web/features/settings/components/week-selector.tsx`

- [x] `useWeekSessions(selectedWeek ?? undefined)` — không còn phụ thuộc `weeksQuery.data`.
- [x] Thêm `viewedWeek` **chỉ để hiển thị**: `selectedWeek ?? weeks.find((w) => w.isActive)?.weekStart`.
- [x] Bỏ guard `weekStart !== null` cùng comment của nó: query không còn bị disable nên guard đã
      thành code chết; `QueryBoundary` đã bảo đảm hai query thành công trước khi vào nhánh này.
- [x] `WeekSelector.value` nhận `string | undefined` cho khoảnh khắc không có tuần nào `isActive`.

### Task 3: Kiểm

- [x] `pnpm --filter web test` · `typecheck` · `lint` xanh.
- [x] Không file test nào phải sửa kỳ vọng (dấu hiệu đi quá phạm vi).

## Ảnh hưởng contract

Không có. `settingsKeys` là khoá cache nội bộ; `settingsKeys.all` vẫn phủ cả khoá `"current"` lẫn
khoá ngày nên invalidate sau create/update/delete không đổi.
