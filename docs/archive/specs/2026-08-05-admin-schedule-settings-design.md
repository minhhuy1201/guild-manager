# Thiết lập lịch đánh trong tuần — Design

Ngày: 2026-08-05 · Phạm vi: `apps/api` + `apps/web` + `packages/shared` + `prisma/schema.prisma`.

Admin đăng nhập được thêm một mục nav **"Thiết lập"**, nơi tự quản lý các trận scrim trong tuần:
giờ đánh, tên bang đối thủ, hạn chót điểm danh — CRUD đầy đủ.

## Bối cảnh

Lịch đánh hiện **nằm trong code**, không phải trong database:

- `attendance-schedule.ts` khai báo `SESSION_TEMPLATES` — 3 trận cố định (`Thứ 3 · 20:30`,
  `Thứ 5 · 20:30`, `Thứ 7 · Guild War`) cùng luật deadline (10:00 sáng ngày đánh cho trận trước
  Thứ 5, trần cứng 17:00 Thứ 5 cho mọi trận).
- `AttendanceService.ensureWeekSessions()` upsert các template đó vào bảng `BattleSession` mỗi lần
  ai đó gọi `GET /attendance/sessions`, khoá theo `@@unique([weekStart, label])`.
- **Không có trường đối thủ.** `apps/web/lib/battle-session.ts` đang hard-code bảng
  `label → tên bang` kèm ghi chú "có API thì đọc thẳng từ session".

Thực tế scrim thì mỗi tuần một đối thủ, có tuần đánh 2 trận có tuần 4. Vì vậy spec này **chuyển
lịch đánh từ code sang database**, và `SESSION_TEMPLATES` biến mất.

Ba spec trước ([guild-war-formation-builder](./2026-08-02-guild-war-formation-builder-design.md),
[per-session-formation](./2026-08-02-per-session-formation-design.md),
[attendance-ux-hardening](./2026-08-02-attendance-ux-hardening-design.md)) đều giả định lịch đánh là
hằng số. Câu "bang đổi lịch đánh thì chỉ sửa `SESSION_TEMPLATES`" trong spec per-session-formation
**bị spec này thay thế**.

## Quyết định thiết kế

### 1. Phạm vi cấu hình: từng tuần, không phải template lặp lại

Admin chỉnh trận của **một tuần cụ thể**, không chỉnh "lịch mặc định hàng tuần".

Lý do: tên bang đối thủ vốn là dữ liệu riêng của từng tuần, không phải cấu hình lặp lại. Làm
template lặp lại thì vẫn phải nhập đối thủ theo tuần → đẻ ra hai tầng dữ liệu phải đồng bộ.

Hệ quả: scrim **không tự copy sang tuần mới**. Nếu sau này thấy phiền thì thêm nút "Sao chép lịch
tuần trước" — chưa làm bây giờ.

### 2. Tuần mới chỉ tự sinh Guild War

Khi một tuần mở ra (22:00 Thứ 7), hệ thống tự tạo **đúng một trận Guild War** (Thứ 7 20:00, không
có đối thủ). Scrim để trống cho admin thêm.

Lý do: đây là hai loại dữ liệu khác nhau. Guild War là bất biến của bang → hệ thống tự lo, và cũng
là lưới an toàn khi admin quên thiết lập. Scrim thay đổi mỗi tuần → không có cơ sở để đoán trước;
sinh sẵn "Thứ 3 · 20:30 (chưa có đối thủ)" chỉ tạo ra trận ma admin phải đi xoá.

### 3. Deadline: gợi ý tự động, admin sửa được, không có trần ẩn

Form điền sẵn deadline theo luật cũ (10:00 sáng ngày đánh cho trận trước Thứ 5, ngược lại 17:00
Thứ 5). Admin sửa được. Backend lưu **đúng giá trị admin gửi**.

Trần cứng 17:00 Thứ 5 do đó **chuyển từ luật hệ thống thành giá trị mặc định**. Phương án "vẫn kẹp
`min(deadline, 17:00 T5)` ở backend" bị loại vì nó âm thầm sửa dữ liệu admin vừa nhập — deadline
hiển thị khác cái vừa gõ là kiểu bug khó hiểu nhất.

### 4. Nhãn suy ra từ giờ đánh, không lưu

