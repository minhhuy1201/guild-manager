# A2 — Một module `Clock` sau seam, thay cho `now` truyền tay

Ngày: 2026-08-21 · Phạm vi: `apps/api`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Nên làm **trước** [A1](./2026-08-21-a1-schedule-read-seam-design.md),
[A3](./2026-08-21-a3-response-codec-design.md), [A4](./2026-08-21-a4-week-start-design.md),
[A6](./2026-08-21-a6-formation-grid-codec-design.md): cả bốn đều thêm hoặc sửa chữ ký đang mang `now`.

Đưa "bây giờ là lúc nào" xuống sau một seam có hai adapter thật, và bỏ tham số `now` khỏi interface
của mọi service.

## Bối cảnh

15 chữ ký đang mang `now: Date = new Date()`:

| File | Dòng |
|---|---|
| `modules/battle-sessions/battle-sessions.service.ts` | `:56`, `:65`, `:86`, `:113`, `:132`, `:170`, `:228` |
| `modules/attendance/attendance.service.ts` | `:53`, `:86` |
| `modules/team-builder/team-builder.service.ts` | `:67`, `:113`, `:174` |
| `modules/battle-sessions/session-schedule.ts` | `:79`, `:100`, `:160` |

Mỗi doc comment đều ghi cùng một câu: *"Thời điểm hiện tại (cho phép truyền vào để test)"*. Câu đó
nói đúng bản chất vấn đề — **tham số này chỉ tồn tại cho test**. Không controller nào truyền:

```ts
// battle-sessions.controller.ts
return this.battleSessions.listByWeek(weekStart);      // :45
return this.battleSessions.create(body);               // :57
// team-builder.controller.ts
return this.teamBuilder.getWeeks();                    // :29
return this.teamBuilder.getFormations(weekStart);      // :43
// attendance.controller.ts
return this.attendance.mark(body, user ?? null);
```

Hệ quả cụ thể, không phải giả định: trong **một** lần `POST /attendance`, luật quá hạn được đánh giá
hai lần bằng **hai đồng hồ khác nhau**.

```ts
// attendance.service.ts
async mark(input, actor = null, now: Date = new Date()) {   // :83-87  ← đồng hồ #1
  …
  const session = await this.battleSessions.findById(sessionId);   // :99  ← KHÔNG truyền now
  //   → findById(id, now = new Date())                            battle-sessions:111-114
  //   → toEntity(row, now) → isDeadlinePassed(row.deadline, now)  battle-sessions:319  ← đồng hồ #2
  …
  if (!isAdmin && isDeadlinePassed(new Date(session.deadline), now)) {  // :108  ← tính lại, đồng hồ #1
```

Cờ `isDeadlinePassed` mà `findById` vừa dựng bị bỏ đi, rồi luật được chạy lại trên chuỗi ISO vừa
được `toISOString()` xong. Cờ trả về client và cờ dùng để cho/chặn ghi không nhất thiết là một.

## Quyết định thiết kế

### 1. `Clock`: interface một phương thức

```ts
/** Nguồn thời gian của ứng dụng. Mọi "bây giờ" trong một request đến từ đây. */
export abstract class Clock {
  /** Thời điểm hiện tại. */
  abstract now(): Date;
}
```

Đặt ở `src/common/clock/` — đây là mối quan tâm xuyên suốt, không phải nghiệp vụ, nên đúng chỗ theo
`architecture.md` §7 ("A cross-cutting backend concern → `src/common/`").

Dùng `abstract class` chứ không `interface` + `Symbol` token: NestJS lấy chính class làm token DI,
nên không phải khai thêm hằng số và không phải `@Inject(TOKEN)` ở mỗi constructor.

### 2. Hai adapter — seam thật, không phải giả thuyết

```ts
/** Adapter thật: đọc đồng hồ hệ thống. */
export class SystemClock extends Clock {
  now(): Date { return new Date(); }
}

/** Adapter test: luôn trả về một mốc cố định. */
export class FixedClock extends Clock {
  constructor(private readonly instant: Date) { super(); }
  now(): Date { return this.instant; }
}
```

Đăng ký ở `app.module.ts` như một provider `@Global` (hoặc trong một `ClockModule` global, cùng khuôn
với `PrismaModule`):

```ts
{ provide: Clock, useClass: SystemClock }
```

Luật "một adapter là seam giả thuyết, hai adapter là seam thật" được thoả: `SystemClock` chạy thật,
`FixedClock` chạy trong test.

### 3. Service bỏ hẳn tham số `now`

```ts
// trước
async listByWeek(weekStart?: string, now: Date = new Date()): Promise<BattleSession[]>
// sau
async listByWeek(weekStart?: string): Promise<BattleSession[]>
```

`now` trở thành `this.clock.now()`, đọc **một lần ở đầu method** và truyền xuống các hàm thuần bên
trong. Đây là điểm mấu chốt: một method = một mốc thời gian, và mốc đó đi hết đường gọi.

