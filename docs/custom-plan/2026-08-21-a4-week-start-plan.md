# A4 — `weekStart` thành một mốc tuần có kiểu · Kế hoạch triển khai

> **Cho người/agent thực thi:** chạy tuần tự từng task, dùng cú pháp checkbox (`- [ ]`). Mỗi task tự
> kiểm tra và tự commit; không gộp commit của hai task.

**Mục tiêu:** một tham số `weekStart` chỉ còn **một** đường vào hệ thống — Zod bắt "không phải chuỗi
ISO", `parseWeekStart` quy về Thứ 2 00:00 giờ VN và trả về `WeekAnchor`. Không còn `Invalid Date` rơi
xuống Prisma, không còn so tuần bằng chuỗi (trừ đúng một chỗ có `TODO(A1)`).

**Kiến trúc:** `session-schedule.ts` sở hữu luật tuần, nên nó sở hữu luôn "một chuỗi thế nào thì là
một tuần". Nó phơi ra một branded type `WeekAnchor` (`Date` có nhãn lúc biên dịch), một hàm dựng
`parseWeekStart` và một phép so `isSameWeek`. Service không phơi ISO string của tuần ra ngoài nữa;
`toISOString()` chỉ còn ở nơi dựng response.

**Tech stack:** NestJS 11, Zod 4 (`z.iso.datetime`), `nestjs-zod` `createZodDto`, Jest.

**Spec:** [`docs/custom-spec/2026-08-21-a4-week-start-design.md`](../custom-spec/2026-08-21-a4-week-start-design.md)
· nối tiếp [A2](./2026-08-21-a3-response-codec-plan.md) (đồng hồ đã là `Clock`, codec đã tách) và đi
**trước** A1.

**Phạm vi:** `apps/api` + một schema mới ở `packages/shared`. `apps/web` **không đổi một dòng nào** —
shape trên dây giữ nguyên tuyệt đối, `WeekAnchor` là nhãn lúc biên dịch.

## Ba điểm spec để mở, kế hoạch chốt lại

1. **DTO dựng riêng trong từng module.** Spec viết `team-builder.controller.ts` "như trên" nhưng
   không nói lấy DTO ở đâu. `team-builder` không được import `battle-sessions/dto/…` (luật ranh giới
   module), và đưa một DTO class vào `battle-sessions.public.ts` là phơi chi tiết HTTP của module này
   ra module khác. Nên: **schema ở `packages/shared` là chỗ duy nhất khai báo shape**, mỗi module tự
   bọc `createZodDto` một dòng. Không có shape nào bị khai báo hai lần.
2. **`z.iso.datetime({ offset: true })`, không phải `z.iso.datetime()`.** Mặc định Zod 4 **từ chối**
   `+07:00` và chỉ nhận `Z`. Spec lại yêu cầu `+07:00` và `Z` cho cùng kết quả (mục Kiểm thử), nên
   phải bật `offset`. Đã kiểm chứng bằng Zod 4.4 trước khi viết kế hoạch này.
3. **Thông báo lỗi nằm ở `packages/shared`** dưới dạng hằng `INVALID_WEEK_MESSAGE`, đúng cách
   `DEADLINE_CAP_MESSAGE` đang làm — Zod (tầng 1) và `parseWeekStart` (tầng 2) nói cùng một câu.
   *(Cập nhật 2026-08-23: `parseWeekStart` không còn nói câu nào — nó ném `RangeError`, xem Task 3.
   Hằng vẫn ở `packages/shared` vì nó đi cùng luật validation, nhưng nay có đúng một người đọc là
   `weekStartQuerySchema`. Quyền sở hữu ghi ở [spec A4 §4](../custom-spec/2026-08-21-a4-week-start-design.md).)*

## Global Constraints

- **Không commit lên GitHub.** Commit local trên nhánh `refactor/a4-week-anchor`. Không `git push`,
  không mở PR.
- **Không commit trên `main`.** Kiểm tra bằng `git rev-parse --abbrev-ref HEAD` trước mỗi commit.
- Commit message tiếng Anh, Conventional Commits, không dòng attribution ở cuối.
- **Một hành vi đổi có chủ ý, phải ghi vào commit message của Task 5**: `?weekStart=<giữa tuần>` từ
  chỗ trả `[]` thành trả dữ liệu của tuần chứa ngày đó. Mọi thứ khác là refactor giữ nguyên hành vi.
- **`apps/api` không có path alias** — import nội bộ là đường dẫn tương đối, shared là
  `@guild/shared/schemas` · `@guild/shared/lib` · `@guild/shared/enums`.
- **Module khác chỉ import qua `<domain>.public.ts`.** `WeekAnchor`, `parseWeekStart`, `isSameWeek`
  phải được re-export ở `battle-sessions.public.ts` trước khi `team-builder` dùng.
- **Không `forwardRef()`.**
- **Doc comment tiếng Anh cho mọi hàm mới** theo `~/.claude/CLAUDE.md`; văn xuôi hiện có trong repo
  đang là tiếng Việt — khi **chuyển chỗ** một comment thì bê nguyên văn, không dịch lại. (Kế hoạch
  này viết comment tiếng Việt cho khớp file xung quanh; giữ nguyên như đã viết.)
- **Text người dùng thấy là tiếng Việt**: `'Tuần không hợp lệ.'`
- **Sửa `packages/shared` thì phải build lại** trước khi API chạy được lúc runtime:
  `pnpm --filter @guild/shared build`.
- Lệnh kiểm tra dùng suốt kế hoạch:
  - `pnpm --filter api typecheck` · `pnpm --filter api lint` · `pnpm --filter api test`
  - chạy một file: `pnpm --filter api test -- <tên file>`

## Bản đồ file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/src/modules/battle-sessions/dto/week-start-query.dto.ts` | `WeekStartQueryDto` cho `GET /battle-sessions` |
| `apps/api/src/modules/team-builder/dto/week-start-query.dto.ts` | `WeekStartQueryDto` cho `GET /team-builder/formations` |
| `apps/api/src/modules/battle-sessions/__tests__/week-start-query.spec.ts` | hành vi của `weekStartQuerySchema` (rỗng, `Z`, `+07:00`, rác) |

**Sửa**