`BattleSession.label` bị **xoá khỏi database**. Nhãn hiển thị (`"Thứ 3 · 20:30"`) được tính từ
`dateTime` + `isGuildWar` mỗi lần trả về entity.

Lý do: cho admin sửa giờ đánh mà vẫn lưu nhãn thì nhãn sai ngay lần sửa đầu tiên. Dữ liệu thật chỉ
có ba thứ — giờ đánh, đối thủ, hạn chót — nhãn là thứ suy ra được.

Không cho admin nhập nhãn tự do: thêm một ô phải điền, và vẫn lệch với giờ thật khi admin sửa giờ
mà quên sửa nhãn. Tên bang đối thủ đã đủ để phân biệt hai trận cùng ngày.

### 5. Chỉ thiết lập được tuần đang mở và tuần kế tiếp

Scrim được hẹn trước với bang bạn vài ngày, nên chỉ cho sửa tuần đang mở là quá chật. Ngược lại,
sửa lịch tuần đã đánh xong gần như vô nghĩa và kéo theo câu hỏi "báo cáo điểm danh cũ có đổi
không" — nên tuần quá khứ **chỉ đọc**.

### 6. Module `battle-sessions` sở hữu bảng `BattleSession`

`ensureWeekSessions()` hiện là private method của `AttendanceService`, nhưng nó là logic **vòng đời
lịch đánh**, không phải logic điểm danh — và `TeamBuilderService` cũng phải đi vòng qua
`AttendanceService` chỉ để lấy danh sách trận. Tách ra để mỗi module có đúng một trách nhiệm.

## Thay đổi schema

```prisma
model BattleSession {
  /// Guild War do hệ thống sinh dùng id tất định `gw-<YYYY-MM-DD của weekStart>`;
  /// scrim do admin tạo dùng cuid() mặc định.
  id         String   @id @default(cuid())
  /// Thời điểm diễn ra trận đánh.
  dateTime   DateTime
  /// Hạn chót điểm danh do quản trị viên đặt.
  deadline   DateTime
  /// Tên bang đối thủ. null với Guild War và với scrim chưa chốt đối thủ.
  opponent   String?
  /// Trận Guild War Thứ 7 — do hệ thống sinh, không xoá được.
  isGuildWar Boolean  @default(false)
  /// Mốc Thứ 2 00:00 của tuần chứa trận này — dùng để gom trận theo tuần.
  weekStart  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  attendanceRecords AttendanceRecord[]
  formation         Formation?

  @@index([weekStart])
}
```

| Thay đổi | Lý do |
|---|---|
| `+ opponent String?` | Tên bang đối thủ. |
| `− label String` | Nhãn suy ra từ `dateTime`, xem quyết định 4. |
| `− @@unique([weekStart, label])` | Mất `label` thì ràng buộc này cũng mất. |

**Chống trùng Guild War khi tự sinh:** mất unique key thì `upsert` không còn chỗ bám. Guild War
dùng **id tất định** `gw-<YYYY-MM-DD của weekStart>` (ví dụ `gw-2026-08-03`), nên
`upsert({ where: { id } })` idempotent — gọi bao nhiêu lần cũng chỉ có một trận.

**Migration:** thêm cột `opponent`, bỏ cột `label` và unique index. Dữ liệu `BattleSession` hiện có
giữ nguyên (`isGuildWar` đã đúng, `dateTime` đã đúng); riêng hàng Guild War của các tuần cũ sẽ có
id cuid chứ không phải id tất định — chấp nhận được vì `ensureWeek` chỉ chạy cho tuần đang mở và
tuần kế. Không cần backfill `opponent`.

## Backend

### Cấu trúc module mới

```
apps/api/src/modules/battle-sessions/
  battle-sessions.module.ts      ← export BattleSessionsService
  battle-sessions.controller.ts
  battle-sessions.service.ts     ← ensureWeek + CRUD + validate
  session-schedule.ts            ← chuyển từ attendance/attendance-schedule.ts
  dto/battle-session.dto.ts
  entities/battle-session.entity.ts
```

`session-schedule.ts` giữ lại từ file cũ: helper giờ VN (`shiftVnDate`), mốc tuần
(`getActiveWeek`), `isDeadlinePassed`. **Bỏ** `SESSION_TEMPLATES`, còn đúng một hằng số Guild War
(Thứ 7, 20:00). **Thêm** `formatSessionLabel(dateTime, isGuildWar)`.

