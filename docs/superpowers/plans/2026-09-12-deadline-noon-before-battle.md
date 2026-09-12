# Deadline mặc định 12:00 hôm trước ngày đánh - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deadline mặc định là 12:00 trưa ngày trước ngày đánh (scrim điền sẵn, Bang Chiến 12:00 thứ
6), và bot nhắc theo mốc 12:00: deadline từ 12:00 nhắc 9h cùng ngày, trước 12:00 nhắc 9h hôm trước.

**Architecture:** Luật deadline dùng chung nằm trong `packages/shared/lib/battle-session.ts`
(`defaultDeadlineFor` mới, `guildWarDeadline` đổi giờ). Luật nhắc nằm trong `session-schedule.ts`
(`isReminderDay` theo mốc 12:00). `ReminderService` lọc thêm trận đã hết hạn. Không migration.

**Tech Stack:** Zod + TypeScript (`packages/shared`), NestJS + Jest (`apps/api`), Next.js + Vitest +
Testing Library (`apps/web`).

**Spec:** [`docs/superpowers/specs/2026-09-12-deadline-noon-before-battle-design.md`](../specs/2026-09-12-deadline-noon-before-battle-design.md)

## Global Constraints

- Mọi giờ là giờ VN (UTC+7 cố định); mọi phép đọc giờ qua `vnParts` / `shiftVnDate` / `atVnTime` /
  `isSameVnDay` của `@guild/shared/lib`.
- Cap **không đổi**: `deadlineCapFor` vẫn là 10:00 ngày đánh, không muộn hơn giờ đánh.
- Cron **không đổi**: `0 2 * * *` UTC (09:00 VN).
- Chữ người dùng đọc là tiếng Việt; code, comment, tên file tiếng Anh. Không dùng em dash trong chữ mới.
- Sau khi sửa `packages/shared`, chạy `pnpm --filter @guild/shared build` (script `test` của hai app
  tự làm việc này).
- Test shared lib nằm ở `apps/web/lib/__tests__/session-deadline.test.ts` (shared không có runner).

---

### Task 1: Luật deadline dùng chung

**Files:**
- Modify: `packages/shared/lib/battle-session.ts`
- Modify: `packages/shared/schemas/battle-session.schema.ts`
- Test: `apps/web/lib/__tests__/session-deadline.test.ts`

**Interfaces:**
- Produces: `defaultDeadlineFor(dateTime: Date): Date` - 12:00 VN ngày trước ngày đánh.
- Produces: `guildWarDeadline(weekStart: Date): Date` - nay là 12:00 thứ 6.
- Produces: `GUILD_WAR_DEADLINE_LABEL = "12:00 Thứ 6"` trong `@guild/shared/schemas`.

- [ ] **Step 1: Test đỏ**

Thêm vào `session-deadline.test.ts` (import thêm `defaultDeadlineFor`), và đổi khối `guildWarDeadline`:

```ts
describe("defaultDeadlineFor", () => {
  it("trận tối Thứ 5 có hạn mặc định 12:00 Thứ 4", () => {
    expect(defaultDeadlineFor(vn("2026-09-10T20:30")).toISOString()).toBe(
      vn("2026-09-09T12:00").toISOString()
    );
  });

  it("trận sáng sớm vẫn lấy 12:00 hôm trước", () => {
    expect(defaultDeadlineFor(vn("2026-09-10T08:00")).toISOString()).toBe(
      vn("2026-09-09T12:00").toISOString()
    );
  });

  it("qua ranh giới tháng vẫn ra đúng ngày", () => {
    expect(defaultDeadlineFor(vn("2026-10-01T20:30")).toISOString()).toBe(
      vn("2026-09-30T12:00").toISOString()
    );
  });

  it("luôn nằm trong trần, kể cả trận sát nửa đêm", () => {
    for (const battle of ["2026-09-10T00:30", "2026-09-10T08:00", "2026-09-10T20:30"]) {
      const dateTime = vn(battle);
      expect(isWithinDeadlineCap(defaultDeadlineFor(dateTime), dateTime)).toBe(true);
    }
  });
});

describe("guildWarDeadline", () => {
  it("luôn là 12:00 Thứ 6 của tuần", () => {
    expect(guildWarDeadline(vn("2026-07-20T00:00")).toISOString()).toBe(
      vn("2026-07-24T12:00").toISOString()
    );
    expect(guildWarDeadline(vn("2026-07-27T00:00")).toISOString()).toBe(
      vn("2026-07-31T12:00").toISOString()
    );
  });

  it("tuần vắt qua mốc đổi tháng vẫn ra đúng ngày", () => {
    expect(guildWarDeadline(vn("2026-06-29T00:00")).toISOString()).toBe(
      vn("2026-07-03T12:00").toISOString()
    );
  });
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `pnpm --filter web test lib/__tests__/session-deadline.test.ts`
Expected: FAIL (`defaultDeadlineFor` chưa có, `guildWarDeadline` còn 17:00 thứ 5).

- [ ] **Step 3: Cài đặt**

`battle-session.ts`:

```ts
/** Hour of the default deadline, on the day before the battle. */
const DEFAULT_DEADLINE_HOUR = 12;