| File | Việc |
|---|---|
| `packages/shared/schemas/battle-session.schema.ts` | thêm `INVALID_WEEK_MESSAGE`, `weekStartQuerySchema`, `WeekStartQuery` |
| `apps/api/.../battle-sessions/session-schedule.ts` | thêm `WeekAnchor`, `isSameWeek`, `parseWeekStart`; `weekStartOf` và `ScheduledWeek.weekStart` đổi kiểu |
| `apps/api/.../battle-sessions/battle-sessions.public.ts` | re-export `WeekAnchor`, `parseWeekStart`, `isSameWeek`, `weekStartOf` |
| `apps/api/.../battle-sessions/battle-sessions.controller.ts` | `@Query() query: WeekStartQueryDto` |
| `apps/api/.../battle-sessions/battle-sessions.service.ts` | `getActiveWeekStart(): string` → `getActiveWeek(): WeekAnchor`; `listByWeek` dùng `parseWeekStart`; `ensureWeekMaterialized`/`readWeekSessions`/`listWeekAnchors` nói `WeekAnchor` |
| `apps/api/.../team-builder/team-builder.controller.ts` | `@Query() query: WeekStartQueryDto` |
| `apps/api/.../team-builder/team-builder.service.ts` | `getFormations` dùng `parseWeekStart`; `getWeeks` dùng `isSameWeek` |
| `apps/api/.../attendance/attendance.service.ts` | `getActiveWeek().toISOString()` + `// TODO(A1)` |
| `apps/api/.../battle-sessions/__tests__/session-schedule.spec.ts` | test `isSameWeek`, `parseWeekStart` |
| `apps/api/.../battle-sessions/__tests__/battle-sessions.service.spec.ts` | test chuỗi hỏng → 400, mốc giữa tuần → quy về Thứ 2 |
| `apps/api/.../team-builder/__tests__/team-builder.service.spec.ts` | mock `getActiveWeek`; test `getFormations('<Thứ 4>')` |
| `apps/api/.../attendance/__tests__/attendance.service.spec.ts` | mock `getActiveWeek` |
| `apps/api/docs/backend.md` | §11: query param cũng đi qua DTO |

---

### Task 0: Nhánh làm việc

- [ ] **Bước 1: Kiểm tra nhánh và working tree**

```bash
cd /home/huykirito1201/personal/guild-manager
git rev-parse --abbrev-ref HEAD
git status --short
```

Kết quả mong đợi: đang ở `main`, working tree sạch. Nếu bẩn: dừng, hỏi người dùng.

- [ ] **Bước 2: Tạo nhánh**

```bash
git switch -c refactor/a4-week-anchor
git rev-parse --abbrev-ref HEAD
```

Kết quả mong đợi: `refactor/a4-week-anchor`.

- [ ] **Bước 3: Chốt điểm xuất phát xanh**

```bash
pnpm --filter api test
```

Kết quả mong đợi: toàn bộ suite PASS. Nếu đỏ ngay từ đầu: dừng, báo người dùng — kế hoạch này giả
định nền xanh.

---

### Task 1: `WeekAnchor` — mốc tuần có nhãn

Branded type + phép so. Chưa có gì đổi hành vi: `WeekAnchor` gán được vào `Date`, nên mọi call site
hiện tại vẫn biên dịch.

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.public.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Interfaces:**
- Produces:
  - `type WeekAnchor = Date & { readonly __weekAnchor: unique symbol }`
  - `weekStartOf(dateTime: Date): WeekAnchor` (đổi kiểu trả về, thân giữ nguyên)
  - `isSameWeek(a: WeekAnchor, b: WeekAnchor): boolean`
  - `ScheduledWeek.weekStart: WeekAnchor` (đổi kiểu field)

- [ ] **Bước 1: Viết test đỏ**

Thêm vào cuối `session-schedule.spec.ts`, và thêm `isSameWeek` vào khối `import` ở đầu file:

```ts
describe('isSameWeek', () => {
  it('cùng mốc thì cùng tuần', () => {
    expect(
      isSameWeek(weekStartOf(vn('2026-07-20T00:00')), weekStartOf(wednesday)),
    ).toBe(true);
  });

  it('hai tuần kề nhau thì khác tuần', () => {
    expect(
      isSameWeek(weekStartOf(wednesday), weekStartOf(vn('2026-07-27T09:00'))),
    ).toBe(false);
  });

  it('cùng mốc viết bằng hai múi giờ khác nhau vẫn cùng tuần', () => {
    // Đây là ca mà phép so chuỗi cũ sai: cùng thời điểm, hai chuỗi khác nhau.
    const asOffset = weekStartOf(new Date('2026-07-20T00:00:00+07:00'));
    const asUtc = weekStartOf(new Date('2026-07-19T17:00:00.000Z'));

    expect(isSameWeek(asOffset, asUtc)).toBe(true);
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- session-schedule
```

Kết quả mong đợi: FAIL — `isSameWeek` không tồn tại (lỗi biên dịch của ts-jest).

- [ ] **Bước 3: Thêm kiểu và hàm**

Trong `session-schedule.ts`, đặt khối này ngay **trên** `export interface ScheduledWeek`:

```ts
/**
 * Mốc Thứ 2 00:00 giờ VN của một tuần điểm danh.
 *
 * Nhãn `__weekAnchor` chỉ tồn tại lúc biên dịch: một `Date` bất kỳ không gán được
 * vào đây, nên không ai lỡ truyền giờ đánh của một trận vào chỗ đợi mốc tuần.
 * Chỉ dựng được qua `weekStartOf` hoặc `parseWeekStart`.
 */
export type WeekAnchor = Date & { readonly __weekAnchor: unique symbol };
```

Đổi `ScheduledWeek.weekStart` và ba hàm dựng:

