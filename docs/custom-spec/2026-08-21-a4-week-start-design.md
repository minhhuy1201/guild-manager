# A4 — `weekStart` thành một mốc tuần có kiểu, không còn là string trần

> **Đã hiện thực** (`6d04d71` → `9b0a9a2`). Rà soát lại 2026-08-23 tìm thấy **hai lỗi thật**:
> (1) §1 để `parseWeekStart` ném `BadRequestException` ngay trong `session-schedule.ts` — file phải
> thuần và không biết framework; sau khi §4 có DTO Zod thì nhánh ném đó không còn với tới được từ
> HTTP, nên ca test `?weekStart=xyz` nằm sai tầng — **đã sửa 2026-08-23**, §1 bên dưới là bản sau khi
> sửa; (2) §4 dùng `z.iso.datetime()`, mà Zod v4 mặc định
> `offset: false` nên **loại chính ca test `+07:00`** của spec — phải là `z.iso.datetime({ offset: true })`.
> Thêm một điểm nhỏ: §3 đặt tên `getActiveWeek` đụng hàm thuần cùng tên trong `session-schedule.ts`.
> Chi tiết:
> [§ Rà soát lại A1–A6](./2026-08-21-architecture-review-2-overview.md#rà-soát-lại-a1a6-2026-08-23).

Ngày: 2026-08-21 · Phạm vi: `apps/api`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Nên làm **sau** [A2](./2026-08-21-a2-clock-module-design.md) (chữ ký service đã sạch `now`) và
**trước** [A1](./2026-08-21-a1-schedule-read-seam-design.md) (hai hàm public mới của A1 nhận mốc
tuần — nên biết kiểu của nó trước khi đặt chữ ký).

Gói bốn thứ người gọi đang phải tự nhớ về `weekStart` vào một module trong `session-schedule.ts`.

## Bối cảnh

`weekStart` đi vào hệ thống qua query string, **không qua DTO**:

```ts
// battle-sessions.controller.ts:45
list(@Query('weekStart') weekStart?: string): Promise<BattleSession[]> {
  return this.battleSessions.listByWeek(weekStart);
}
// team-builder.controller.ts:41-45  — y hệt
getFormations(@Query('weekStart') weekStart?: string): Promise<SessionFormation[]>
```

Mọi request/response shape khác đều đi qua Zod (`architecture.md` §3.3, `CLAUDE.md` của repo:
*"Validate at boundaries"*). Hai query param này là ngoại lệ, và trả giá ở ba chỗ:

**1. Input hỏng thành 500, không phải 400.**

```ts
// battle-sessions.service.ts:88-90
const target = weekStart ? new Date(weekStart) : getActiveWeek(now).weekStart;
// :96  where: { weekStart: target }
```

`?weekStart=xyz` cho `Invalid Date`, đi thẳng vào Prisma. Cùng đường đi ở
`team-builder.service.ts:124` (`where: { weekStart: new Date(targetWeekStart) }`).

**2. Input lệch ngày thành mảng rỗng im lặng.** `?weekStart=2026-07-22T00:00:00Z` là Thứ 4, không
phải mốc tuần. Không hàng nào khớp → `[]`. Client không phân biệt được "tuần rỗng" với "không phải
một tuần".

**3. Tuần được so sánh bằng chuỗi.**

```ts
// battle-sessions.service.ts:56-58
getActiveWeekStart(now: Date = new Date()): string {
  return getActiveWeek(now).weekStart.toISOString();
}
// attendance.service.ts:102-103
const inActiveWeek = session?.weekStart === this.battleSessions.getActiveWeekStart(now);
// team-builder.service.ts:119
if (targetWeekStart === activeWeekStart) { … }
```

`session-schedule.ts` làm việc bằng `Date`, service phơi ra `string`, nên so tuần thành so chuỗi.
Nó đúng — nhưng đúng **vì tình cờ** cả hai vế cùng đi qua `toISOString()`. Một vế nào đó đổi sang
`toJSON()`, hoặc client gửi `2026-07-20T00:00:00.000+07:00` (cùng mốc, khác chuỗi), là sai lặng.

Bốn thứ người gọi phải nhớ cho một tham số: là ISO, là Thứ 2, là 00:00 giờ VN, và so bằng chuỗi chứ
không bằng `getTime()`.

## Quyết định thiết kế

### 1. `parseWeekStart` sống trong `session-schedule.ts`

`architecture.md` §7: *"A change to the week or deadline rules → `session-schedule.ts` and its
`__tests__` — nowhere else."* "Một chuỗi thế nào thì là một tuần" là luật tuần, nên nó thuộc file
này, không phải một `lib/` mới.

```ts
/** Mốc Thứ 2 00:00 giờ VN của một tuần điểm danh. Chỉ dựng được qua parseWeekStart/weekStartOf. */
export type WeekAnchor = Date & { readonly __weekAnchor: unique symbol };

/**
 * Đọc một mốc tuần từ query string.
 * @param input - Chuỗi ISO client gửi lên; bỏ trống = tuần đang mở
 * @param now - Thời điểm hiện tại, dùng khi input bỏ trống
 * @returns Mốc Thứ 2 00:00 giờ VN
 * @throws RangeError khi chuỗi không phải một mốc thời gian hợp lệ
 */
export function parseWeekStart(input: string | undefined, now: Date): WeekAnchor;

/** Hai mốc tuần có cùng chỉ một tuần không. */
export function isSameWeek(a: WeekAnchor, b: WeekAnchor): boolean;
```

Ba quyết định nằm trong đó:

- **Chuỗi hỏng → `RangeError`**, thay vì để `Invalid Date` rơi xuống Prisma. Câu tiếng Việt cho người
  dùng (`'Tuần không hợp lệ.'`) là việc của tầng biên ở §4: `weekStartQuerySchema` chặn chuỗi hỏng
  trước khi nó tới được đây, nên tới tầng này thì đó là **lỗi lập trình** — một caller trong process
  gọi sai hợp đồng. Vì vậy `session-schedule.ts` không import `@nestjs/common`: file giữ thuần, và
  `AllExceptionsFilter` biến `RangeError` thành 500 kèm stack trong log, đúng loại lỗi đó.
- **Chuỗi hợp lệ nhưng lệch ngày → quy về `weekStartOf(date)`**, không ném. Client gửi giữa tuần thì
  ý định rõ ràng là "tuần chứa ngày này"; ném ở đây chỉ tạo lỗi cho một thao tác vô hại. Đây là chỗ
  duy nhất trong spec chọn khoan dung, và lý do là **nó không âm thầm trả sai** — nó trả đúng tuần
  chứa mốc đó.
- **Bỏ trống → tuần đang mở**, gộp luôn nhánh mặc định đang nằm rải ở `battle-sessions.service.ts:88`
  và `team-builder.service.ts:116`.

### 2. Kiểu nhánh (`branded type`) thay vì `Date` trần

`WeekAnchor` là `Date` có nhãn. Chi phí: một dòng type. Lợi: `listByWeek(someDate)` với một `Date`
bất kỳ trở thành lỗi biên dịch, nên không ai lỡ truyền `dateTime` của một trận vào chỗ đợi mốc tuần
— đúng lớp lỗi mà `?weekStart=<Thứ 4>` đang gây ra, chỉ khác là bắt được lúc biên dịch.

`weekStartOf()` đổi kiểu trả về thành `WeekAnchor`; đó là chỗ duy nhất dựng được giá trị này ngoài
`parseWeekStart`.

### 3. `getActiveWeekStart(): string` đổi thành `getActiveWeek(): WeekAnchor`

Việc phơi ISO string ra khỏi service là nguồn của phép so chuỗi. Sau spec, hai call site so bằng
`isSameWeek(...)`; `toISOString()` chỉ còn xuất hiện ở nơi dựng response.

### 4. Controller nhận qua DTO Zod

```ts
// packages/shared/schemas/battle-session.schema.ts
export const weekStartQuerySchema = z.object({ weekStart: z.iso.datetime().optional() });
```

```ts
// battle-sessions.controller.ts
list(@Query() query: WeekStartQueryDto): Promise<BattleSession[]> {
  return this.battleSessions.listByWeek(query.weekStart);
}
```

Schema ở `packages/shared` theo luật *"A request/response shape, an enum, a validation rule →
`packages/shared`"*; DTO dựng bằng `createZodDto` như mọi DTO khác. Zod bắt được "không phải chuỗi
ISO"; `parseWeekStart` bắt phần còn lại (mốc hợp lệ nhưng cần quy về Thứ 2). Hai tầng, hai việc khác
nhau — không trùng.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `session-schedule.ts` | thêm `WeekAnchor`, `parseWeekStart`, `isSameWeek`; `weekStartOf` đổi kiểu trả về |
| `battle-sessions.public.ts` | re-export ba thứ trên |
| `packages/shared/schemas/battle-session.schema.ts` | thêm `weekStartQuerySchema` |
| `battle-sessions/dto/battle-session.dto.ts` | thêm `WeekStartQueryDto` |
| `battle-sessions.controller.ts:45` | `@Query() query: WeekStartQueryDto` |
| `team-builder.controller.ts:41` | như trên |
| `battle-sessions.service.ts:56-58, 88-90` | bỏ `getActiveWeekStart(): string`; dùng `parseWeekStart` |
| `team-builder.service.ts:115-124` | như trên; `where: { weekStart: anchor }`, bỏ `new Date(...)` |
| `attendance.service.ts:102-103` | `isSameWeek(session.weekStartAnchor, activeWeek)` |

`attendance.service.ts` là chỗ cần chú ý: `session` ở đó là **entity đã dựng** (`weekStart` là ISO
string), không phải hàng Prisma. Sau [A1](./2026-08-21-a1-schedule-read-seam-design.md) thì
`findById` trả về entity — nên hoặc so bằng chuỗi ở đúng một chỗ có comment, hoặc `findById` trả
kèm mốc tuần. Chọn cách thứ hai khi làm A1; trước đó giữ nguyên phép so chuỗi và ghi `// TODO(A1)`.

## Edge case

- **`weekStart` bằng chuỗi rỗng** (`?weekStart=`) — Zod `.optional()` không bắt chuỗi rỗng. Thêm
  `.min(1)` hoặc `z.preprocess` đổi `''` thành `undefined`; chọn cái sau để `?weekStart=` cư xử
  giống bỏ trống, không thành 400 cho một thứ vô hại.
- **Mốc rơi vào Chủ nhật.** `weekStartOf` theo ISO đã xử lý (xem
  [C3](./2026-08-18-c3-vn-clock-design.md) §2); `parseWeekStart` chỉ gọi lại, không tự tính.
- **Tuần rất xa quá khứ/tương lai** vẫn hợp lệ và trả `[]`. Không chặn — `getEditableWeeks` mới là
  nơi chặn ghi, còn đọc thì tuần cũ đọc được là đúng ý (`team-builder.getWeeks` liệt kê tuần cũ).
- **`WeekAnchor` đi qua JSON.** Nhãn chỉ tồn tại lúc biên dịch; `toISOString()` vẫn cho đúng chuỗi
  cũ. Không có thay đổi nào ở dây trên mạng.

## Kiểm thử

- `session-schedule.spec.ts`: `parseWeekStart` với chuỗi rỗng, `'xyz'`, một Thứ 4, một Chủ nhật,
  một mốc `+07:00` và cùng mốc đó dạng `Z` (phải cho cùng kết quả — đây là ca mà phép so chuỗi cũ
  sai).
- `week-start-query.spec.ts`: `?weekStart=xyz` → 400 với câu `'Tuần không hợp lệ.'`. Đây là tầng duy
  nhất quyết định status code, nên ca test đó ở đây chứ không ở service.
- `battle-sessions.service.spec.ts` / `team-builder.service.spec.ts`: chuỗi hỏng thì ném ngay
  (`RangeError`), **không** rơi xuống Prisma hay module lịch.
- `team-builder.service.spec.ts`: `getFormations('<một Thứ 4>')` trả về đúng dữ liệu của tuần chứa
  ngày đó, không phải `[]`.

## Rủi ro

- **Đổi kiểu trả về của `weekStartOf` lan ra nhiều call site.** Đây là cái giá của branded type;
  TypeScript sẽ chỉ ra từng chỗ, nên rủi ro là mất thời gian chứ không phải sai lặng.
- **Hành vi đổi có chủ ý ở một chỗ**: `?weekStart=<giữa tuần>` từ chỗ trả `[]` thành trả dữ liệu
  của tuần đó. Frontend hiện luôn gửi mốc Thứ 2 nên không ảnh hưởng, nhưng phải ghi vào commit
  message theo luật *"Tests describe behavior… the message says why"*.

## Ngoài phạm vi

- Đưa `WeekAnchor` sang `packages/shared` để frontend cũng dùng — frontend không tự dựng mốc tuần,
  nó nhận từ API. Chưa có nhu cầu.
- Chuẩn hoá mọi query param khác sang DTO — chỉ hai chỗ này đang trần.
