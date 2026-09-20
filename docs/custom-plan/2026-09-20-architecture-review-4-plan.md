# Rà soát kiến trúc đợt 4 — Kế hoạch

Spec: [2026-09-20-architecture-review-4-overview.md](../custom-spec/2026-09-20-architecture-review-4-overview.md)

Nhánh: `refactor/architecture-review-4` (tạo từ `main` tại `b260ccd`). Một commit mỗi mục, tiếng
Anh, Conventional Commits.

## Thứ tự và trạng thái

| # | Commit | Trạng thái |
|---|---|---|
| S1 | `refactor(shared): expose the saturday offset and deadline hour as one constant` | xong |
| X1 | `refactor(shared): drop exports and an env var nothing reads` | xong |
| A1 | `refactor(api): check the admin preamble of a slash command in one place` | xong |
| T1 | `test(api): close the announce-closed path and share the vn date helper` | xong |
| C1 | `refactor(api): read the error timestamp through the Clock seam` | xong |
| W1 | `refactor(web): share one authHeader across the server action modules` | xong |
| D1 | `docs(api): correct the stale deadline comment in schema.prisma` | xong |
| W2 | `fix(web): recover an expired session when saving a formation` | xong |

`S1` trước `X1` vì cả hai đổi `packages/shared`, làm liền nhau thì chỉ build shared một lần. Nhánh
web (`W1` → `W2`) độc lập hoàn toàn với nhánh api.

## Các bước

### S1

1. Bỏ `private` khỏi `DEADLINE_HOUR` và `SATURDAY_OFFSET_FROM_MONDAY` trong
   `packages/shared/lib/battle-session.ts`, mỗi cái kèm một câu nói vì sao nó public.
2. `apps/api/src/modules/battle-sessions/session-schedule.ts`: xoá bản chép, import từ
   `@guild/shared/lib`.
3. `apps/web/features/attendance/lib/history-weeks.ts`: xoá `MONDAY_TO_SATURDAY`, dùng hằng số shared.
4. `apps/web/features/settings/components/session-form-dialog.tsx`: `DEFAULT_DEADLINE_TIME` dựng từ
   `DEADLINE_HOUR`.
5. `pnpm --filter @guild/shared build`, rồi test hai app.

### X1

1. Xoá `WeekStartQuery`, `SaveTeamNamesInput`, `AssignmentInput`.
2. Bỏ `export` ở `INVALID_WEEK_MESSAGE`, `MATCH_COUNT_MESSAGE`, `DEFAULT_REDIRECT`; sửa luôn câu
   comment cũ của `INVALID_WEEK_MESSAGE` (nó hứa web sẽ import, mà không ai import).
3. Xoá `APP_TIMEZONE` khỏi `config/env.validation.ts`, `apps/api/.env.example`,
   `docs/development.md`, `docs/production.md`, và snippet ở `apps/api/docs/backend.md`.
4. Build shared lại, test + lint hai app. `no-unused-vars` và `tsc` là hàng rào thật ở mục này.

Không sửa `docs/custom-spec/2026-08-18-c3-vn-clock-design.md`: nó ghi lại quyết định lúc đó, và
chính nó đã nói `APP_TIMEZONE` không ai đọc.

### A1

1. Thêm `apps/api/src/modules/discord-bot/require-admin.ts` (union có tag, xem spec).
2. Năm command đổi sang `requireAdmin`, mỗi command giữ `ADMIN_ONLY` của nó; dọn import không còn dùng.
3. `diem-danh-ho` đọc người gọi qua `check.caller.actor`.
4. Thêm `__tests__/require-admin.spec.ts`: admin đi qua, chưa gắn nhân vật → `NOT_LINKED`, member →
   câu của command, và thứ tự giữa hai guard.
5. Ghi một dòng vào `apps/api/CLAUDE.md` cạnh rule về `reply.ts`, để command sau dùng đúng đường.

### T1

1. Thêm `apps/api/src/__tests__/vn-date.ts`, bốn spec import nó, xoá bốn bản `vn()`.
2. `stubSchedule` gọi `isAttendanceClosed` thật, nhận `closedByHand` theo session id.
3. Re-export `isAttendanceClosed` qua `battle-sessions.public.ts`.
4. Hai test mới cho đường công bố đội hình (member bị từ chối, admin vẫn sửa).
5. **Kiểm reproduce:** trả `stubSchedule` về công thức cũ, chạy spec, test mới phải đỏ, rồi khôi phục.
6. `module-boundary.spec.ts` phải vẫn xanh sau khi thêm file trong `src/__tests__/`.

### C1

1. `AllExceptionsFilter` nhận `Clock` qua constructor, `timestamp` đọc `this.clock.now()`.
2. `main.ts`: `new AllExceptionsFilter(app.get(Clock))`.
3. Spec dựng `FixedClock(NOW)` và thêm một test assert `timestamp`.

### W1

1. `authHeader` vào `features/auth/api/session.ts`, re-export ở `features/auth/server.ts`.
2. Bốn file `features/*/api/*.ts` xoá bản chép, import `authHeader`, dọn `ApiError` nếu không còn dùng.
3. `features/attendance/api/__tests__/attendance-api.test.ts`: mock `authHeader` thay cho
   `getAccessToken`, vẫn assert Bearer token đi kèm mọi request.
4. Thêm `features/auth/api/__tests__/auth-header.test.ts`: mock `server-only` và `next/headers`,
   chốt câu tiếng Việt và status 401.
5. Viết lại đoạn "trùng lặp có chủ ý" trong `apps/web/docs/frontend.md`.

### D1

Sửa comment `deadline` trong `apps/api/prisma/schema.prisma`, trỏ sang `DEADLINE_HOUR` /
`deadlineCapFor`. Không chạy `prisma format`: nó dồn lại cả phần căn lề của model khác và biến một
commit comment thành diff nhiễu.

### W2

1. `handleSave`: nhánh 409 `return` sau `refetchFormations()`, mọi lỗi khác giao `recoverSession(error)`.
2. `useSessionRecovery` gọi cạnh `useSaveFormation`.
3. Test: 401 → `recoverSession` được gọi, không refetch, nháp còn nguyên; 409 → không đi đường recover.
4. **Kiểm reproduce:** trả `catch` về bản cũ, test 401 phải đỏ, rồi khôi phục.
5. `frontend.md` ghi luật "mọi đường ghi giao lỗi cho `recoverSession` trước khi hiện".

## Điều kiện hoàn thành

- `pnpm --filter @guild/shared build` chạy trước khi test hai app (cả hai app đọc `dist`).
- `pnpm --filter api test` và `pnpm --filter web test` xanh, số test **tăng**: +4 (A1), +2 (T1),
  +1 (C1), +2 (W1), +2 (W2).
- `pnpm --filter api lint` và `pnpm --filter web lint` sạch, không còn warning.
- Hai mục có kiểm reproduce (T1, W2) đều đã thấy test đỏ trước khi vá.
- Không giá trị business nào đổi: giờ deadline, câu từ chối, thứ tự guard, status HTTP giữ nguyên.
  W2 là ngoại lệ duy nhất và là **thêm** một đường recover, không đổi đường cũ.
- Spec và plan này khớp với code đã commit.