```ts
export interface ScheduledWeek {
  /** Thứ 2 00:00 — cũng là khóa gom trận theo tuần trong database. */
  weekStart: WeekAnchor;
  /** Thứ 7 23:59 — mốc cuối để hiển thị timeline. */
  weekEnd: Date;
}

export function weekStartOf(dateTime: Date): WeekAnchor {
  return shiftVnDate(dateTime, -(vnWeekday(dateTime) - MONDAY), 0, 0) as WeekAnchor;
}

/**
 * Dựng một tuần điểm danh từ mốc Thứ 2 của nó.
 * @param weekStart - Thứ 2 00:00 giờ VN
 * @returns Tuần kèm mốc cuối Thứ 7 23:59
 */
function toWeek(weekStart: WeekAnchor): ScheduledWeek {
  return { weekStart, weekEnd: weekEndOf(weekStart) };
}
```

`getActiveWeek` và `getEditableWeeks` dựng mốc bằng `shiftVnDate` nên phải đi qua hàm dựng hợp lệ —
`weekStartOf` là hàm đồng nhất trên một mốc đã là Thứ 2 00:00, nên bọc thêm không đổi giá trị:

```ts
  // Thứ 7 mở tuần + 2 ngày = Thứ 2 đầu tuần mới.
  return toWeek(weekStartOf(shiftVnDate(anchorOpen, 2, 0, 0)));
```

```ts
export function getEditableWeeks(now: Date): ScheduledWeek[] {
  const active = getActiveWeek(now);

  return [active, toWeek(weekStartOf(shiftVnDate(active.weekStart, 7, 0, 0)))];
}
```

Thêm `isSameWeek` ngay dưới `weekStartOf`:

```ts
/**
 * Hai mốc tuần có chỉ cùng một tuần không.
 * So bằng thời điểm chứ không bằng chuỗi: cùng một mốc viết ở hai múi giờ khác
 * nhau vẫn phải cho `true`.
 * @param a - Mốc tuần thứ nhất
 * @param b - Mốc tuần thứ hai
 * @returns true nếu hai mốc trỏ cùng một tuần
 */
export function isSameWeek(a: WeekAnchor, b: WeekAnchor): boolean {
  return a.getTime() === b.getTime();
}
```

- [ ] **Bước 4: Re-export ở seam**

Trong `battle-sessions.public.ts`, đổi dòng cuối thành:

```ts
export {
  formatSessionLabel,
  isSameWeek,
  weekEndOf,
  weekStartOf,
} from './session-schedule';
export type { WeekAnchor } from './session-schedule';
```

- [ ] **Bước 5: Chạy test và typecheck**

```bash
pnpm --filter api test -- session-schedule
pnpm --filter api typecheck
```

Kết quả mong đợi: PASS, typecheck sạch. Nếu typecheck báo ở call site nào đó rằng `Date` không gán
được vào `WeekAnchor` — đó là một chỗ đang **dựng** mốc tuần bằng tay; sửa nó thành `weekStartOf(…)`,
không ép kiểu tại chỗ.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/battle-sessions
git commit -m "refactor(api): brand the week anchor type in session-schedule"
```

---

### Task 2: `weekStartQuerySchema` ở `packages/shared`

**Files:**
- Modify: `packages/shared/schemas/battle-session.schema.ts`

**Interfaces:**
- Produces:
  - `INVALID_WEEK_MESSAGE: string` — `'Tuần không hợp lệ.'`
  - `weekStartQuerySchema` — object `{ weekStart?: string }`, chuỗi rỗng coi như bỏ trống
  - `type WeekStartQuery = z.infer<typeof weekStartQuerySchema>`

- [ ] **Bước 1: Thêm schema**

Đặt ngay dưới hằng `DEADLINE_CAP_MESSAGE` (hai hằng thông báo nằm cạnh nhau):

```ts
/**
 * Thông báo khi mốc tuần trên query string không đọc được.
 *
 * Người đọc duy nhất là `weekStartQuerySchema` ngay dưới đây — tầng duy nhất
 * dựng câu tiếng Việt và status 400 cho `?weekStart=`. Vẫn tách thành hằng để
 * web import được khi cần hiện lại đúng câu chữ, giống `DEADLINE_CAP_MESSAGE`.
 */
export const INVALID_WEEK_MESSAGE = "Tuần không hợp lệ.";

/**
 * Query string của các endpoint đọc theo tuần (`?weekStart=`).
 *
 * `offset: true` vì client hợp lệ được gửi `+07:00` chứ không chỉ `Z`.
 * `preprocess` đổi chuỗi rỗng thành `undefined`: `?weekStart=` là một thứ vô hại,
 * nó phải cư xử như bỏ trống chứ không thành 400.
 *
 * Zod chỉ trả lời "có phải một mốc thời gian không"; "mốc đó thuộc tuần nào" là
 * luật tuần, do `parseWeekStart` ở apps/api quyết định.
 */
export const weekStartQuerySchema = z.object({
  weekStart: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.iso.datetime({ offset: true, error: INVALID_WEEK_MESSAGE }).optional()
  ),
});

/** Kiểu query string đọc theo tuần đã validate. */
export type WeekStartQuery = z.infer<typeof weekStartQuerySchema>;
```

- [ ] **Bước 2: Build shared**

```bash
pnpm --filter @guild/shared build
```

Kết quả mong đợi: không lỗi. (`apps/api` chạy runtime bằng `dist` của shared — bỏ bước này là lỗi
"không tìm thấy export" lúc chạy test.)

- [ ] **Bước 3: Kiểm tra nhanh hành vi schema**

```bash
node -e "const {weekStartQuerySchema}=require('./packages/shared/dist/schemas');
for (const q of [{},{weekStart:''},{weekStart:'2026-07-20T00:00:00.000Z'},{weekStart:'2026-07-20T00:00:00+07:00'},{weekStart:'xyz'}]) {
  const r = weekStartQuerySchema.safeParse(q);
  console.log(JSON.stringify(q), r.success ? 'OK '+JSON.stringify(r.data) : 'ERR '+r.error.issues[0].message);
}"
```

Kết quả mong đợi:

```
{} OK {}
{"weekStart":""} OK {}
{"weekStart":"2026-07-20T00:00:00.000Z"} OK {"weekStart":"2026-07-20T00:00:00.000Z"}
{"weekStart":"2026-07-20T00:00:00+07:00"} OK {"weekStart":"2026-07-20T00:00:00+07:00"}
{"weekStart":"xyz"} ERR Tuần không hợp lệ.
```

- [ ] **Bước 4: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add packages/shared/schemas/battle-session.schema.ts
git commit -m "feat(shared): add the weekStart query schema"
```

