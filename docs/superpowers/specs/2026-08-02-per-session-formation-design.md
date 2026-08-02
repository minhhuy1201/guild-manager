# Đội hình theo từng trận đánh — Design

Ngày: 2026-08-02 · Phạm vi: `apps/web` + `apps/api` + `packages/shared` + `prisma/schema.prisma`.

Tiếp nối [2026-08-02-guild-war-formation-builder-design.md](./2026-08-02-guild-war-formation-builder-design.md),
vốn chỉ dựng được **một** đội hình duy nhất và cố tình để việc lưu ngoài phạm vi.

Spec này **thay thế** mục "Ngoài phạm vi → Lưu đội hình" của spec đó: nút "Lưu đội hình" thôi bị vô
hiệu hoá, và `api/team-builder-api.ts` + `hooks/use-save-formation.ts` được dựng thật. Mọi quyết
định khác của spec cũ (bố cục lưới, logic 6 case kéo–thả, pool là derived state, không ràng buộc
lưu phái) **giữ nguyên**.

## Bối cảnh

Mỗi tuần bang đánh **3 trận**, nên cần 3 đội hình chứ không phải một.

"Ngày đánh" **đã là khái niệm có sẵn** trong hệ thống, không phải thứ cần dựng mới:

- `BattleSession` trong `prisma/schema.prisma`: `label`, `dateTime`, `deadline`, `isGuildWar`, `weekStart`.
- `attendance-schedule.ts` khai báo 3 trận cố định: `Thứ 3 · 20:30`, `Thứ 5 · 20:30`, `Thứ 7 · Guild War`.
- `GET /attendance/sessions` đã chạy thật, trả các trận của tuần đang mở.
- `GET /attendance/records` cho biết ai đã báo "Có" cho từng trận.
- `useBattleSessions()` và `useAttendanceRecords()` đã tồn tại trong
  `features/attendance/hooks/use-attendance.ts`, chỉ chưa export ra barrel.

Vì vậy đội hình **khoá theo `sessionId`**, và danh sách trận lấy thẳng từ dữ liệu có sẵn. Bang đổi
lịch đánh (thêm trận, đổi giờ) thì chỉ sửa `SESSION_TEMPLATES`; cả điểm danh lẫn xếp team tự theo.

## Quyết định kiến trúc

### 1. Lưu ở server, mỗi trận một hàng, `assignment` là JSON

```prisma
/// Đội hình bang chiến của một trận đánh.
model Formation {
  id         String   @id @default(cuid())
  /// Một trận chỉ có đúng một đội hình.
  sessionId  String   @unique
  /// Copy từ session — để dọn dữ liệu cũ mà không phải join.
  weekStart  DateTime
  /// { "team-1-pos-1": "charId", ... }. Ô trống thì không có khoá.
  assignment Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  session BattleSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([weekStart])
}
```

Chọn JSON thay vì bảng chuẩn hoá (mỗi ô một hàng) vì:

- `Assignment` phía FE **đã** gần đúng hình dạng này (`slotId → characterId`), chỉ phải bỏ khoá rỗng
  khi gửi — xem mục 2.
- Dọn dữ liệu cũ là một câu `deleteMany({ weekStart: { lt: … } })`.
- Đổi bố cục lưới (10 team → 12 team) không cần migrate dữ liệu.

**Không** chọn vì lý do dung lượng. Ở quy mô này hai cách chênh nhau ~110 KB, tức dưới 0,03% hạn
mức 500 MB của gói free Supabase — con số đó không đủ để quyết định gì.

Nhược điểm thật của JSON: không truy vấn được theo nhân vật ("tháng qua Long hay đứng team mấy"),
và không có khoá ngoại tới `Character`. Nhu cầu thống kê chưa hề được nêu; nếu sau này cần, chuyển
sang bảng chuẩn hoá là một script đọc JSON ghi ra bảng, không mất dữ liệu. Phần khoá ngoại được bù
bằng luật 3 ở mục dưới.

### 2. Backend chỉ biết `Assignment`, không biết lưới

`Slot`, `Formation` (bố cục), số team và số ô mỗi team vẫn nằm hẳn ở frontend. Server chỉ lưu một
map chuỗi → chuỗi. Đây là lý do đổi bố cục không đụng tới DB.

Hợp đồng dữ liệu đặt ở `packages/shared/schemas/formation.schema.ts` — nơi đã có sẵn
`attendance.schema.ts` dùng Zod:

```ts
/** slotId → characterId. Ô trống thì KHÔNG có khoá (không dùng null). */
export const assignmentSchema = z.record(z.string(), z.string());

/** Body của PUT /team-builder/formations/:sessionId */
export const saveFormationSchema = z.object({ assignment: assignmentSchema });
```

