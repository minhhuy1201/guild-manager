# Điểm danh dùng Boolean — `AttendanceRecord.status` → `isPresent`

Ngày: 2026-08-29 · Phạm vi: `packages/shared`, `apps/api`, `apps/web`, `docs/architecture.md`.

Yêu cầu gốc: đổi kiểu dữ liệu cột `status` của `AttendanceRecord` sang **boolean** — `true` cho
`"CO"`, `false` cho `"KHONG"`; lựa chọn "Có" gửi `true`, "Không" gửi `false`.

## Bối cảnh

### 1. Một miền giá trị nhị phân đang được mô hình hoá bằng hai enum song song

Cùng một khái niệm được khai báo hai lần và phải tự giữ đồng bộ bằng comment:

| Nơi | Khai báo |
|---|---|
| `apps/api/prisma/schema.prisma` | `enum AttendanceStatus { CO, KHONG }` — kèm comment "Values must match the AttendanceStatus enum in packages/shared/enums" |
| `packages/shared/enums/attendance.enum.ts` | `enum AttendanceStatus { PRESENT = "CO", ABSENT = "KHONG" }` |

`docs/architecture.md:73` phải viết thành luật: "Prisma's `GuildClass` / `AttendanceStatus` enums must
keep the same values as the shared enums." Với `GuildClass` (miền giá trị mở, sẽ còn thêm class) đó là
cái giá hợp lý; với một câu hỏi yes/no thì không.

### 2. Cặp enum đó buộc codec phải cast

`apps/api/src/modules/attendance/attendance.codec.ts:29`:

```ts
// Prisma emits a string literal union, the shared enum is a TS enum — same values, constrained
// by the database enum, so the cast is safe. `verifyResponse` is what asserts that outside
// production: a cast is not checked by the compiler.
status: row.status as AttendanceStatus,
```

`AttendanceRecordRow.status` phải khai báo là `string` (dòng 13) chứ không phải kiểu Prisma, và
`attendance.service.ts:103` lặp lại cùng cái cast trong `getSummary`
(`(row.status as AttendanceStatus) === status`). Ba dòng comment tồn tại chỉ để giải thích một chỗ
lệch kiểu mà bản thân miền giá trị không đòi hỏi.

### 3. Bốn chỗ tiêu thụ đều chỉ hỏi đúng một câu: "có đi hay không"

| Vị trí | Cách dùng |
|---|---|
| `apps/web/features/attendance/components/attendance-row.tsx:141-147` | `if (status === PRESENT) … if (status === ABSENT) … else "—"` |
| `apps/web/features/attendance/components/attendance-row.tsx:174,191` | `aria-pressed={value === ABSENT}` / `=== PRESENT` |
| `apps/web/features/attendance/components/member-attendance-card.tsx:24` | `const CHOICES = [PRESENT, ABSENT]` |
| `apps/web/features/attendance/components/attendance-log-table.tsx:118` | `const present = record.status === PRESENT` |
| `apps/web/features/team-builder/lib/session-pool.ts:29` | `record.status === PRESENT` |

Không chỗ nào cần đến hơn hai nhánh, và `attendanceSummarySchema` cũng đã cứng hoá điều đó bằng đúng
hai trường `coCount` / `khongCount`. Miền giá trị này sẽ không mở rộng: một trạng thái thứ ba (ví dụ
"chưa trả lời") đã được biểu diễn bằng **sự vắng mặt của bản ghi**, không phải bằng một nhãn enum.

## Quyết định

1. **Cột đổi thành `isPresent Boolean`**, `true` = "Có", `false` = "Không".
   Đổi tên chứ không giữ `status`: `.claude/rules/common/coding-style.md` yêu cầu boolean mang tiền tố
   `is`/`has`, và một field tên `status` kiểu boolean là kiểu đặt tên nói dối về nội dung.
2. **Xoá enum `AttendanceStatus` ở cả hai nơi** — `enum` trong `schema.prisma` (kèm `DROP TYPE` trong
   migration) và `enum` trong `packages/shared/enums/attendance.enum.ts`.
3. **`ATTENDANCE_STATUS_LABEL` được thay bằng helper**
   `attendanceLabel(isPresent: boolean): string` trong chính file `attendance.enum.ts`, trả `"Có"` /
   `"Không"`. Giữ một chỗ duy nhất sinh nhãn để ba màn hình không hardcode chuỗi tiếng Việt rời rạc.
4. **`attendanceSummarySchema` giữ nguyên** `coCount` / `khongCount`: đó là số đếm theo miền nghiệp vụ
   ("bao nhiêu người trả lời có"), không phải tên trạng thái, nên không bị kéo theo.

## Ảnh hưởng contract

`markAttendanceSchema` và `attendanceRecordSchema` trong `packages/shared/schemas/attendance.schema.ts`
đổi `status: z.enum(AttendanceStatus)` thành `isPresent: z.boolean()`. Đây là **breaking change** của
API: `POST /attendance` không còn nhận `status`, và `GET /attendance/records` không còn trả `status`.
Chấp nhận được vì `apps/web` là client duy nhất và hai app deploy cùng nhau; không cần giai đoạn nhận
cả hai tên field.

`GET /attendance/summary` không đổi hình dạng phản hồi.

## Chuyển đổi dữ liệu

Bảng `AttendanceRecord` đang có dữ liệu thật, nên migration phải chuyển đổi tại chỗ chứ không được
drop cột. Prisma sinh sẵn `DROP COLUMN` + `ADD COLUMN` cho một thay đổi kiểu như thế này, vì vậy
migration phải được tạo bằng `--create-only` rồi viết tay:

```sql
ALTER TABLE "AttendanceRecord"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE BOOLEAN USING ("status" = 'CO');
ALTER TABLE "AttendanceRecord" RENAME COLUMN "status" TO "isPresent";
DROP TYPE "AttendanceStatus";
```

`USING ("status" = 'CO')` là chỗ định nghĩa đúng ánh xạ `CO → true`, mọi giá trị còn lại (`KHONG`) →
`false`. Cột `NOT NULL` nên không có nhánh `NULL` cần xử lý. Bảng đã bật RLS từ
`20260802185500_chan_data_api_truy_cap_bang` và `ALTER COLUMN` không đụng tới RLS, nên không cần
migration bật lại.

Trước khi apply, ghi lại số liệu đối chiếu:

```sql
SELECT "status", count(*) FROM "AttendanceRecord" GROUP BY 1;
```

## Rủi ro

**`false` là một giá trị hợp lệ, không phải "chưa chọn".** Trước đây "chưa chọn" là `undefined` và mọi
giá trị đã chọn đều truthy, nên một phép kiểm tra bằng truthiness vẫn chạy đúng một cách tình cờ. Sau
thay đổi, `if (isPresent)` sẽ âm thầm gộp "Không" vào "chưa điểm danh". Mọi chỗ phân biệt ba trạng
thái phải so sánh tường minh với `undefined`:

- `StatusBadge` trong `attendance-row.tsx` — nhánh `—` phải là `isPresent === undefined`.
- `getChangedCells` trong `attendance-grid.tsx:134` — đã viết sẵn `next === undefined`, giữ nguyên.
- `member-attendance-card.tsx:81` — `?? null` rồi so sánh `current === isPresent`, an toàn.

Điểm rủi ro thứ hai: `packages/shared` chạy runtime từ `dist`, nên sau khi sửa phải
`pnpm --filter @guild/shared build` trước khi `apps/api`/`apps/web` nhìn thấy thay đổi lúc chạy.