---

### Task 3: `parseWeekStart`

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.public.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Interfaces:**
- Consumes: `WeekAnchor`, `weekStartOf`, `getActiveWeek` (Task 1)
- Produces: `parseWeekStart(input: string | undefined, now: Date): WeekAnchor`

> **Cập nhật 2026-08-23:** chuỗi hỏng ném `RangeError` chứ không phải `BadRequestException` —
> `session-schedule.ts` phải thuần, và `weekStartQuerySchema` (Task 2) mới là tầng dựng câu tiếng
> Việt và status 400. Task này vì vậy **không** consume `INVALID_WEEK_MESSAGE`.

- [ ] **Bước 1: Viết test đỏ**

Thêm `parseWeekStart` vào khối `import` của spec, rồi thêm khối này:

```ts
describe('parseWeekStart', () => {
  it('bỏ trống thì lấy tuần đang mở', () => {
    expect(parseWeekStart(undefined, wednesday).toISOString()).toBe(
      vn('2026-07-20T00:00').toISOString(),
    );
  });

  // Chuỗi hỏng là lỗi lập trình, không phải lỗi người dùng: `weekStartQuerySchema`
  // chặn nó ở biên HTTP (week-start-query.spec.ts), nên tầng này chỉ ném lỗi
  // thuần chứ không dựng response 400.
  it('chuỗi không phải mốc thời gian thì ném RangeError', () => {
    expect(() => parseWeekStart('xyz', wednesday)).toThrow(RangeError);
  });

  it('mốc giữa tuần quy về Thứ 2 của tuần chứa nó', () => {
    expect(
      parseWeekStart(vn('2026-07-22T12:00').toISOString(), wednesday).toISOString(),
    ).toBe(vn('2026-07-20T00:00').toISOString());
  });

  it('Chủ nhật vẫn thuộc tuần bắt đầu từ Thứ 2 trước đó', () => {
    expect(
      parseWeekStart(vn('2026-07-26T23:00').toISOString(), wednesday).toISOString(),
    ).toBe(vn('2026-07-20T00:00').toISOString());
  });

  it('cùng một mốc gửi bằng +07:00 và bằng Z cho cùng kết quả', () => {
    const asOffset = parseWeekStart('2026-07-20T00:00:00+07:00', wednesday);
    const asUtc = parseWeekStart('2026-07-19T17:00:00.000Z', wednesday);

    expect(isSameWeek(asOffset, asUtc)).toBe(true);
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- session-schedule
```

Kết quả mong đợi: FAIL — `parseWeekStart` không tồn tại.

- [ ] **Bước 3: Cài đặt**

Không thêm import nào — hàm chỉ dùng thứ đã có trong file.

Thêm hàm ngay dưới `getActiveWeek` (nó dùng `getActiveWeek` nên đứng sau cho dễ đọc):

```ts
/**
 * Đọc một mốc tuần từ query string — chỗ duy nhất biến chuỗi client gửi lên
 * thành mốc tuần.
 *
 * Chuỗi hợp lệ nhưng rơi vào giữa tuần thì quy về Thứ 2 của tuần chứa nó chứ
 * không ném: client gửi giữa tuần thì ý định rõ ràng là "tuần chứa ngày này", và
 * trả đúng tuần đó không hề âm thầm sai.
 * Chuỗi không đọc được là **lỗi lập trình**, không phải lỗi người dùng: biên HTTP
 * đã chặn nó ở `weekStartQuerySchema` trước khi tới đây. Vì vậy hàm ném
 * `RangeError` chứ không phải exception của framework — file này giữ thuần, và
 * `AllExceptionsFilter` biến nó thành 500 kèm stack trong log, đúng loại lỗi đó.
 * @param input - Chuỗi ISO đã qua `weekStartQuerySchema`; bỏ trống = tuần đang mở
 * @param now - Thời điểm hiện tại, dùng khi `input` bỏ trống
 * @returns Mốc Thứ 2 00:00 giờ VN
 * @throws RangeError khi chuỗi không phải một mốc thời gian hợp lệ
 */
export function parseWeekStart(
  input: string | undefined,
  now: Date,
): WeekAnchor {
  if (input === undefined) return getActiveWeek(now).weekStart;

  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`parseWeekStart received a non-ISO string: ${input}`);
  }

  return weekStartOf(parsed);
}
```

- [ ] **Bước 4: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- session-schedule
```

Kết quả mong đợi: PASS toàn bộ file.

- [ ] **Bước 5: Re-export ở seam**

Trong `battle-sessions.public.ts`, thêm `parseWeekStart` vào danh sách export (giữ thứ tự chữ cái):

```ts
export {
  formatSessionLabel,
  isSameWeek,
  parseWeekStart,
  weekEndOf,
  weekStartOf,
} from './session-schedule';
```

- [ ] **Bước 6: Commit**

```bash
pnpm --filter api typecheck
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/battle-sessions
git commit -m "feat(api): parse the weekStart query into a week anchor"
```

---

### Task 4: Controller nhận `weekStart` qua DTO

Sau task này `?weekStart=xyz` trả 400 ngay ở tầng pipe (`ZodValidationPipe` đã bật global ở
`main.ts`), chưa cần đụng vào service.

**Files:**
- Create: `apps/api/src/modules/battle-sessions/dto/week-start-query.dto.ts`
- Create: `apps/api/src/modules/team-builder/dto/week-start-query.dto.ts`
- Create: `apps/api/src/modules/battle-sessions/__tests__/week-start-query.spec.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.controller.ts:45`
- Modify: `apps/api/src/modules/team-builder/team-builder.controller.ts:40-44`

**Interfaces:**
- Consumes: `weekStartQuerySchema` (Task 2)
- Produces: `WeekStartQueryDto` trong mỗi module — instance có field `weekStart?: string`

- [ ] **Bước 1: Viết test đỏ cho schema**

`apps/api/src/modules/battle-sessions/__tests__/week-start-query.spec.ts`:

```ts
import { weekStartQuerySchema } from '@guild/shared/schemas';

