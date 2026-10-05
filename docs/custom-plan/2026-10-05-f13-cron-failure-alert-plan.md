# F13 - Báo lỗi cron nhắc điểm danh: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development hoặc
> superpowers:executing-plans để chạy plan theo từng task. Bước dùng checkbox (`- [ ]`).

**Mục tiêu:** Lượt cron nhắc điểm danh lỗi, hoặc không chạy vì thiếu kênh nhắc, thì báo một tin vào kênh
admin riêng do `/cau-hinh-kenh` đặt.

**Kiến trúc:** `BotChannel` thêm purpose `ADMIN_ALERT` (không migration). `ReminderService.runScheduled()`
bọc `run('today')`, gửi tin báo qua `alert()` không bao giờ ném, rồi ném lại lỗi gốc. Câu chữ là hàm
thuần trong `reminder-alert.ts`. `/cau-hinh-kenh` thêm option `muc-dich`.

**Tech stack:** NestJS 11, Prisma 7, Jest; Discord REST + slash command option.

**Spec:** [`../custom-spec/2026-10-05-f13-cron-failure-alert-design.md`](../custom-spec/2026-10-05-f13-cron-failure-alert-design.md)
- đọc spec trước, plan không lặp lại lý do.

## Ràng buộc chung

- PR riêng, không gộp F14 (spec F14 §10). Branch `feat/f13-cron-failure-alert`.
- Code, comment, tên file tiếng Anh; tin Discord tiếng Việt; dấu gạch là `-`.
- Không migration: `BotChannel.purpose` đã là `String`.
- Tin báo không chứa stack hay `error.message` (có thể lộ chi tiết DB). Chi tiết vào log.
- Switch trên union kết thúc bằng `assertNever`.
- Mỗi commit: `git rev-parse --abbrev-ref HEAD` không phải `main`; message qua `caveman:caveman-commit`.
- Lệnh test: `pnpm --filter api test -- <pattern>`; trước khi xong: `pnpm --filter api lint`,
  `pnpm --filter api typecheck`, `pnpm --filter api test`.

## Review Focus

1. Tin báo gửi lỗi không được che lỗi gốc: cron vẫn ném **đúng** lỗi của `run`. - Task 2.
2. Đọc kênh admin cũng ném (DB sập) → không ném thêm, chỉ log. - Task 2.
3. `/cau-hinh-kenh` không option vẫn đặt kênh nhắc như cũ (hồi quy). - Task 3.
4. `/nhac-diem-danh` không gửi tin báo (gọi `run`, không gọi `runScheduled`). - Task 2.
5. `ADMIN_ALERT` và `ATTENDANCE_REMINDER` không ghi đè nhau. - Task 1.

---

### Task 1: `BotChannelService` theo purpose

**Files:**
- Modify: `apps/api/src/modules/discord-bot/bot-channel.service.ts`
- Modify: `apps/api/src/modules/discord-bot/reminder.service.ts:86` (`channels.get()`)
- Modify: `apps/api/src/modules/discord-bot/commands/cau-hinh-kenh.command.ts:76` (`channels.set(channelId)`)
- Test: `apps/api/src/modules/discord-bot/__tests__/bot-channel.service.spec.ts`, cập nhật mock trong
  `reminder.service.spec.ts`, `cau-hinh-kenh.command.spec.ts`

**Produces:**
- `type BotChannelPurpose = 'ATTENDANCE_REMINDER' | 'ADMIN_ALERT'`
- `BotChannelService.get(purpose: BotChannelPurpose): Promise<string | null>`
- `BotChannelService.set(purpose: BotChannelPurpose, channelId: string): Promise<void>`

- [ ] **Bước 1: test đỏ** - trong `bot-channel.service.spec.ts`, sửa các ca hiện có sang
  `service.get('ATTENDANCE_REMINDER')` / `service.set('ATTENDANCE_REMINDER', '999')`, và thêm:

```ts
it('đọc theo đúng purpose', async () => {
  // findUnique mock assert where.purpose
  await service.get('ADMIN_ALERT');
  expect(findUnique).toHaveBeenCalledWith({ where: { purpose: 'ADMIN_ALERT' } });
});

it('ghi theo đúng purpose, không đụng purpose khác', async () => {
  await service.set('ADMIN_ALERT', '777');
  expect(upsert).toHaveBeenCalledWith({
    where: { purpose: 'ADMIN_ALERT' },
    create: { purpose: 'ADMIN_ALERT', channelId: '777' },
    update: { channelId: '777' },
  });
});
```