Backend dùng để validate, frontend dùng làm kiểu. Một nguồn sự thật.

**Lệch kiểu phải xử lý tường minh.** `Assignment` phía FE hiện là
`Record<string, string | null>` — mọi ô đều có khoá, ô trống mang giá trị `null` (xem
`createEmptyAssignment`). Trên dây thì ô trống **bị bỏ hẳn khoá**, để payload không phình vì 60
khoá `null` mỗi lần lưu. Hai hàm thuần trong `api/team-builder-api.ts` lo việc dịch, và có test:

- `toWire(assignment)` — bỏ mọi khoá có giá trị `null`.
- `fromWire(wire, slots)` — dựng lại đủ 60 khoá, ô thiếu thành `null`.

Không đổi kiểu `Assignment` của FE: `null` tường minh là thứ khiến `applyDrop` và
`createEmptyAssignment` chạy đúng, và toàn bộ test hiện có dựa vào đó.

### 3. Ba luật vòng đời, đặt ở service chứ không ở FE

1. **Khoá trận đã đánh.** `locked = session.dateTime < now`. `PUT` vào trận đã khoá trả `409`.
   Đây là chốt chặn thật; FE chỉ làm mờ nút cho đẹp, không phải nơi quyết định.
2. **Dọn dữ liệu quá 28 ngày.** Yêu cầu là "giữ khoảng 1 tháng"; chốt thành **28 ngày** vì dữ liệu
   vốn gom theo tuần (`weekStart`), lấy mốc theo tuần thì ranh giới luôn rơi đúng Thứ 2 thay vì
   giữa tuần. Mỗi lần gọi `GET /team-builder/weeks`, xoá trước các đội hình có `weekStart` cũ hơn
   28 ngày. Không cần cron, không cần `pg_cron` — màn hình này chắc chắn được mở nên việc dọn chắc
   chắn chạy.
3. **Bỏ id mồ côi.** Lúc đọc, service loại các `characterId` không còn trong bảng `Character`.
   JSON không có khoá ngoại, nên đây là chỗ bù lại. UI không bao giờ thấy ô ma.

### 4. Tách state: server ở TanStack Query, nháp ở Zustand

`AGENTS.md:56` cấm để dữ liệu API trong Zustand, nên:

- **TanStack Query** giữ đội hình đã lưu: `useFormations(weekStart)`.
- **Zustand** chỉ giữ bản nháp đang sửa: `drafts: Record<sessionId, Assignment>`,
  `activeSessionId`, `selectedWeekStart`.

Đội hình đang hiển thị = `drafts[sessionId] ?? dữ liệu từ server`. Chưa động vào trận nào thì trận
đó không có khoá trong `drafts`.

Cách chia này trả lời gọn nhiều thứ khác:

- **Chưa lưu** = `drafts[sessionId]` tồn tại và khác bản server. So 60 khoá mỗi lần render, không
  đáng kể.
- **Đặt lại** = xoá khoá đó khỏi `drafts`, tự quay về bản đã lưu.
- **Đổi tab không mất việc**, vì nháp của cả 3 trận sống song song. Nên **không cần hộp thoại cảnh
  báo khi đổi tab**. Chỉ chặn `beforeunload` khi còn nháp chưa lưu, vì nháp nằm trong bộ nhớ.
- Nút **Lưu** ghi đúng trận đang mở (`PUT` vốn theo `sessionId`). Tab nào còn nháp thì hiện chấm nhỏ.

Lưu bằng **nút bấm**, không tự lưu. Đổi lại phải theo dõi trạng thái chưa lưu như trên.

### 5. Pool theo từng trận

Pool = người đã báo **"Có"** cho đúng trận đang chọn, trừ đi người đã được xếp:

```ts
const presentIds = records
  .filter((r) => r.sessionId === activeSessionId && r.status === AttendanceStatus.PRESENT)
  .map((r) => r.characterId);
```

Đổi tab thì pool đổi theo, không cần code riêng. Hệ quả phải chấp nhận: ai chưa điểm danh sẽ không
xuất hiện trong pool.

**Người rút lui.** Ai đã được xếp vào ô rồi mới đổi điểm danh sang "Không" thì **giữ nguyên trong
ô**, tô cảnh báo kèm nhãn "đã báo nghỉ". Không bao giờ tự gỡ người sau lưng người dùng — mất vị trí
đã tính toán còn tệ hơn.

Trạng thái cảnh báo này đặt tên là `absentReason`. Nó **không phải** sự hồi sinh của
`invalidReason` (ràng buộc lưu phái) vốn đã bị bỏ ở spec trước: nghĩa khác hẳn, và dựa trên dữ liệu
điểm danh thật chứ không phải luật bịa ra để demo.