`defaultDeadline(dateTime, weekStart)` đặt ở **`packages/shared`** (thêm export `./lib`) vì form
phía web cần điền sẵn deadline khi admin chọn giờ đánh — để ở backend thì FE phải chép lại luật.

### Dọn phụ thuộc

- `AttendanceService` bỏ `ensureWeekSessions`, inject `BattleSessionsService`. Còn lại đúng việc
  điểm danh: `getCharacters`, `getRecords`, `mark`.
- `TeamBuilderService` đổi phụ thuộc `AttendanceService` → `BattleSessionsService`.
- `AttendanceModule` không còn export `AttendanceService` cho team-builder.

### Endpoint

`GET /attendance/sessions` và `GET /attendance/week` **bị xoá**, thay bằng:

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| `GET` | `/battle-sessions?weekStart=<ISO>` | Công khai | Không truyền `weekStart` = tuần đang mở. Tự sinh Guild War nếu tuần đó chưa có. |
| `GET` | `/battle-sessions/weeks` | Công khai | `[{ weekStart, weekEnd, isActive }]` cho tuần đang mở + tuần kế. |
| `POST` | `/battle-sessions` | Admin (`JwtAuthGuard`) | Body `{ dateTime, deadline, opponent? }` |
| `PATCH` | `/battle-sessions/:id` | Admin | Cùng shape, mọi field optional |
| `DELETE` | `/battle-sessions/:id` | Admin | |

`POST` **không có** field `isGuildWar` trong DTO → admin không thể tạo Guild War thứ hai.

`GET /battle-sessions` nhận `weekStart` của **bất kỳ tuần nào**, kể cả tuần đã qua — trang Xếp team
cần đọc tuần cũ. Giới hạn "tuần đang mở + tuần kế" chỉ áp cho `POST`/`PATCH`/`DELETE`. Riêng việc
tự sinh Guild War chỉ chạy khi `weekStart` là tuần đang mở hoặc tuần kế; tuần quá khứ chỉ đọc
những gì còn lưu.

### Entity trả về

```ts
interface BattleSessionEntity {
  id: string;
  label: string;          // suy ra từ dateTime + isGuildWar
  dateTime: string;
  deadline: string;
  isGuildWar: boolean;
  opponent: string | null;
  attendanceCount: number; // _count.attendanceRecords
  hasFormation: boolean;   // formation !== null
}
```

`attendanceCount` và `hasFormation` lấy bằng `_count`/`select` trong cùng query — dialog xoá cần
chúng để hiện đúng con số, không phải gọi thêm API.

### Luật validate

Schema Zod đặt ở `packages/shared/schemas/battle-session.schema.ts`, dùng chung FE (validate form)
và BE (validate body, qua nestjs-zod).

| Luật | Mã | Thông báo |
|---|---|---|
| `dateTime` phải rơi vào tuần đang mở hoặc tuần kế | 400 | "Chỉ thiết lập được lịch của tuần này và tuần sau." |
| `deadline <= dateTime` | 400 | "Hạn chót phải trước hoặc bằng giờ đánh." |
| `opponent` trim, tối đa 100 ký tự, không bắt buộc | 400 | "Tên bang đối thủ tối đa 100 ký tự." |
| Đặt `opponent` cho Guild War | 400 | "Trận Guild War không có đối thủ." |
| Xoá Guild War | 400 | "Không thể xoá trận Guild War." |
| Không tìm thấy `id` | 404 | "Không tìm thấy ngày đánh." |

`deadline` là **bắt buộc** trong DTO, backend không tự điền. FE điền sẵn bằng `defaultDeadline`;
backend không âm thầm suy ra giá trị nào (quyết định 3).

`weekStart` không nhận từ client — luôn tính lại từ `dateTime`.

### Hai chi tiết dễ bỏ sót

1. **Đổi giờ đánh sang tuần khác** (T7 tuần này → T2 tuần sau): `BattleSession.weekStart` phải tính
   lại theo `dateTime` mới, **và** `Formation.weekStart` là bản copy denormalize nên phải cập nhật
   cùng lúc — nếu không, đội hình biến mất khỏi tuần của nó ở trang Xếp team. Làm trong một
   `$transaction`.

2. **Đồng thời:** last-write-wins, không optimistic locking. Bang một admin, xung đột thực tế bằng
   không. Đổi lại, trận đã bị xoá thì `PATCH`/`DELETE` trả 404 và FE refetch.