- [ ] **Bước 2:** `pnpm --filter api test -- bot-channel` → FAIL (typecheck của ts-jest: sai số tham số).
- [ ] **Bước 3: code**

```ts
/**
 * What the bot posts in a channel. A union rather than a Prisma enum - see the model's comment in
 * schema.prisma: the value never crosses the network.
 */
export type BotChannelPurpose = 'ATTENDANCE_REMINDER' | 'ADMIN_ALERT';

async get(purpose: BotChannelPurpose): Promise<string | null> {
  const row = await this.prisma.botChannel.findUnique({ where: { purpose } });

  return row?.channelId ?? null;
}

async set(purpose: BotChannelPurpose, channelId: string): Promise<void> {
  await this.prisma.botChannel.upsert({
    where: { purpose },
    create: { purpose, channelId },
    update: { channelId },
  });
}
```

  Xoá hằng `ATTENDANCE_REMINDER` (thay bằng literal có kiểu). Caller: `reminder.service.ts` →
  `this.channels.get('ATTENDANCE_REMINDER')`; `cau-hinh-kenh.command.ts` →
  `deps.channels.set('ATTENDANCE_REMINDER', channelId)` (Task 3 đổi tiếp). Cập nhật comment JSDoc
  của class ("Reads and writes the channels the bot posts to, by purpose").
- [ ] **Bước 4:** `pnpm --filter api test -- "bot-channel|reminder.service|cau-hinh-kenh"` → PASS.
- [ ] **Bước 5:** commit.

### Task 2: Tin báo và `runScheduled`

**Files:**
- Create: `apps/api/src/modules/discord-bot/reminder-alert.ts`
- Modify: `apps/api/src/modules/discord-bot/reminder.service.ts`, `reminder.controller.ts`
- Test: Create `__tests__/reminder-alert.spec.ts`; Modify `__tests__/reminder.service.spec.ts`;
  thêm `__tests__/reminder.controller.spec.ts` nếu chưa có

**Consumes:** `BotChannelService.get(purpose)` (Task 1), `isDiscordForbidden` (`discord-rest.ts:48`).

**Produces:**
- `reminderFailureText(error: unknown): string`
- `REMINDER_NO_CHANNEL_ALERT: string`
- `ReminderService.runScheduled(): Promise<ReminderOutcome>`

- [ ] **Bước 1: test đỏ - câu chữ** (`reminder-alert.spec.ts`)

```ts
import { DiscordApiError } from '../discord-rest';
import { REMINDER_NO_CHANNEL_ALERT, reminderFailureText } from '../reminder-alert';

describe('reminderFailureText', () => {
  it('403 của Discord nói về quyền Send Messages', () => {
    expect(reminderFailureText(new DiscordApiError(403, '1', '{}'))).toContain('Send Messages');
  });

  it('lỗi khác không lộ message gốc', () => {
    const text = reminderFailureText(new Error('connect ECONNREFUSED 10.0.0.1:5432'));
    expect(text).toContain('lỗi hệ thống');
    expect(text).not.toContain('ECONNREFUSED');
  });

  it('Discord 500 rơi vào nhánh lỗi khác', () => {
    expect(reminderFailureText(new DiscordApiError(500, '1', '{}'))).toContain('lỗi hệ thống');
  });
});

it('thiếu kênh nhắc chỉ cách sửa', () => {
  expect(REMINDER_NO_CHANNEL_ALERT).toContain('/cau-hinh-kenh');
});
```

- [ ] **Bước 2: code `reminder-alert.ts`** - đúng ba câu của spec §4.3:

```ts
import { isDiscordForbidden } from './discord-rest';

/** Posted when the scheduled reminder found no reminder channel configured. */
export const REMINDER_NO_CHANNEL_ALERT =
  '⚠️ Nhắc điểm danh 9h không chạy: chưa có kênh nhắc. Gõ /cau-hinh-kenh trong kênh muốn dùng.';

/**
 * The admin alert for a scheduled reminder that threw.
 * Never quotes the error itself - it may carry database detail; the log has it.
 * @param error - What `ReminderService.run` threw
 * @returns The sentence to post in the admin channel
 */
export function reminderFailureText(error: unknown): string {
  if (isDiscordForbidden(error)) {
    return (
      '⚠️ Nhắc điểm danh 9h không gửi được: bot không có quyền gửi tin vào kênh nhắc. ' +
      'Kiểm tra quyền Send Messages hoặc chạy lại /cau-hinh-kenh trong kênh muốn dùng, rồi /nhac-diem-danh.'
    );
  }

  return '⚠️ Nhắc điểm danh 9h thất bại (lỗi hệ thống). Xem log Vercel, rồi chạy /nhac-diem-danh để nhắc bù.';
}
```