describe('weekStartQuerySchema', () => {
  it('không gửi weekStart là hợp lệ', () => {
    expect(weekStartQuerySchema.parse({})).toEqual({});
  });

  it('?weekStart= (chuỗi rỗng) cư xử như bỏ trống', () => {
    expect(weekStartQuerySchema.parse({ weekStart: '' })).toEqual({
      weekStart: undefined,
    });
  });

  it('nhận chuỗi ISO dạng Z', () => {
    const value = '2026-07-20T00:00:00.000Z';

    expect(weekStartQuerySchema.parse({ weekStart: value }).weekStart).toBe(
      value,
    );
  });

  it('nhận chuỗi ISO kèm offset +07:00', () => {
    const value = '2026-07-20T00:00:00+07:00';

    expect(weekStartQuerySchema.parse({ weekStart: value }).weekStart).toBe(
      value,
    );
  });

  it('từ chối chuỗi không phải ISO, thông báo tiếng Việt', () => {
    const result = weekStartQuerySchema.safeParse({ weekStart: 'xyz' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Tuần không hợp lệ.');
  });

  it('từ chối chuỗi chỉ có ngày', () => {
    expect(weekStartQuerySchema.safeParse({ weekStart: '2026-07-20' }).success).toBe(
      false,
    );
  });
});
```

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- week-start-query
```

Kết quả mong đợi: nếu Task 2 chưa build shared thì FAIL vì không import được; nếu đã build thì file
này PASS ngay — schema đã tồn tại. Cả hai đều chấp nhận được: test này là lưới an toàn cho hành vi
schema, không phải để dẫn dắt cài đặt.

- [ ] **Bước 3: Tạo hai DTO**

`apps/api/src/modules/battle-sessions/dto/week-start-query.dto.ts`:

```ts
import { weekStartQuerySchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Query string của `GET /battle-sessions`.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class WeekStartQueryDto extends createZodDto(weekStartQuerySchema) {}
```

`apps/api/src/modules/team-builder/dto/week-start-query.dto.ts` — cùng nội dung, chỉ khác câu đầu doc
comment:

```ts
import { weekStartQuerySchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Query string của `GET /team-builder/formations`.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class WeekStartQueryDto extends createZodDto(weekStartQuerySchema) {}
```

> Hai file một dòng thay vì một DTO dùng chung: `team-builder` không được import
> `battle-sessions/dto/…` (luật ranh giới module), và shape thì vẫn chỉ khai báo một lần ở
> `packages/shared`.

- [ ] **Bước 4: Đổi hai controller**

`battle-sessions.controller.ts` — thêm import và đổi chữ ký:

```ts
import { WeekStartQueryDto } from './dto/week-start-query.dto';
```

```ts
  /**
   * Các trận của một tuần.
   * @param query - `weekStart`: mốc ISO của tuần; bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get()
  @ApiOperation({ summary: 'Các trận đánh của một tuần' })
  list(@Query() query: WeekStartQueryDto): Promise<BattleSession[]> {
    return this.battleSessions.listByWeek(query.weekStart);
  }
```

`team-builder.controller.ts` — tương tự:

```ts
import { WeekStartQueryDto } from './dto/week-start-query.dto';
```

```ts
  /**
   * Các trận của một tuần kèm đội hình đã lưu.
   * @param query - `weekStart`: mốc ISO của tuần; bỏ trống = tuần đang mở
   * @returns Mảng trận sắp theo thời gian đánh
   */
  @Get('formations')
  @ApiOperation({ summary: 'Đội hình của các trận trong một tuần' })
  getFormations(
    @Query() query: WeekStartQueryDto,
  ): Promise<SessionFormation[]> {
    return this.teamBuilder.getFormations(query.weekStart);
  }
```

- [ ] **Bước 5: Chạy test, typecheck, lint**

```bash
pnpm --filter api test -- week-start-query
pnpm --filter api typecheck
pnpm --filter api lint
```

Kết quả mong đợi: PASS, sạch.

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules/battle-sessions apps/api/src/modules/team-builder
git commit -m "refactor(api): read weekStart through a zod query dto"
```

---

### Task 5: Seam của lịch nói `WeekAnchor`

Task lớn nhất, và là một đơn vị duy nhất: đổi kiểu trên seam thì hai module gọi nó phải đổi cùng
commit, nếu không thì không biên dịch được. `listWeekAnchors` **không** nằm trong task này — nó là
đường của `getWeeks`, để Task 6.

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts:65-71, 88-119, 134-158`
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts:69-87, 103-135`
- Modify: `apps/api/src/modules/attendance/attendance.service.ts:73-80`
- Test: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`
- Test: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`

**Interfaces:**
- Consumes: `parseWeekStart`, `isSameWeek`, `WeekAnchor` (Task 1, 3)
- Produces (trên `BattleSessionsService`):
  - `getActiveWeek(): WeekAnchor` — **thay** `getActiveWeekStart(): string`, đã xoá hẳn
  - `listByWeek(weekStart?: string): Promise<BattleSession[]>` — chữ ký giữ nguyên, thân đổi
  - `ensureWeekMaterialized(week: WeekAnchor): Promise<void>`
  - `readWeekSessions(week: WeekAnchor): Promise<ScheduledSession[]>`

- [ ] **Bước 1: Viết test đỏ cho battle-sessions**

Thêm vào `battle-sessions.service.spec.ts`, trong `describe('BattleSessionsService', …)`:

```ts
  describe('listByWeek nhận mốc tuần từ query', () => {
    // 400 cho người dùng là việc của `weekStartQuerySchema` ở biên HTTP; tầng
    // service chỉ phải ném ngay thay vì để `Invalid Date` rơi xuống Prisma.
    it('chuỗi hỏng thì ném ngay, không rơi xuống Prisma', async () => {
      await expect(service.listByWeek('xyz')).rejects.toThrow(RangeError);
      expect(prisma.battleSession.findMany).not.toHaveBeenCalled();
    });

    it('mốc giữa tuần quy về Thứ 2 trước khi truy vấn', async () => {
      await service.listByWeek(vn('2026-07-22T12:00').toISOString());

      expect(firstArg(prisma.battleSession.findMany, 0)).toMatchObject({
        where: { weekStart: WEEK_START },
      });
    });

    it('bỏ trống thì đọc tuần đang mở', async () => {
      await service.listByWeek();

      expect(firstArg(prisma.battleSession.findMany, 0)).toMatchObject({
        where: { weekStart: WEEK_START },
      });
    });

    it('getActiveWeek trả mốc Thứ 2 của tuần đang mở', () => {
      expect(service.getActiveWeek().toISOString()).toBe(
        WEEK_START.toISOString(),
      );
    });
  });
```

`firstArg`, `vn`, `WEEK_START` đã có trong file; không cần import gì thêm.

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- battle-sessions.service
```

Kết quả mong đợi: FAIL — `service.getActiveWeek` không tồn tại, và `listByWeek('xyz')` hiện đang gọi
Prisma với `Invalid Date` thay vì ném.

- [ ] **Bước 3: Sửa `battle-sessions.service.ts`**

Đổi khối import từ `./session-schedule` (thêm `parseWeekStart` và kiểu `WeekAnchor`; `getActiveWeek`
của module lịch vẫn được giữ — method cùng tên trên service gọi nó):

```ts
import {
  formatSessionLabel,
  getActiveWeek,
  getEditableWeeks,
  guildWarDateTime,
  guildWarSessionId,
  parseWeekStart,
  weekStartOf,
  type WeekAnchor,
} from './session-schedule';
```

Thay `getActiveWeekStart` bằng `getActiveWeek`:

```ts
  /**
   * Mốc Thứ 2 của tuần điểm danh đang mở.
   * Trả về mốc có kiểu chứ không phải ISO string: so tuần là việc của
   * `isSameWeek`, không phải của phép so chuỗi ở call site.
   * @returns Mốc Thứ 2 00:00 giờ VN
   */
  getActiveWeek(): WeekAnchor {
    return getActiveWeek(this.clock.now()).weekStart;
  }
```

`listByWeek` — nhánh mặc định và `new Date(weekStart)` gộp vào `parseWeekStart`:

```ts
  /**
   * Các trận của một tuần, sắp theo thời gian đánh.
   * Tuần đang mở và tuần kế được đảm bảo đã có trận Guild War; tuần đã qua chỉ
   * đọc những gì còn lưu.
   * @param weekStart - Mốc ISO của tuần cần xem. Bỏ trống = tuần đang mở; mốc giữa tuần được quy về Thứ 2 của tuần đó
   * @returns Mảng trận đã sắp theo thời gian đánh
   * @throws RangeError khi `weekStart` không phải một mốc thời gian hợp lệ — biên HTTP đã chặn ở DTO, nên chỉ xảy ra khi gọi từ trong process
   */
  async listByWeek(weekStart?: string): Promise<BattleSession[]> {
    const now = this.clock.now();
    const target = parseWeekStart(weekStart, now);

    await this.materializeWeek(target, now);

    const rows = await this.prisma.battleSession.findMany({
      ...weekSessionQuery(target),
      include: SESSION_INCLUDE,
    });

    return rows.map((row) => toBattleSession(row, now));
  }
```

`ensureWeekMaterialized` và `readWeekSessions` nhận mốc đã có kiểu, hết `new Date(...)`:

```ts
  /**
   * Đảm bảo tuần đã có đủ các trận hệ thống sinh (hiện là Guild War).
   * Tuần ngoài phạm vi thiết lập là no-op, nên caller gọi được vô điều kiện.
   * @param week - Mốc Thứ 2 của tuần cần dựng
   * @returns Promise hoàn tất khi tuần đã sẵn sàng để đọc
   */
  async ensureWeekMaterialized(week: WeekAnchor): Promise<void> {
    await this.materializeWeek(week, this.clock.now());
  }
```

```ts
  /**
   * Các trận của một tuần, sắp theo thời gian đánh, nhãn đã dựng.
   * Không tự sinh trận — gọi `ensureWeekMaterialized` trước nếu cần.
   * @param week - Mốc Thứ 2 của tuần cần đọc
   * @returns Mảng trận đã sắp theo giờ đánh
   */
  async readWeekSessions(week: WeekAnchor): Promise<ScheduledSession[]> {
    const rows = await this.prisma.battleSession.findMany({
      ...weekSessionQuery(week),
      select: {
        id: true,
        dateTime: true,
        isGuildWar: true,
        opponent: true,
      },
    });
```

Phần còn lại của `readWeekSessions` giữ nguyên. `weekSessionQuery(weekStart: Date)` giữ nguyên chữ
ký — `WeekAnchor` gán được vào `Date`.

- [ ] **Bước 4: Sửa call site ở `team-builder.service.ts`**

Import thêm `parseWeekStart` từ seam:

```ts
import {
  BattleSessionsService,
  parseWeekStart,
  weekEndOf,
} from '../battle-sessions/battle-sessions.public';
```

`getFormations` — mốc tuần được dựng một lần rồi dùng lại:

```ts
  /**
   * Lấy các trận của một tuần kèm đội hình đã lưu.
   * @param weekStart - Mốc ISO của tuần cần xem. Bỏ trống = tuần đang mở; mốc giữa tuần được quy về Thứ 2 của tuần đó
   * @returns Mảng ngày đánh sắp theo thời gian, mỗi ngày kèm đội hình từng trận và cờ locked
   * @throws RangeError khi `weekStart` không phải một mốc thời gian hợp lệ — biên HTTP đã chặn ở DTO, nên chỉ xảy ra khi gọi từ trong process
   */
  async getFormations(weekStart?: string): Promise<SessionFormation[]> {
    const now = this.clock.now();
    const target = parseWeekStart(weekStart, now);

    await this.battleSessions.ensureWeekMaterialized(target);

    const sessions = await this.battleSessions.readWeekSessions(target);
    if (sessions.length === 0) return [];
```

Phần còn lại của hàm giữ nguyên.

`getWeeks` chỉ sửa đủ để biên dịch (Task 6 dọn nốt):

```ts
    const activeWeek = this.battleSessions.getActiveWeek();

    // Sinh trước, đọc sau: tuần đang mở phải có trận thì mới xuất hiện ở đây.
    await this.battleSessions.ensureWeekMaterialized(activeWeek);

    const weekStarts = await this.battleSessions.listWeekAnchors();

    return weekStarts.map(
      (weekStart) =>
        ({
          weekStart,
          weekEnd: weekEndOf(new Date(weekStart)).toISOString(),
          isActive: weekStart === activeWeek.toISOString(),
        }) satisfies FormationWeek,
    );
```

- [ ] **Bước 5: Sửa call site ở `attendance.service.ts`**

```ts
    const session = await this.battleSessions.findById(sessionId);
    // Người thường chỉ điểm danh được cho tuần đang mở; quản trị viên sửa được
    // cả tuần khác để bù sai sót.
    //
    // TODO(A1): `findById` trả entity nên `weekStart` ở đây là ISO string, không
    // phải WeekAnchor — đây là phép so tuần bằng chuỗi cuối cùng còn lại. Khi A1
    // cho `findById` trả kèm mốc tuần thì đổi thành `isSameWeek(...)`.
    const inActiveWeek =
      session?.weekStart === this.battleSessions.getActiveWeek().toISOString();
```

- [ ] **Bước 6: Cập nhật mock trong ba spec**

`team-builder.service.spec.ts` — trong **cả ba** khối `beforeEach` có `getActiveWeekStart`, đổi
thành:

```ts
      getActiveWeek: jest.fn().mockReturnValue(WEEK_START),
```

và khai báo kiểu `let battleSessions: { getActiveWeek: jest.Mock; … }` tương ứng ở từng khối.

Hai kỳ vọng đang so với ISO string đổi sang so với `Date`:

```ts
  it('đảm bảo trận của tuần đang mở tồn tại trước khi đọc', async () => {
    await service.getFormations();

    expect(battleSessions.ensureWeekMaterialized).toHaveBeenCalledTimes(1);
    expect(battleSessions.ensureWeekMaterialized).toHaveBeenCalledWith(
      WEEK_START,
    );
  });

  it('tuần cũ cũng gọi ensureWeekMaterialized — module lịch tự no-op', async () => {
    const lastWeek = vn('2026-07-13T00:00');

    await service.getFormations(lastWeek.toISOString());

    expect(battleSessions.ensureWeekMaterialized).toHaveBeenCalledWith(lastWeek);
    expect(battleSessions.readWeekSessions).toHaveBeenCalledWith(lastWeek);
  });
```

`attendance.service.spec.ts:134` — đổi mock `getActiveWeekStart` thành:

```ts
      getActiveWeek: jest.fn().mockReturnValue(vn('2026-07-20T00:00')),
```

(giữ nguyên mốc tuần mà mock cũ đang trả về dạng chuỗi; khai báo kiểu ở dòng 77 đổi theo).

- [ ] **Bước 7: Thêm test cho hành vi mới ở team-builder**

Trong `describe('TeamBuilderService.getFormations', …)`:

```ts
  it('mốc giữa tuần đọc đúng tuần chứa ngày đó, không trả rỗng', async () => {
    // Hành vi đổi có chủ ý: trước đây chuỗi này không khớp hàng nào nên ra [].
    const result = await service.getFormations(vn('2026-07-22T12:00').toISOString());

    expect(battleSessions.readWeekSessions).toHaveBeenCalledWith(WEEK_START);
    expect(result.map((item) => item.sessionId)).toEqual([
      'session-tue',
      'session-thu',
      'session-sat',
    ]);
  });

  // 400 cho người dùng là việc của `weekStartQuerySchema` ở biên HTTP; ở đây chỉ
  // cần chắc chuỗi hỏng dừng lại trước khi chạm module lịch.
  it('mốc tuần hỏng thì ném ngay, không gọi xuống module lịch', async () => {
    await expect(service.getFormations('xyz')).rejects.toThrow(RangeError);
    expect(battleSessions.readWeekSessions).not.toHaveBeenCalled();
  });
```

- [ ] **Bước 8: Chạy toàn bộ test**

```bash
pnpm --filter api typecheck
pnpm --filter api test
```

Kết quả mong đợi: PASS toàn bộ. Nếu typecheck báo `Argument of type 'Date' is not assignable to
parameter of type 'WeekAnchor'` ở đâu đó — đó là một call site đang tự dựng mốc tuần; cho nó đi qua
`parseWeekStart` hoặc `weekStartOf`, không ép kiểu tại chỗ.

- [ ] **Bước 9: Commit**

```bash
pnpm --filter api lint
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules
git commit -m "refactor(api): make the schedule seam speak week anchors

getActiveWeekStart() exposed an ISO string, so callers compared weeks by string
and a mistyped ?weekStart= reached Prisma as an Invalid Date. The seam now hands
out a branded WeekAnchor and parseWeekStart owns the conversion.

Behavior change, on purpose: ?weekStart=<a midweek instant> used to match no row
and return an empty list; it now returns the week containing that instant. The
frontend always sends a Monday anchor, so nothing on the wire changes."
```

---

### Task 6: `getWeeks` so tuần bằng mốc, không bằng chuỗi

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts:160-172`
- Modify: `apps/api/src/modules/team-builder/team-builder.service.ts:63-87`
- Test: `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`

**Interfaces:**
- Consumes: `getActiveWeek(): WeekAnchor`, `isSameWeek`, `weekEndOf`
- Produces: `listWeekAnchors(): Promise<WeekAnchor[]>` — **đổi** từ `Promise<string[]>`

- [ ] **Bước 1: Viết test đỏ**

Trong `describe('TeamBuilderService.getWeeks', …)`, đổi mock `listWeekAnchors` sang trả `Date`, và
thêm một test cho ca mà phép so chuỗi cũ sai:

```ts
      listWeekAnchors: jest
        .fn()
        .mockResolvedValue([WEEK_START, vn('2026-07-13T00:00')]),
```

```ts
  it('nhận ra tuần đang mở kể cả khi mốc đến từ một Date khác instance', async () => {
    // Phép so chuỗi cũ đúng vì tình cờ cả hai vế cùng đi qua toISOString();
    // so bằng thời điểm thì không phụ thuộc vào cách viết chuỗi.
    battleSessions.listWeekAnchors.mockResolvedValue([
      new Date(WEEK_START.getTime()),
    ]);

    const [week] = await service.getWeeks();

    expect(week.isActive).toBe(true);
    expect(week.weekStart).toBe(WEEK_START.toISOString());
  });
```

Test `'đánh dấu đúng tuần đang mở khi tuần kế đã có trận'` cũng đổi mock sang `Date`:

```ts
    battleSessions.listWeekAnchors.mockResolvedValue([nextWeek, WEEK_START]);
```

(`nextWeek` đang là `Date`, bỏ `.toISOString()`; phần `expect` giữ nguyên vì response vẫn là ISO
string.)

- [ ] **Bước 2: Chạy test cho chắc là đỏ**

```bash
pnpm --filter api test -- team-builder.service
```

Kết quả mong đợi: FAIL — `weekStart === activeWeek.toISOString()` so một `Date` với một chuỗi nên
`isActive` ra `false`, và `weekStart` trong response là `Date` chứ không phải chuỗi.

- [ ] **Bước 3: `listWeekAnchors` trả mốc có kiểu**

`battle-sessions.service.ts`:

```ts
  /**
   * Các tuần còn dữ liệu lịch, mới nhất trước.
   * Hàng trong database luôn là mốc Thứ 2 (mọi đường ghi đều đi qua `weekStartOf`),
   * nhưng vẫn dựng lại qua `weekStartOf` — đó là hàm dựng hợp lệ duy nhất, và nó
   * là phép đồng nhất trên một mốc đã đúng.
   * @returns Mảng mốc Thứ 2, mới nhất trước
   */
  async listWeekAnchors(): Promise<WeekAnchor[]> {
    const rows = await this.prisma.battleSession.findMany({
      distinct: ['weekStart'],
      select: { weekStart: true },
      orderBy: { weekStart: 'desc' },
    });

    return rows.map((row) => weekStartOf(row.weekStart));
  }
```

- [ ] **Bước 4: `getWeeks` dùng `isSameWeek`**

`team-builder.service.ts` — thêm `isSameWeek` vào import từ seam, rồi:

```ts
  async getWeeks(): Promise<FormationWeek[]> {
    await this.purgeExpiredFormations(this.clock.now());

    const activeWeek = this.battleSessions.getActiveWeek();

    // Sinh trước, đọc sau: tuần đang mở phải có trận thì mới xuất hiện ở đây.
    await this.battleSessions.ensureWeekMaterialized(activeWeek);

    const anchors = await this.battleSessions.listWeekAnchors();

    return anchors.map(
      (anchor) =>
        ({
          weekStart: anchor.toISOString(),
          weekEnd: weekEndOf(anchor).toISOString(),
          isActive: isSameWeek(anchor, activeWeek),
        }) satisfies FormationWeek,
    );
  }
```

- [ ] **Bước 5: Chạy test cho chắc là xanh**

```bash
pnpm --filter api test -- team-builder.service
pnpm --filter api typecheck
```

Kết quả mong đợi: PASS, typecheck sạch.

- [ ] **Bước 6: Commit**

```bash
pnpm --filter api lint
git rev-parse --abbrev-ref HEAD
git add apps/api/src/modules
git commit -m "refactor(api): compare formation weeks by anchor, not string"
```

---

### Task 7: Rà soát cuối và tài liệu

**Files:**
- Modify: `apps/api/docs/backend.md` §11

- [ ] **Bước 1: Rà không còn phép so tuần bằng chuỗi**

```bash
grep -rn "getActiveWeekStart" apps packages --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v dist
grep -rn "weekStart ===\|=== .*weekStart" apps/api/src --include="*.ts" | grep -v __tests__
```

Kết quả mong đợi: lệnh đầu không ra dòng nào. Lệnh sau ra **đúng một** dòng — chỗ có `TODO(A1)` ở
`attendance.service.ts`. Bất kỳ dòng nào khác là sót; sửa nốt trước khi đi tiếp.

- [ ] **Bước 2: Rà không còn `new Date(weekStart)` trên đường đọc**

```bash
grep -rn "new Date(weekStart\|new Date(targetWeekStart" apps/api/src --include="*.ts"
```

Kết quả mong đợi: không ra dòng nào.

- [ ] **Bước 3: Ghi luật vào `apps/api/docs/backend.md`**

Trong bảng §11 (Anti-patterns), thêm một hàng ngay dưới hàng `Business logic in a DTO`:

```markdown
| `@Query('x')` as a bare string | A query shape is a request shape: declare it in `packages/shared`, wrap it with `createZodDto`, take it as `@Query() query: XDto` |
```

- [ ] **Bước 4: Kiểm tra toàn bộ**

```bash
pnpm --filter @guild/shared build
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
```

Kết quả mong đợi: cả bốn lệnh sạch. Dán kết quả `test` (số suite/số test) vào phần báo cáo — không
tuyên bố "xong" khi chưa nhìn thấy output.

- [ ] **Bước 5: Kiểm tra tay hai endpoint**

```bash
pnpm --filter api dev   # ở một terminal khác
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/battle-sessions'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/battle-sessions?weekStart='
curl -s -w '\n%{http_code}\n' 'http://localhost:3001/battle-sessions?weekStart=xyz'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/battle-sessions?weekStart=2026-07-22T12:00:00%2B07:00'
```

Kết quả mong đợi: `200`, `200`, body chứa `Tuần không hợp lệ.` kèm `400`, `200`. (Cổng lấy theo
`PORT` trong `apps/api/.env`; đổi nếu khác 3001.)

- [ ] **Bước 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add apps/api/docs/backend.md
git commit -m "docs(api): note that query params go through a zod dto"
```

- [ ] **Bước 7: Báo cáo**

Tóm tắt cho người dùng: các commit đã tạo, output của `pnpm --filter api test`, và nhắc lại hành vi
đã đổi có chủ ý (`?weekStart=<giữa tuần>`), cùng món nợ `TODO(A1)` còn lại ở `attendance.service.ts`.

---

## Ngoài phạm vi (theo spec)

- Đưa `WeekAnchor` sang `packages/shared` cho frontend dùng — frontend nhận mốc tuần từ API, không tự
  dựng.
- Chuẩn hoá các query param khác sang DTO — chỉ hai chỗ này đang trần.
- Cho `findById` trả kèm mốc tuần để bỏ nốt phép so chuỗi ở `attendance` — việc của A1.