## Frontend

### Route & điều hướng

- `ROUTES.settings = "/thiet-lap"`; thêm vào `main-nav` với `adminOnly: true`, icon `Settings`,
  nhãn "Thiết lập".
- `app/thiet-lap/page.tsx`: server component, `getSession()` → `redirect` nếu chưa đăng nhập (theo
  đúng mẫu `app/xep-team/page.tsx`).
- `proxy.ts`: `ADMIN_PATH_PREFIX` hiện là **một chuỗi** `"/xep-team"` → đổi thành mảng
  `["/xep-team", "/thiet-lap"]` dùng với `.some(...)`. Bỏ sót chỗ này thì gõ thẳng URL vẫn vào được.

### Feature `apps/web/features/settings/`

```
api/     battle-sessions-api.ts, battle-sessions-keys.ts
hooks/   use-week-sessions.ts, use-session-mutations.ts
components/
  settings-screen.tsx     ← ghép week selector + list
  week-selector.tsx       ← 2 tab: "Tuần này" / "Tuần sau" + khoảng ngày
  session-list.tsx        ← danh sách trận, sắp theo dateTime
  session-row.tsx         ← nhãn, đối thủ, hạn chót, nút Sửa/Xoá
  session-form-dialog.tsx ← dùng chung cho Thêm và Sửa
  delete-session-dialog.tsx
index.ts
```

### Form

Đúng ba ô: **Ngày giờ đánh** (`<input type="datetime-local">`), **Tên bang đối thủ** (text, để
trống được), **Hạn chót** (`datetime-local`).

Chọn giờ đánh xong thì ô hạn chót tự điền bằng `defaultDeadline` — **chỉ khi admin chưa tự sửa ô
đó**, tránh việc đang gõ tay lại bị ghi đè. Nút Lưu `disabled` khi đang gửi (chống double-click tạo
trùng).

### Hiển thị

- **Hàng Guild War** khác biệt: badge "Guild War", không có ô đối thủ, **không có nút Xoá**, chỉ
  sửa được giờ đánh và hạn chót.
- **Dialog xoá** hiện đúng con số từ entity: *"Xoá trận Thứ 3 · 20:30 (VS Hắc Long Đường)? Trận này
  đã có **23 lượt điểm danh** và **1 đội hình đã xếp** — xoá là mất hết, không khôi phục được."*
  Cả hai bằng 0 thì rút gọn thành xác nhận thường.
- **Trạng thái rỗng:** "Tuần này chưa có trận scrim nào." + nút "Thêm trận scrim". Đây là trạng
  thái mặc định của mọi tuần mới (quyết định 2) nên phải trông bình thường, không giống lỗi.

### Invalidate cache sau mỗi C/U/D

Thiếu chỗ nào là UI lệch nhau:

- `settingsKeys` của chính trang này
- `attendanceKeys.sessions()` + `attendanceKeys.records()` — bảng điểm danh đổi số cột
- `teamBuilderKeys` — trang Xếp team thêm/mất tab

### Trang điểm danh

`apps/web/lib/battle-session.ts` (bảng hard-code đối thủ) **xoá**, `getSessionSubtitle` đọc
`session.opponent`. `null` thì hiện "Chưa có đối thủ" thay vì để trống — admin nhìn vào biết ngay
là còn thiếu thông tin.

`fetchBattleSessions` trỏ sang `GET /battle-sessions` (không tham số = tuần đang mở).
`fetchCurrentWeek` gọi `GET /battle-sessions/weeks` rồi lấy phần tử `isActive`. Type `Week` đổi
field `fromDate`/`toDate` → `weekStart`/`weekEnd`; `week-timeline.tsx` cập nhật theo.

## Edge case

### Tạo (C)

| Tình huống | Xử lý |
|---|---|
| Tạo trận cho tuần đã qua | Chặn 400. UI không cho chọn tuần quá khứ nên đây là hàng rào cuối. |
| Tạo trận có **giờ đánh đã trôi qua** (nhập bù sau trận) | **Cho phép.** Deadline mặc định cũng ở quá khứ → thành viên không tự điểm danh được, nhưng admin điểm danh hộ được (`mark()` đã bỏ qua deadline cho admin). Nhất quán, không cần luật riêng. |
| Hai trận trùng giờ y hệt | **Không chặn** bằng ràng buộc database. Nút Lưu khoá khi đang gửi để chặn double-click; lỡ tạo trùng thì xoá. |
| Mở tab "Tuần sau" lần đầu | `ensureWeek(nextWeekStart)` sinh Guild War tuần sau ngay lúc đó. Hệ quả: trang Xếp team thấy tuần sau xuất hiện với 1 trận — đúng mong muốn. |