### 6. Điền sẵn từ trận trước, dạng nháp

Khi mở một trận mà server chưa có đội hình **và** chưa có nháp: dựng đội hình từ **trận gần nhất
trước đó trong cùng tuần mà có đội hình đã lưu**, bỏ những người không báo "Có" cho trận này, ghi
vào `drafts`. Kèm băng thông báo dạng "Đã điền sẵn từ Thứ 3 · bỏ 4 người không đánh trận này" và
nút "Xoá hết".

Không có trận trước nào có đội hình (ví dụ đầu tuần, mở tab Thứ 3) → không điền gì, không hiện
băng thông báo, lưới để trống như bình thường.

Chỉ là nháp — vào DB khi người dùng bấm Lưu.

Điều kiện "chưa có nháp" khiến việc này tự nó không lặp: bấm "Xoá hết" thì nháp rỗng vẫn *tồn tại*,
nên không bị điền lại.

### 7. Chọn trận bằng Tabs, chọn tuần bằng picker riêng

3 trận hiện sẵn thành 3 tab, mỗi tab có nhãn, giờ đánh, số ô đã xếp (`12/60`), dấu hiệu riêng cho
Guild War và biểu tượng khoá nếu trận đã đánh. Đổi trận một cú nhấp, và thấy tiến độ cả 3 trận mà
không phải mở gì ra.

Tuần cũ xem được nhưng **chỉ đọc**: render `MemberCard` thẳng thay vì `DraggableMember`, ẩn pool và
nút Lưu. Đây đúng là lý do hai component đó được tách đôi — `useDraggable` không gọi có điều kiện
được.

Session của tuần cũ do chính module team-builder trả về kèm đội hình, **không** bắt module
attendance mở thêm API lịch sử. Attendance giữ nguyên trách nhiệm "tuần đang mở".

## API

Tất cả bọc `JwtAuthGuard` — chỉ quản trị viên. Khác `POST /attendance` vốn dùng
`OptionalJwtAuthGuard` vì thành viên thường cũng điểm danh được.

| Endpoint | Việc |
|---|---|
| `GET /team-builder/weeks` | Các tuần còn dữ liệu, mới nhất trước. Dọn dữ liệu quá hạn trước khi trả |
| `GET /team-builder/formations?weekStart=…` | 3 trận của tuần đó, mỗi trận kèm `assignment` và cờ `locked` |
| `PUT /team-builder/formations/:sessionId` | Ghi đè nguyên `assignment`. Idempotent, dùng `upsert` |

Module mới `apps/api/src/modules/team-builder/`: controller, service, module, `dto/`, `entities/`,
`__tests__/`. Service tiêm thẳng `PrismaService`, **giống `attendance.service.ts:28`**.

> `AGENTS.md:79` ghi luồng `Controller → Service → Repository → Prisma`, nhưng module attendance
> hiện không có tầng repository nào. Spec này chọn nhất quán với code đang chạy. Nếu muốn đúng chữ
> trong AGENTS.md thì nên tách cả attendance cho đồng bộ — đó là việc riêng, ngoài phạm vi.

## Cấu trúc file

Backend:

```
apps/api/src/modules/team-builder/
├── team-builder.controller.ts
├── team-builder.service.ts
├── team-builder.module.ts          # đăng ký vào app.module.ts
├── dto/save-formation.dto.ts
├── entities/formation.entity.ts
└── __tests__/team-builder.service.spec.ts
```

Cộng một migration Prisma cho model `Formation`.

Frontend — phần đáng chú ý là **hàm thuần trong `lib/`**, nơi mọi quyết định thật sự nằm, để test
được ở `environment: "node"` như hiện tại:

| File | Việc |
|---|---|
| `lib/prefill.ts` | Dựng đội hình từ trận trước, bỏ người không báo "Có" |
| `lib/formation-diff.ts` | So nháp với bản đã lưu → còn thay đổi chưa lưu hay không |
| `lib/session-status.ts` | `locked` / `editable` từ `dateTime` + tuần đang chọn |
| `lib/class-shortage.ts` | Đếm người chưa xếp theo lưu phái |
| `lib/assignment.ts` | Giữ nguyên, không đổi một dòng |

```
features/team-builder/
├── api/team-builder-api.ts
├── hooks/
│   ├── use-formations.ts           # TanStack Query: đội hình theo tuần
│   ├── use-formation-weeks.ts
│   ├── use-save-formation.ts       # PUT + invalidate
│   ├── use-session-pool.ts         # pool theo trận (thay use-pool.ts)
│   ├── use-prefill.ts
│   └── use-formation-screen.ts     # điều phối: tuần + tab + query + nháp + dnd
├── store/formation-store.ts        # SỬA: drafts theo sessionId
└── components/
    ├── week-picker.tsx
    ├── session-tabs.tsx
    ├── formation-toolbar.tsx       # Lưu / Đặt lại / trạng thái
    ├── prefill-banner.tsx
    └── (formation-grid, team-column, slot-cell, member-pool, pool-filters — thêm cờ readOnly)
```