Riêng `attendance.mark` gọi sang `battleSessions.findById` — sau spec này cả hai service dùng chung
một `Clock` qua DI, nhưng vẫn là **hai lần đọc**. Sửa nốt bằng cách bỏ luôn phép tính lại ở `:108`:
dùng cờ `session.isDeadlinePassed` mà `findById` đã dựng, thay vì `isDeadlinePassed(new Date(...))`.
Sau đó `attendance.service.ts` không còn import `isDeadlinePassed` nữa.

### 4. Hàm thuần trong `session-schedule.ts` giữ tham số, nhưng bỏ default

```ts
// trước
export function getActiveWeek(now: Date = new Date()): Week
// sau
export function getActiveWeek(now: Date): Week
```

Chúng là hàm thuần, tất định, và phải ở lại như vậy — chúng không được biết `Clock` tồn tại. Bỏ
`= new Date()` để caller **buộc** phải nói rõ đang tính ở mốc nào; quên truyền là lỗi biên dịch chứ
không phải một đồng hồ mới lặng lẽ xuất hiện.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `src/common/clock/clock.ts` (mới) | `Clock`, `SystemClock`, `FixedClock` |
| `src/common/clock/index.ts` (mới) | re-export |
| `src/common/index.ts` | thêm re-export cụm `clock` |
| `src/app.module.ts` | provider `{ provide: Clock, useClass: SystemClock }`, global |
| `battle-sessions.service.ts` | inject `Clock`; bỏ `now` khỏi 7 chữ ký; mỗi method mở đầu bằng `const now = this.clock.now();` |
| `attendance.service.ts` | như trên cho `:53`, `:86`; bỏ phép tính lại ở `:108`, đọc `session.isDeadlinePassed` |
| `team-builder.service.ts` | như trên cho `:67`, `:113`, `:174` |
| `session-schedule.ts` | bỏ `= new Date()` ở `:79`, `:100`, `:160` |
| Các file `__tests__/*.spec.ts` | dựng service với `new FixedClock(new Date('...'))` thay vì truyền `now` ở mỗi lời gọi |

`common/` không được import từ `modules/` (`architecture.md` §3.2) — `Clock` không import gì từ
`modules/`, nên luật giữ nguyên, không cần đụng `eslint.config.mjs`.

## Edge case

- **Một request chạm hai service.** `POST /attendance` đi qua `AttendanceService` rồi
  `BattleSessionsService`. Cả hai nhận cùng instance `Clock` (provider singleton), nhưng gọi `now()`
  hai lần nên vẫn lệch vài mili giây. Điều đó **chấp nhận được** sau khi §3 bỏ phép tính lại: chỉ còn
  một chỗ đánh giá luật quá hạn. Không dựng `RequestClock` scope-request — nó kéo theo scope DI lan
  ra cả cây provider, giá đắt hơn lợi ích.
- **`prisma/seed.ts` và `prisma/fix-deadlines.ts`** gọi thẳng hàm trong `session-schedule.ts`, không
  qua DI. Chúng phải truyền `new Date()` tường minh sau khi bỏ default — đó là điều mong muốn: script
  một lần thì nói rõ mốc của nó.
- **Test hiện có truyền `now` ở call site.** Chuyển sang `FixedClock` là sửa test hàng loạt; hành vi
  không đổi nên giá trị mốc giữ nguyên từng file.

## Kiểm thử

- Sáu file spec hiện có là lưới an toàn: chạy trước, chuyển sang `FixedClock`, chạy lại. Kỳ vọng
  **không assertion nào phải đổi giá trị** — chỉ đổi cách bơm thời gian.
- Thêm một test mới, thứ hiện **không** test được: `mark()` trên một trận vừa qua hạn phải trả
  `ConflictException` và cờ `isDeadlinePassed` của cùng trận đó phải là `true` — cùng một mốc, không
  còn hai đồng hồ.
- Thêm test cho `SystemClock.now()` trả về `Date` gần `Date.now()` (một dòng, chống việc ai đó trả
  hằng số nhầm).

## Rủi ro

- **Diff rộng, hành vi không đổi.** Đây là refactor cơ học chạm ~10 file. Làm từng service một, chạy
  `pnpm --filter api test` sau mỗi service; không đổi cả ba rồi mới chạy.
- **Quên một chỗ `new Date()` còn sót** trong service sẽ tái lập đúng vấn đề cũ mà test vẫn xanh.
  Sau khi xong, `grep -rn "new Date()" src/modules` phải trả về **rỗng** — coi đó là điều kiện hoàn
  thành.

## Ngoài phạm vi

- `Clock` scope-request (đã loại ở Edge case).
- Đưa `Clock` sang `packages/shared` — frontend có bài toán thời gian khác (`use-deadline-refresh`),
  và chưa có nhu cầu dùng chung một interface.