- [ ] **Bước 3: test đỏ - service** (`reminder.service.spec.ts`). Đổi stub `channels.get` thành
  `jest.fn((purpose) => purpose === 'ADMIN_ALERT' ? adminChannel : reminderChannel)` với option
  `adminChannelId` (mặc định `'999'`). Thêm `describe('ReminderService.runScheduled')`:

```ts
it('sent / nothing-due: không gửi tin báo', ...)          // postMessage không có lời gọi tới '999'
it('no-channel: báo vào kênh admin, trả outcome', async () => {
  const { service, postMessage } = makeService({ channelId: null });
  await expect(service.runScheduled()).resolves.toEqual({ status: 'no-channel' });
  expect(postMessage).toHaveBeenCalledWith('999', { content: REMINDER_NO_CHANNEL_ALERT });
});
it('run ném: báo rồi ném lại chính lỗi gốc', async () => {
  const boom = new DiscordApiError(403, '424242', '{}');
  postMessage.mockRejectedValueOnce(boom).mockResolvedValueOnce(undefined);
  await expect(service.runScheduled()).rejects.toBe(boom);
  expect(postMessage).toHaveBeenLastCalledWith('999', { content: reminderFailureText(boom) });
});
it('thiếu kênh admin: không gửi, vẫn ném lỗi gốc', ...)    // adminChannelId: null
it('gửi tin báo cũng lỗi: lỗi ném ra vẫn là lỗi gốc', ...) // postMessage reject cả hai lần
it('đọc kênh admin ném: lỗi ném ra vẫn là lỗi gốc', ...)    // channels.get('ADMIN_ALERT') reject
```

- [ ] **Bước 4: code `ReminderService`**

```ts
/**
 * The cron's run: `run('today')`, plus an alert in the admin channel when it threw or found no
 * reminder channel. The error is rethrown so Vercel still records the run as failed.
 * `/nhac-diem-danh` keeps calling `run`: the admin already reads the outcome in chat.
 */
async runScheduled(): Promise<ReminderOutcome> {
  let outcome: ReminderOutcome;
  try {
    outcome = await this.run('today');
  } catch (error) {
    await this.alert(reminderFailureText(error));
    throw error;
  }

  if (outcome.status === 'no-channel') await this.alert(REMINDER_NO_CHANNEL_ALERT);

  return outcome;
}

/**
 * Post one line to the admin channel. Never throws: the run's own failure is what must reach
 * Vercel, and a failing alert must not replace it.
 */
private async alert(content: string): Promise<void> {
  try {
    const channelId = await this.channels.get('ADMIN_ALERT');
    if (!channelId) {
      this.logger.warn('Chưa cấu hình channel cảnh báo admin - chạy /cau-hinh-kenh với mục đích "Cảnh báo admin".');
      return;
    }
    await this.rest.postMessage(channelId, { content });
  } catch (error) {
    // Swallowed: see above. The log is the only place left to say it.
    this.logger.error('Không gửi được tin cảnh báo admin', error as Error);
  }
}
```

  `try` bọc hai lệnh vì cả hai đều có thể ném và cùng một cách xử lý - comment nói rõ.
- [ ] **Bước 5: controller** - `reminder.controller.ts`: `return this.reminders.runScheduled();`, sửa
  JSDoc ("Always the `today` scope" giữ, thêm câu về tin báo). Test controller: gọi `runScheduled`,
  không gọi `run`.
- [ ] **Bước 6:** `pnpm --filter api test -- "reminder"` → PASS; `nhac-diem-danh.command.spec.ts` vẫn PASS
  (command vẫn gọi `run`).
- [ ] **Bước 7:** commit.

### Task 3: `/cau-hinh-kenh` option `muc-dich`

**Files:**
- Modify: `apps/api/src/modules/discord-bot/commands/cau-hinh-kenh.command.ts`
- Test: `__tests__/cau-hinh-kenh.command.spec.ts`, `__tests__/commands.spec.ts` (nếu nó snapshot definition)

**Consumes:** `BotChannelPurpose`, `set(purpose, channelId)` (Task 1); `commandOptionValue`,
`COMMAND_OPTION_TYPE` (cùng import như `nhac-diem-danh.command.ts`).

- [ ] **Bước 1: test đỏ**