`features/attendance/index.ts`: export thêm `useBattleSessions`, `useAttendanceRecords` và các type
liên quan. Cần vì `AGENTS.md:63` cấm import trực tiếp file nội bộ của feature khác.

**Rủi ro thấy trước:** `team-builder-screen.tsx` sẽ phình to vì phải ghép tuần + tab + query + nháp
+ dnd. Vì vậy tách phần điều phối ra `hooks/use-formation-screen.ts`, để component chỉ còn dựng cây
JSX.

## Xử lý lỗi

- `GET` hỏng → `ErrorState` + nút thử lại, đúng pattern `attendance-screen.tsx`.
- `PUT` hỏng → toast báo lỗi, **giữ nguyên nháp**. Đây là lý do không dùng optimistic update: hỏng
  mà mất luôn công xếp thì tệ hơn nhiều so với chờ thêm một nhịp.
- `PUT` trả `409` (trận vừa bị khoá vì tới giờ đánh) → thông báo riêng, refetch để UI chuyển sang
  chỉ đọc.
- Tuần chưa có trận nào → empty state, không phải lỗi.

## Test

Backend — `team-builder.service.spec.ts`, bốn luật:

1. Chặn ghi vào trận đã khoá (`dateTime` quá khứ) → ném lỗi 409.
2. Dọn đúng các đội hình có `weekStart` cũ hơn 28 ngày, không đụng phần còn lại.
3. Bỏ `characterId` không còn trong bảng `Character` khi đọc.
4. `PUT` hai lần cùng payload cho cùng kết quả (idempotent).

Frontend — test các hàm thuần ở bảng trên, chạy `pnpm --filter web test`:

- `prefill.ts`: giữ đúng vị trí người vẫn đánh, bỏ đúng người vắng, trả rỗng khi không có trận
  trước hoặc trận trước chưa có đội hình.
- `to-wire` / `from-wire`: bỏ đúng khoá `null` khi gửi, dựng lại đủ 60 khoá khi nhận.
- `formation-diff.ts`: nháp giống bản lưu → không dirty; khác một ô → dirty.
- `session-status.ts`: trận quá khứ khoá, trận tương lai mở, tuần cũ luôn chỉ đọc.
- `class-shortage.ts`: đếm đúng theo lưu phái.

**Không** test component: vitest đang cấu hình `environment: "node"`, chưa có jsdom hay
testing-library. Thêm hạ tầng đó là việc riêng, ngoài phạm vi spec này.

## Hạ tầng: host DB trên Supabase

Ba điểm cần xử lý ở khâu cấu hình môi trường, không phải ở code:

1. **Hai connection URL.** `prisma.config.ts` hiện chỉ có một `DATABASE_URL`. Với Supabase thường
   cần cổng `6543` (connection pooler) cho runtime và cổng `5432` (direct) cho `prisma migrate`.
   Dùng nhầm sẽ hoặc hỏng migrate, hoặc hết connection lúc chạy thật.
2. **Dự án free bị tạm dừng khi không hoạt động** (~7 ngày không truy vấn). Bang nghỉ một tuần thì
   lần vào sau sẽ lỗi kết nối cho tới khi vào dashboard khôi phục. Không tránh được trên gói free
   ngoài việc ping định kỳ.
3. **Không dùng cron của Supabase** cho việc dọn dữ liệu — đã xử lý bằng luật 2 ở mục vòng đời.

Cần kiểm chứng lại số liệu và hành vi gói free tại thời điểm triển khai; chúng thay đổi theo thời gian.

## Ngoài phạm vi

- **Xếp trước cho tuần chưa mở.** Tuần sau chưa có `BattleSession` trong DB, muốn làm phải sinh
  trước hoặc khoá đội hình theo `(weekStart + label)` thay vì `sessionId`. Chưa cần.
- **Thống kê theo nhân vật** ("tháng qua ai hay đứng team mấy") — lý do duy nhất để chọn bảng chuẩn
  hoá, và chưa được nêu.
- **Sửa đội hình tuần cũ.** Xem được, không sửa được.
- **Nhiều đội hình song song cho cùng một trận** (phương án A / phương án B).
- **Kéo thả trên mobile** bằng `TouchSensor`, và thêm `level` vào `Character` — vẫn ngoài phạm vi
  như spec trước.