/** Fixed cut-off hour of a Guild War session. */
const GUILD_WAR_DEADLINE_HOUR = 12;

/** Day offset of Friday from the Monday starting the week. */
const FRIDAY_OFFSET_FROM_MONDAY = 4;

/**
 * Deadline the form prefills for a scrim: 12:00 Vietnam time on the day before the battle.
 *
 * Always within the cap: noon the day before is earlier than midnight of the battle day, so it is
 * earlier than both 10:00 on that day and the battle itself.
 * @param dateTime - When the battle takes place
 * @returns The suggested deadline
 */
export function defaultDeadlineFor(dateTime: Date): Date {
  return shiftVnDate(dateTime, -1, DEFAULT_DEADLINE_HOUR, 0);
}
```

`guildWarDeadline` dùng `FRIDAY_OFFSET_FROM_MONDAY` và doc comment "12:00 Friday"; xoá
`THURSDAY_OFFSET_FROM_MONDAY`. Comment `deadlineCapFor` bỏ câu "both the cap ... and the value
prefilled", thay bằng "The form prefills `defaultDeadlineFor` instead, which is always earlier."

`battle-session.schema.ts`, cạnh `DEADLINE_CAP_MESSAGE`:

```ts
/** When a Guild War's system-owned deadline falls - shared by the API's 400 and the form's hint. */
export const GUILD_WAR_DEADLINE_LABEL = "12:00 Thứ 6";
```

- [ ] **Step 4: Chạy, xác nhận xanh** (cùng lệnh Step 2).

---

### Task 2: API - Bang Chiến dùng deadline mới và câu chung

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.service.ts:316-320`
- Test: `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`

**Interfaces:**
- Consumes: `guildWarDeadline`, `GUILD_WAR_DEADLINE_LABEL` (Task 1).

- [ ] **Step 1: Test đỏ**

- Test `'ghi đè hạn chót 17:00 Thứ 5 ...'` đổi tên thành `'ghi đè hạn chót 12:00 Thứ 6 ...'`, kỳ vọng
  `vn('2026-07-24T12:00')` cho cả `create` lẫn `update`.
- Test `'dời Guild War sang tuần khác ...'` kỳ vọng `deadline: vn('2026-07-31T12:00')`.
- Thêm test câu lỗi:

```ts
it('lỗi sửa hạn chót Guild War nêu đúng giờ hạn cố định', async () => {
  prisma.battleSession.findUnique.mockResolvedValue(
    row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
  );

  await expect(
    service.update('gw-2026-07-20', {
      deadline: vn('2026-07-23T10:00').toISOString(),
    }),
  ).rejects.toThrow(
    'Hạn chót của trận Bang Chiến cố định 12:00 Thứ 6, không sửa được.',
  );
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `pnpm --filter api test battle-sessions.service`
Expected: câu lỗi còn "17:00 Thứ 5" nên test mới FAIL (hai test kia xanh ngay nhờ Task 1).

- [ ] **Step 3: Cài đặt**

```ts
throw new BadRequestException(
  `Hạn chót của trận Bang Chiến cố định ${GUILD_WAR_DEADLINE_LABEL}, không sửa được.`,
);
```

- [ ] **Step 4: Chạy, xác nhận xanh** (cùng lệnh Step 2).

---

### Task 3: `isReminderDay` theo mốc 12:00

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Interfaces:**
- Produces: `isReminderDay(deadline: Date, now: Date): boolean` - chữ ký giữ nguyên.

- [ ] **Step 1: Test đỏ** - thay khối `describe('ngày nhắc điểm danh')`:

```ts
describe('ngày nhắc điểm danh', () => {
  // Bang Chiến Thứ 7 05/09 có hạn 12:00 Thứ 6 04/09 → nhắc 9h sáng Thứ 6.
  const guildWarDeadline = vn('2026-09-04T12:00');

  it('hạn từ 12:00 trở đi được nhắc sáng cùng ngày', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-04T09:00'))).toBe(true);
  });

  it('cron trễ tới 09:59 vẫn cho cùng kết quả', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-04T09:59'))).toBe(true);
  });

  it('hạn 12:00 ngày mai thì hôm nay chưa nhắc', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-03T09:00'))).toBe(false);
  });

  it('hạn 11:59 ngày mai được nhắc sáng hôm nay', () => {
    expect(isReminderDay(vn('2026-09-05T11:59'), vn('2026-09-04T09:00'))).toBe(true);
  });

  it('hạn 11:59 hôm nay không nhắc lại, vì đã nhắc hôm qua', () => {
    expect(isReminderDay(vn('2026-09-04T11:59'), vn('2026-09-04T09:00'))).toBe(false);
  });

  it('hạn đúng trần 10:00 ngày đánh được nhắc hôm trước', () => {
    const cap = vn('2026-09-10T10:00');

    expect(isReminderDay(cap, vn('2026-09-09T09:00'))).toBe(true);
    expect(isReminderDay(cap, vn('2026-09-10T09:00'))).toBe(false);
  });

  it('sai sau khi đã quá hạn', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-05T09:00'))).toBe(false);
  });

  it('so theo ngày dương lịch VN, không theo khoảng 24 giờ', () => {
    // Cách nhau chưa tới 24 giờ nhưng vẫn là "ngày mai" theo lịch VN.
    expect(isReminderDay(vn('2026-09-03T01:00'), vn('2026-09-02T23:30'))).toBe(true);
  });

  it('nửa đêm giờ VN cắt sang ngày mới, không phải nửa đêm UTC', () => {
    expect(isReminderDay(vn('2026-09-04T09:00'), vn('2026-09-02T23:30'))).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `pnpm --filter api test session-schedule`
Expected: các ca "cùng ngày" và "11:59 hôm nay"... FAIL theo luật cũ.

- [ ] **Step 3: Cài đặt**

```ts
/**
 * Deadlines at or after this hour are reminded about the same morning; earlier ones the morning
 * before. Noon, not 10:00: Vercel Hobby fires the 09:00 cron anywhere up to 09:59, and a same-day
 * reminder for a 10:00 deadline could land a minute before it closes.
 */
const REMINDER_CUTOFF_HOUR = 12;

export function isReminderDay(deadline: Date, now: Date): boolean {
  const daysAhead = vnParts(deadline).hour >= REMINDER_CUTOFF_HOUR ? 0 : 1;

  return isSameVnDay(deadline, shiftVnDate(now, daysAhead, 0, 0));
}
```

Doc comment viết lại theo luật mới (vẫn so ngày dương lịch VN); import thêm `isSameVnDay`.

- [ ] **Step 4: Chạy, xác nhận xanh** (cùng lệnh Step 2).

---

### Task 4: Tin nhắc - bỏ trận đã hết hạn, câu mở đầu mới

**Files:**
- Modify: `apps/api/src/modules/discord-bot/reminder.service.ts`
- Modify: `apps/api/src/modules/discord-bot/reminder.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/reminder.service.spec.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/reminder.spec.ts`

**Interfaces:**
- Consumes: `isReminderDay` (Task 3), `isDeadlinePassed` (đã có trong `battle-sessions.public`).

- [ ] **Step 1: Test đỏ**

`reminder.service.spec.ts`: chuyển fixture sang luật mới - `NOW = new Date('2026-09-04T02:00:00.000Z')`
(09:00 Thứ 6 04/09), deadline mặc định `'2026-09-04T05:00:00.000Z'` (12:00 Thứ 6), sửa comment theo;
`Options` thêm `now?: Date`, `makeService` dùng `new FixedClock(options.now ?? NOW)`. Thêm:

```ts
// 14:00 Thứ 6 04/09 - hạn 12:00 cùng ngày vẫn là ngày nhắc, nhưng đã khoá.
const AFTERNOON = new Date('2026-09-04T07:00:00.000Z');

it('bỏ trận đã quá hạn dù hôm nay là ngày nhắc của nó', async () => {
  const { service, postMessage } = makeService({
    now: AFTERNOON,
    sessions: [
      session(),
      // 18:00 Thứ 6 04/09 - còn mở.
      session({ id: 's1', label: 'Thứ 6 · 20:30', isGuildWar: false,
        deadline: '2026-09-04T11:00:00.000Z' }),
    ],
  });

  await expect(service.run()).resolves.toEqual({ status: 'sent', sessionCount: 1, missingCount: 1 });
  const [, payload] = postMessage.mock.calls[0] as [string, MessagePayload];
  expect(payload.embeds?.[0].description).not.toContain('Bang Chiến');
});

it('chỉ còn trận đã quá hạn thì không gửi gì', async () => {
  const { service, postMessage } = makeService({ now: AFTERNOON });

  await expect(service.run()).resolves.toEqual({ status: 'nothing-due' });
  expect(postMessage).not.toHaveBeenCalled();
});
```

`reminder.spec.ts`:

```ts
it('câu mở đầu không nói hôm nay hay ngày mai', () => {
  expect(buildReminder([GUILD_WAR], WEB_ORIGIN).content).toMatch(
    /^⏰ \*\*Nhắc điểm danh\*\* - mấy ngày dưới đây sắp hết hạn điểm danh\.\n/,
  );
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `pnpm --filter api test reminder`
Expected: hai test "quá hạn" và test câu mở đầu FAIL.

- [ ] **Step 3: Cài đặt**

`reminder.service.ts`:

```ts
// Same-day reminders mean a hand-run `/nhac-diem-danh` after the cut-off would otherwise ping
// people who can no longer answer.
const dueSessions = sessions.filter((session) => {
  const deadline = new Date(session.deadline);

  return isReminderDay(deadline, now) && !isDeadlinePassed(deadline, now);
});
```

Import `isDeadlinePassed` từ `battle-sessions.public` (thêm export nếu chưa có). Sửa comment
"falls tomorrow" / "Nothing closes tomorrow" thành "is due for a reminder today".

`reminder.ts`: `LEAD = '⏰ **Nhắc điểm danh** - mấy ngày dưới đây sắp hết hạn điểm danh.'`; sửa
comment "whose deadline falls tomorrow" ở `DueSession` và `buildReminder`.

- [ ] **Step 4: Chạy, xác nhận xanh** (cùng lệnh Step 2), rồi `pnpm --filter api test` toàn bộ.

---

### Task 5: Form web điền sẵn 12:00 hôm trước

**Files:**
- Modify: `apps/web/features/settings/components/session-form-dialog.tsx`
- Test: `apps/web/features/settings/components/__tests__/session-form-dialog.test.tsx`

**Interfaces:**
- Consumes: `defaultDeadlineFor`, `GUILD_WAR_DEADLINE_LABEL` (Task 1).

- [ ] **Step 1: Test đỏ**

```ts
it("chọn ngày đánh thì hạn chót tự điền 12:00 hôm trước", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T09:00:00+07:00"));
  renderDialog(null);

  // The dialog renders through a portal, so its fields live under `document`, not the container.
  fireEvent.click(document.querySelector("#session-date-time")!);
  // Mirrors how `CalendarDayButton` stamps each day.
  const day = new Date(2026, 8, 10).toLocaleDateString("vi");
  fireEvent.click(document.querySelector(`[data-day="${day}"]`)!);

  expect(document.querySelector("#session-deadline")?.textContent).toContain("09/09/2026");
  expect(
    (screen.getByLabelText("Hạn chót điểm danh — giờ") as HTMLInputElement).value
  ).toBe("12:00");
  vi.useRealTimers();
});

it("Bang Chiến ghi hạn chót 12:00 Thứ 6", () => {
  renderDialog(GUILD_WAR);

  expect(screen.getByText(/12:00 Thứ 6 - cố định, không sửa được\./)).toBeTruthy();
});
```

Dialog render qua portal, nên mọi ô trong form phải query trên `document`, không phải `container`.
`fireEvent.click` mở được Popover của Base UI trong jsdom.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `pnpm --filter web test session-form-dialog`
Expected: hạn chót ra 10/09 10:00, dòng Bang Chiến còn "17:00 Thứ 5" → FAIL.

- [ ] **Step 3: Cài đặt**

- `DEFAULT_DEADLINE_TIME = "12:00"`.
- `handleDateTimeChange` dùng `defaultDeadlineFor(toInstant(value))`; doc comment đổi "The prefilled
  value is the cap itself" thành "The prefilled value is noon the day before (`defaultDeadlineFor`),
  which is always within the cap."
- Dòng Bang Chiến: `{GUILD_WAR_DEADLINE_LABEL} - cố định, không sửa được.`
- Giữ nguyên `description="Muộn nhất 10:00 sáng ngày đánh."`.

- [ ] **Step 4: Chạy, xác nhận xanh**, rồi `pnpm --filter web test` toàn bộ.

---

### Task 6: Docs và comment

**Files:**
- Modify: `apps/api/prisma/schema.prisma:72-74` - "Guild War: system-set to 12:00 Friday". Không tạo migration.
- Modify: `docs/architecture.md` - §5 bảng `BattleSession` ("17:00 Thursday" → "12:00 Friday"; scrim
  form prefills 12:00 the day before); §6 gạch đầu dòng Guild War deadline; thêm gạch đầu dòng luật
  nhắc (mốc 12:00, bỏ trận đã hết hạn); dòng endpoint `/cron/attendance-reminder` "every deadline
  falling tomorrow" → "every deadline due for a reminder today".
- Modify: `docs/superpowers/specs/2026-09-02-attendance-reminder-cron-design.md` §3.2 - ghi chú đầu
  mục trỏ sang spec 2026-09-12, bảng cập nhật theo §3.3 của spec mới.
- Kiểm tra `apps/web/docs/frontend.md` còn nhắc "17:00 Thứ 5" không; sửa nếu có. (Thực tế: §"Time and
  deadlines" ghi form gọi `deadlineCapFor`; sửa thành `isWithinDeadlineCap` + `defaultDeadlineFor`.)
- Modify: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts` - lượt soát ở Step 2
  tìm ra fixture Bang Chiến hard-code 17:00 Thứ 5; đổi thành 12:00 Thứ 6 và test khoá thành 12:01 Thứ 6
  (mốc `now` mặc định của spec là 12:00 Thứ 4, sớm hơn cả hai hạn, nên các test khác không đổi).

- [ ] **Step 1: Sửa docs** như trên.
- [ ] **Step 2: Soát** `grep -rn "17:00 Thứ 5\|17:00 Thursday\|ngày mai" docs apps/api/src apps/web/features packages/shared --include='*.ts' --include='*.tsx' --include='*.md' --include='*.prisma'`
  - chỉ còn chỗ nói về lịch sử (architecture §6 "Until 2026-08...", `fix-deadlines.ts`, spec cũ).

---

### Task 7: Kiểm tra cuối

- [ ] `pnpm --filter api test`, `pnpm --filter web test` - xanh toàn bộ.
- [ ] `pnpm --filter api lint`, `pnpm --filter web lint` - sạch.
- [ ] Đối chiếu spec §4 (bảng file) và §5 (test) với thay đổi thực tế.