```ts
it('không option: đặt kênh nhắc (hành vi cũ)', ...)
  // expect(set).toHaveBeenCalledWith('ATTENDANCE_REMINDER', '424242')
it('muc-dich = ADMIN_ALERT: đặt kênh admin, tin xác nhận của admin', ...)
  // INTERACTION.data.options = [{ name: 'muc-dich', type: 3, value: 'ADMIN_ALERT' }]
  // postMessage nhận content chứa 'báo lỗi cho admin'; set('ADMIN_ALERT', '424242')
it('giá trị lạ: ném lỗi nhắc discord:register', ...)
it('tin xác nhận bị từ chối: không lưu, với cả hai mục đích', ...)
```

- [ ] **Bước 2: code**

```ts
const PURPOSE_OPTION = 'muc-dich';

const PURPOSE_CHOICES = [
  { name: 'Nhắc điểm danh', value: 'ATTENDANCE_REMINDER' },
  { name: 'Cảnh báo admin', value: 'ADMIN_ALERT' },
] as const satisfies readonly { name: string; value: BotChannelPurpose }[];

const DEFAULT_PURPOSE: BotChannelPurpose = 'ATTENDANCE_REMINDER';

/** What each purpose posts as proof, and what the admin reads once it is saved. */
const PURPOSE_COPY: Record<BotChannelPurpose, { confirmation: string; saved: string }> = {
  ATTENDANCE_REMINDER: {
    confirmation: '✅ Channel này đã được đặt làm nơi bot nhắc điểm danh hằng ngày.',
    saved: 'Đã lưu. Từ giờ bot sẽ nhắc điểm danh trong channel này.',
  },
  ADMIN_ALERT: {
    confirmation: '✅ Channel này đã được đặt làm nơi bot báo lỗi cho admin.',
    saved: 'Đã lưu. Từ giờ bot sẽ báo lỗi nhắc điểm danh trong channel này.',
  },
};

function purposeOf(interaction: ApplicationCommandInteraction): BotChannelPurpose {
  const value = commandOptionValue(interaction, PURPOSE_OPTION);
  if (value === null) return DEFAULT_PURPOSE;

  const choice = PURPOSE_CHOICES.find((candidate) => candidate.value === value);
  if (!choice) {
    throw new Error(`Option ${PURPOSE_OPTION} của /cau-hinh-kenh không hợp lệ: ${value}`);
  }

  return choice.value;
}
```

  `definition` thêm `options: [{ name: PURPOSE_OPTION, description: 'Kênh nhắc điểm danh (mặc định) hay
  kênh báo lỗi cho admin', type: COMMAND_OPTION_TYPE.string, required: false, choices: [...PURPOSE_CHOICES] }]`;
  `description` lệnh đổi thành `'Đặt channel này làm nơi bot nhắc điểm danh hoặc báo lỗi (chỉ admin)'`.
  `execute`: `const purpose = purposeOf(interaction)` sau `requireAdmin`; dùng `PURPOSE_COPY[purpose]`;
  `deps.channels.set(purpose, channelId)`. Bỏ hai hằng `CONFIRMATION`/`SAVED` cũ.
- [ ] **Bước 3:** `pnpm --filter api test -- "cau-hinh-kenh|commands"` → PASS.
- [ ] **Bước 4:** commit.

### Task 4: Tài liệu + kiểm tra cuối

**Files:** `docs/architecture.md` (§3.3 dòng `discord-bot`, §5 dòng `BotChannel`, §8 đoạn cron),
`apps/api/prisma/schema.prisma` (comment model `BotChannel`: "Today it holds exactly one row" → hai
purpose, `ADMIN_ALERT` cho cron), `docs/production.md` (bước sau deploy).

- [ ] **Bước 1:** sửa §8: thay "nothing alerts when a run fails or silently sends nothing" bằng: lượt lỗi
  và lượt thiếu kênh nhắc báo vào kênh `ADMIN_ALERT`; còn lại không báo được khi cron không được gọi.
- [ ] **Bước 2:** `production.md`: sau deploy chạy `pnpm --filter api discord:register`, rồi
  `/cau-hinh-kenh muc-dich:Cảnh báo admin` một lần trong kênh admin.
- [ ] **Bước 3:** schema.prisma chỉ đổi comment → không cần migration; xác nhận
  `pnpm --filter api prisma:migrate` không sinh migration mới (hoặc bỏ qua bước nếu DB local không chạy, ghi lại).
- [ ] **Bước 4:** `pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test` → xanh.
- [ ] **Bước 5:** commit; review bằng `review-loop` (vòng cuối `pr-review` trong agent `reviewer` riêng);
  PR body ghi hai bước sau deploy.