### Sửa (U)

| Tình huống | Xử lý |
|---|---|
| Dời deadline **về quá khứ** | Cột khoá ngay với thành viên. Record đã ghi **giữ nguyên**, không xoá. `useDeadlineRefresh` đã lo việc tự khoá UI. |
| Dời deadline **ra tương lai** khi đã quá hạn | Cột **mở lại**, thành viên đổi Có/Không được. Hệ quả cố ý của quyết định 3. |
| Dời giờ đánh sang tuần khác | Cập nhật `BattleSession.weekStart` và `Formation.weekStart` trong cùng transaction. Trận nhảy sang tab tuần kia; FE invalidate nên tự biến mất khỏi tab đang xem. |
| Sửa trận **đã có đội hình xếp sẵn** | Đội hình giữ nguyên — `assignment` không phụ thuộc giờ đánh. Nếu deadline mở lại thì danh sách người "Có" đổi → banner prefill của team-builder báo lệch, cơ chế diff đã có sẵn. |
| Dời giờ đánh vượt qua mốc `locked` của team-builder | `locked` do server tính từ giờ đánh; đổi giờ đánh là đổi luôn quyền sửa đội hình. Không cần code thêm, nhưng phải có test. |
| Xoá trắng ô đối thủ | Lưu `null`, hiển thị "Chưa có đối thủ". Không coi là lỗi. |
| Trận đã bị admin khác xoá | 404 → toast "Trận này đã bị xoá." + refetch danh sách. |

### Xoá (D)

| Tình huống | Xử lý |
|---|---|
| Trận có điểm danh và/hoặc đội hình | Cascade xoá sạch (`onDelete: Cascade` đã có sẵn ở cả `AttendanceRecord` và `Formation`). Dialog hiện đúng con số trước khi xác nhận. |
| Guild War | Chặn 400; nút Xoá không render trên hàng Guild War. |
| Trận thuộc tuần đã qua | Chặn 400. |
| Trận đang mở ở trang Xếp team | Tab biến mất sau invalidate; nếu tab đó đang được chọn thì fallback về tab đầu tiên — **cần kiểm tra `use-formation-screen` đã xử lý `sessionId` không còn tồn tại chưa**, nhiều khả năng phải sửa. |
| Xoá hết scrim, chỉ còn Guild War | Bình thường — quay về trạng thái mặc định của một tuần mới. |

### Xuyên suốt

- **Tuần lăn lúc 22:00 Thứ 7:** "tuần sau" thành "tuần này", không cần migrate gì vì mọi dữ liệu
  gắn với `weekStart` thật.
- **Dọn `Formation` sau 28 ngày** giữ nguyên, không đụng tới.

## Kiểm thử

**API (Jest):**

- `session-schedule.spec.ts` — cập nhật test cũ (bỏ case template T3/T5), thêm test
  `formatSessionLabel`.
- `battle-sessions.service.spec.ts` (mới) — `ensureWeek` idempotent (gọi 2 lần vẫn 1 Guild War),
  chặn tuần quá khứ, chặn xoá Guild War, `deadline > dateTime`, đổi tuần có cập nhật
  `Formation.weekStart`, 404 khi id không tồn tại.
- `attendance.service.spec.ts` — sửa mock sau khi bỏ `ensureWeekSessions`.
- `team-builder.service.spec.ts` — đổi mock `AttendanceService` → `BattleSessionsService`.

**Web (Vitest):**

- `defaultDeadline` ở `packages/shared` — cùng bộ case với backend.
- `getSessionSubtitle` — có opponent / không có opponent / Guild War.
- `battle-sessions-api` — shape request/response.

## Ngoài phạm vi

- Nút "Sao chép lịch tuần trước".
- Sửa lịch của tuần đã qua.
- Nhãn tự do do admin đặt.
- Lịch sử thay đổi (ai sửa gì lúc nào).
- Quản lý thành viên trong cùng trang Thiết lập — spec này chỉ làm lịch đánh.
