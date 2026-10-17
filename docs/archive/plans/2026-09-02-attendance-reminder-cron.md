# Nhắc điểm danh tự động — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi sáng 9h giờ VN, bot Discord tự tìm những ngày đánh có hạn chót vào ngày mai, và nhắc đích danh những người chưa điểm danh trong một channel do admin cấu hình.

**Architecture:** Lịch nằm ở `crons` trong `apps/api/vercel.json` — không phải `@nestjs/schedule` — vì API chạy như Vercel Function, không có process thường trú để tick. Vercel gọi `GET /api/cron/attendance-reminder` kèm `Authorization: Bearer $CRON_SECRET`; một guard riêng kiểm secret, `ReminderService` đọc lịch tuần đang mở, lọc theo luật "hạn chót rơi vào ngày mai", tìm người thiếu, rồi gửi một message qua Discord REST bằng bot token. Channel đích lưu trong bảng `BotChannel`, đặt bằng lệnh `/cau-hinh-kenh`.

**Tech Stack:** NestJS 11 · Prisma 7 + PostgreSQL · Zod 4 · Jest 30 · Discord Interactions + REST v10 · Vercel Cron

**Spec:** [`docs/superpowers/specs/2026-09-02-attendance-reminder-cron-design.md`](../specs/2026-09-02-attendance-reminder-cron-design.md)

## Global Constraints

- **Nhánh:** `feat/attendance-reminder-cron`. `main` được bảo vệ — không push thẳng.
- **Mọi lệnh chạy từ root** dạng `pnpm --filter api …`. Không có script nào ở root.
- **`apps/api` không có path alias.** Import nội bộ luôn là đường dẫn tương đối (`../../config`); code dùng chung import bằng tên package thật (`@guild/shared/lib`).
- **Ranh giới module (ESLint ép):** một module chỉ được import từ `<domain>.public.ts` hoặc `<domain>.module.ts` của module khác. Thêm export mới thì phải thêm vào `.public.ts`.
- **Không `forwardRef()`.** Có cycle nghĩa là logic thuộc về module thứ ba.
- **Copy hiển thị cho người dùng luôn là tiếng Việt.** Comment và tên file là tiếng Anh.
- **Doc comment tiếng Anh cho mọi hàm** (JSDoc): mục đích, từng `@param`, `@returns`, `@throws` khi có ném.
- **Mọi instant tính ở UTC+7 cố định**, qua `vnParts` / `shiftVnDate` / `vnWeekday` trong `@guild/shared/lib`. Không bao giờ dùng giờ local của máy chủ.
- **`Clock` là nguồn thời gian duy nhất.** Không gọi `new Date()` để hỏi "bây giờ là mấy giờ" ở ngoài seam đó.
- **Luật tuần/deadline chỉ sống ở** `apps/api/src/modules/battle-sessions/session-schedule.ts`.
- **Test đặt cạnh thứ nó phủ**, trong `__tests__/` bên cạnh thư mục module. Jest: `pnpm --filter api test`.
- **Commit message tiếng Anh, Conventional Commits**, mô tả viết thường, thể mệnh lệnh, không dấu chấm cuối, không dòng attribution.
- **Chạy `pnpm --filter api lint` và `pnpm --filter api typecheck`** trước commit cuối của mỗi task chạm code.

---

### Task 1: Luật ngày nhắc và nhãn hạn chót

Luật "nhắc vào buổi sáng của ngày trước hạn chót" là một luật lịch, nên nó thuộc `session-schedule.ts` chứ không phải module bot (architecture.md §7). Nhãn hạn chót cũng vậy: `WEEKDAY_NAMES` đang private ở đó, và chép nó sang chỗ khác là tạo ra quy ước nhãn thứ hai.

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts`
- Modify: `apps/api/src/modules/battle-sessions/battle-sessions.public.ts`
- Test: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`

**Interfaces:**
- Consumes: `vnParts`, `vnWeekday`, `shiftVnDate` từ `@guild/shared/lib`; `WEEKDAY_NAMES` (private, đã có trong file).
- Produces:
  - `isReminderDay(deadline: Date, now: Date): boolean`
  - `formatDeadlineLabel(deadline: Date): string`
  - Cả hai export lại qua `battle-sessions.public.ts`.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts`. Import `isReminderDay` và `formatDeadlineLabel` vào khối import sẵn có ở đầu file.

```ts
/**
 * A UTC instant for a Vietnam wall-clock moment.
 * @param iso - Vietnam local time, e.g. '2026-09-03T17:00'
 * @returns The matching UTC instant
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe('isReminderDay', () => {
  // Bang Chiến thứ 7 05/09 có hạn 17:00 thứ 5 03/09 → nhắc sáng thứ 4 02/09.
  const guildWarDeadline = vn('2026-09-03T17:00');

  it('đúng vào sáng của ngày liền trước hạn chót', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-02T09:00'))).toBe(true);
  });

  it('sai khi còn hai ngày nữa mới tới hạn', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-01T09:00'))).toBe(false);
  });

  it('sai vào chính ngày hết hạn', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-03T09:00'))).toBe(false);
  });

  it('sai sau khi đã quá hạn', () => {
    expect(isReminderDay(guildWarDeadline, vn('2026-09-04T09:00'))).toBe(false);
  });

  it('so theo ngày dương lịch VN, không theo khoảng 24 giờ', () => {
    // Cách nhau chưa tới 24 giờ nhưng vẫn là "ngày mai" theo lịch VN.
    expect(isReminderDay(vn('2026-09-03T01:00'), vn('2026-09-02T23:30'))).toBe(
      true,
    );
  });

  it('nửa đêm giờ VN cắt sang ngày mới, không phải nửa đêm UTC', () => {
    // 2026-09-02T23:30+07:00 là 16:30 UTC cùng ngày — nếu so bằng giờ UTC thì
    // "ngày mai" sẽ ra 03/09 ở cả hai vế và test trên vô nghĩa.
    expect(isReminderDay(vn('2026-09-04T09:00'), vn('2026-09-02T23:30'))).toBe(
      false,
    );
  });
});

describe('formatDeadlineLabel', () => {
  it('dựng giờ, thứ và ngày của hạn chót', () => {
    expect(formatDeadlineLabel(vn('2026-09-03T17:00'))).toBe(
      '17:00 · Thứ 5 (03/09)',
    );
  });

  it('đệm số 0 cho giờ, phút, ngày và tháng một chữ số', () => {
    expect(formatDeadlineLabel(vn('2026-09-07T09:05'))).toBe(
      '09:05 · Thứ 2 (07/09)',
    );
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- session-schedule`
Expected: FAIL — `isReminderDay is not a function` / `formatDeadlineLabel is not a function`.

- [ ] **Step 3: Cài đặt tối thiểu**

Thêm vào `apps/api/src/modules/battle-sessions/session-schedule.ts`, ngay dưới `formatSessionLabel`:

```ts
/**
 * Two digits, the form every label in this file uses.
 * @param value - A calendar or clock number
 * @returns The number as a zero-padded two-character string
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Whether a deadline should be reminded about today.
 *
 * The reminder goes out the morning **before** the deadline's own day, so the answer is a
 * comparison of Vietnam calendar days — not a 24-hour window. A deadline 23 hours away is still
 * "tomorrow" if it falls on tomorrow's date, and one 25 hours away is not "the day after" if it
 * does too.
 *
 * @param deadline - The session's attendance deadline
 * @param now - Current moment
 * @returns true when `deadline` falls on the Vietnam calendar day after `now`'s
 */
export function isReminderDay(deadline: Date, now: Date): boolean {
  const tomorrow = vnParts(shiftVnDate(now, 1, 0, 0));
  const target = vnParts(deadline);

  return (
    target.year === tomorrow.year &&
    target.month === tomorrow.month &&
    target.day === tomorrow.day
  );
}

/**
 * A deadline written out for a Discord message.
 *
 * Built here rather than in the bot module because `WEEKDAY_NAMES` and the way this project spells
 * a moment live in this file — a second copy would drift from `formatSessionLabel`.
 *
 * @param deadline - The session's attendance deadline
 * @returns A label like "17:00 · Thứ 5 (03/09)"
 */
export function formatDeadlineLabel(deadline: Date): string {
  const weekday = WEEKDAY_NAMES[vnWeekday(deadline)];
  const { day, month, hour, minute } = vnParts(deadline);

  return `${pad(hour)}:${pad(minute)} · ${weekday} (${pad(day)}/${pad(month)})`;
}
```

Đảm bảo `shiftVnDate` có trong khối import từ `@guild/shared/lib` ở đầu file — hôm nay file này đã import `vnWeekday` và `vnParts`, có thể chưa có `shiftVnDate`.

Nếu `formatSessionLabel` đang tự viết `String(hour).padStart(2, '0')` thì đổi nó sang dùng `pad` luôn — cùng một phép, hai cách viết là bất đối xứng vô cớ.

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- session-schedule`
Expected: PASS, và mọi test cũ trong file vẫn xanh.

- [ ] **Step 5: Export qua public surface**

Thêm hai tên vào khối export sẵn có trong `apps/api/src/modules/battle-sessions/battle-sessions.public.ts`, giữ thứ tự chữ cái:

```ts
export {
  formatDeadlineLabel,
  formatSessionLabel,
  isReminderDay,
  isSameWeek,
  isSessionLocked,
  parseWeekStart,
  weekEndOf,
  weekStartOf,
} from './session-schedule';
```

- [ ] **Step 6: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/battle-sessions
git commit -m "feat(api): add the reminder-day rule and the deadline label"
```

---

### Task 2: Hai biến môi trường bắt buộc

`CRON_SECRET` bảo vệ endpoint cron; `DISCORD_BOT_TOKEN` cho phép bot chủ động gửi tin. Token này đã có trong `.env.example` nhưng chỉ để script `discord:register` đọc — giờ nó thành biến runtime, nên phải đi qua `env.validation.ts` và đổi chỗ trong file mẫu, nếu không comment ở đó sẽ nói dối.

**Files:**
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/.env.example`
- Modify: `docs/development.md` (bảng §3)
- Modify: `docs/production.md` (bảng §3)
- Test: `apps/api/src/config/__tests__/env.validation.spec.ts`

**Interfaces:**
- Produces: `Env['CRON_SECRET']: string`, `Env['DISCORD_BOT_TOKEN']: string` — đọc bằng `config.get('CRON_SECRET', { infer: true })`.

- [ ] **Step 1: Viết test thất bại**

Trong `apps/api/src/config/__tests__/env.validation.spec.ts` có sẵn một object env hợp lệ dùng chung (tên thường là `validEnv` hoặc tương tự). Thêm hai khoá vào object đó:

```ts
  CRON_SECRET: 'x'.repeat(32),
  DISCORD_BOT_TOKEN: 'bot-token-value',
```

rồi thêm các test:

```ts
describe('CRON_SECRET', () => {
  it('bắt buộc — thiếu là ném', () => {
    const { CRON_SECRET, ...withoutSecret } = validEnv;

    expect(() => validateEnv(withoutSecret)).toThrow('CRON_SECRET');
  });

  it('từ chối chuỗi ngắn hơn 32 ký tự', () => {
    expect(() => validateEnv({ ...validEnv, CRON_SECRET: 'ngan' })).toThrow(
      'CRON_SECRET',
    );
  });
});

describe('DISCORD_BOT_TOKEN', () => {
  it('bắt buộc — thiếu là ném', () => {
    const { DISCORD_BOT_TOKEN, ...withoutToken } = validEnv;

    expect(() => validateEnv(withoutToken)).toThrow('DISCORD_BOT_TOKEN');
  });
});
```

Nếu tên biến chứa env hợp lệ trong file khác `validEnv`, dùng đúng tên đang có; đừng đổi tên nó.

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- env.validation`
Expected: FAIL — hai test "thiếu là ném" fail vì schema chưa biết đến hai biến này nên vẫn parse thành công.

- [ ] **Step 3: Cài đặt tối thiểu**

Trong `apps/api/src/config/env.validation.ts`, thêm vào `envSchema` ngay sau `DISCORD_GUILD_ROLE_ID`:

```ts
  /**
   * Bot token, `Authorization: Bot <token>` on every outgoing Discord call.
   * Developer Portal → Bot → Reset Token; shown exactly once.
   */
  DISCORD_BOT_TOKEN: z.string().min(1),
  /**
   * Shared secret Vercel Cron sends as `Authorization: Bearer <secret>`.
   * Required: the endpoint behind it messages the whole guild, so booting without a secret would
   * mean booting with the endpoint wide open.
   */
  CRON_SECRET: z.string().min(32),
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- env.validation`
Expected: PASS.

- [ ] **Step 5: Cập nhật `.env.example`**

Trong `apps/api/.env.example`: **xoá** dòng `DISCORD_BOT_TOKEN=` khỏi khối cuối (khối có comment "Read only by `pnpm --filter api discord:register`"), và sửa comment của khối đó để nó chỉ còn nói về `DISCORD_GUILD_ID`:

```dotenv
# Read only by `pnpm --filter api discord:register`, never by the running app — which is why it is
# not in env.validation.ts. Local and production are two different Discord Applications, so
# .env.production carries its own value and is selected per command:
#   DISCORD_ENV_FILE=.env.production pnpm --filter api discord:register
# Discord server id. Enable Developer Mode, then right-click the server name → Copy Server ID.
DISCORD_GUILD_ID=
```

Rồi thêm, ngay sau khối `DISCORD_GUILD_ROLE_ID`:

```dotenv
# Bot token — Developer Portal → Bot → Reset Token. Shown exactly once. Used both by
# `discord:register` and by the running app, which posts the attendance reminder with it.
# Required: a missing value kills the API at boot.
DISCORD_BOT_TOKEN=

# Shared secret for the cron endpoint. Vercel sends it as `Authorization: Bearer <secret>` on the
# scheduled call and the guard rejects everything else. At least 32 characters.
# Generate one: openssl rand -hex 32
CRON_SECRET=
```

- [ ] **Step 6: Cập nhật hai bảng env trong docs**

Trong `docs/development.md` §3, thêm hai dòng ngay dưới dòng `DISCORD_GUILD_ROLE_ID`, giữ đúng số cột của bảng:

```markdown
| `DISCORD_BOT_TOKEN` | ✅ | — | Bot token (Developer Portal → Bot → Reset Token). Dùng cho cả `discord:register` lẫn lời gọi Discord đi ra khi bot đăng tin nhắc — **the API refuses to boot without it** |
| `CRON_SECRET` | ✅ | — | Secret của endpoint cron; Vercel gửi kèm dạng `Authorization: Bearer …`. Ít nhất 32 ký tự (`openssl rand -hex 32`). Local đặt giá trị bất kỳ cũng được — cron không chạy ở local |
```

Trong `docs/production.md` §3, thêm hai dòng tương ứng dưới dòng `DISCORD_GUILD_ROLE_ID`:

```markdown
| `DISCORD_BOT_TOKEN` | Bot token của **đúng** application của môi trường đó. **Set it before merging**: bắt buộc, thiếu là API không boot |
| `CRON_SECRET` | Secret của `GET /api/cron/attendance-reminder`. Vercel tự gắn nó vào lời gọi cron khi biến tồn tại. **Set it before merging**: bắt buộc, thiếu là API không boot |
```

- [ ] **Step 7: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/config apps/api/.env.example docs/development.md docs/production.md
git commit -m "feat(api): require the bot token and a cron secret at boot"
```

---

### Task 3: Bảng `BotChannel` và service đọc/ghi nó

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_bot_channel/migration.sql` (Prisma sinh)
- Create: `apps/api/src/modules/discord-bot/bot-channel.service.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/bot-channel.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` từ `../../infrastructure/prisma/prisma.service`.
- Produces:
  - `ATTENDANCE_REMINDER = 'ATTENDANCE_REMINDER'` (hằng số, export)
  - `class BotChannelService { get(): Promise<string | null>; set(channelId: string): Promise<void> }`

- [ ] **Step 1: Thêm model vào schema**

Thêm vào cuối `apps/api/prisma/schema.prisma`:

```prisma
/// A Discord channel the bot posts to, keyed by what it posts there.
///
/// Global configuration like `TeamName`, hanging off nothing: it is not a property of a week, a
/// member or a session. Today it holds exactly one row, `ATTENDANCE_REMINDER`.
///
/// `purpose` is a String and not a Prisma enum on purpose: every enum in this schema has to stay in
/// step with `packages/shared/enums`, and this value never crosses the network to the web app — so
/// making it carry that obligation buys nothing.
model BotChannel {
  purpose   String   @id
  /// Discord channel id (snowflake), written by /cau-hinh-kenh.
  channelId String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Sinh migration**

Run: `pnpm --filter api prisma:migrate --name add_bot_channel`
Expected: một thư mục migration mới, và `src/generated/prisma` được sinh lại. Cần database local đang chạy (`pnpm --filter api db:up`).

Đọc file `migration.sql` vừa sinh, xác nhận nó chỉ có `CREATE TABLE` — không có `DROP` nào. Đây là bảng mới nên không có bước chuyển dữ liệu tay.

- [ ] **Step 3: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/bot-channel.service.spec.ts`:

```ts
import {
  ATTENDANCE_REMINDER,
  BotChannelService,
} from '../bot-channel.service';

/**
 * A Prisma stub exposing only the botChannel model the service touches.
 * @param row - What findUnique resolves to
 * @returns The stub plus its jest mocks, for assertions
 */
function makePrisma(row: { channelId: string } | null) {
  const findUnique = jest.fn().mockResolvedValue(row);
  const upsert = jest.fn().mockResolvedValue(undefined);

  return { prisma: { botChannel: { findUnique, upsert } }, findUnique, upsert };
}

describe('BotChannelService', () => {
  it('trả về channel đã cấu hình', async () => {
    const { prisma, findUnique } = makePrisma({ channelId: '424242' });
    const service = new BotChannelService(prisma as never);

    await expect(service.get()).resolves.toBe('424242');
    expect(findUnique).toHaveBeenCalledWith({
      where: { purpose: ATTENDANCE_REMINDER },
    });
  });

  it('trả về null khi chưa ai cấu hình', async () => {
    const { prisma } = makePrisma(null);
    const service = new BotChannelService(prisma as never);

    await expect(service.get()).resolves.toBeNull();
  });

  it('ghi đè dòng cũ thay vì thêm dòng thứ hai', async () => {
    const { prisma, upsert } = makePrisma(null);
    const service = new BotChannelService(prisma as never);

    await service.set('999');

    expect(upsert).toHaveBeenCalledWith({
      where: { purpose: ATTENDANCE_REMINDER },
      create: { purpose: ATTENDANCE_REMINDER, channelId: '999' },
      update: { channelId: '999' },
    });
  });
});
```

- [ ] **Step 4: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- bot-channel`
Expected: FAIL — không resolve được `../bot-channel.service`.

- [ ] **Step 5: Cài đặt tối thiểu**

Create `apps/api/src/modules/discord-bot/bot-channel.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * The one row this table holds today: where the attendance reminder is posted.
 * A constant rather than an enum — see the model's comment in schema.prisma.
 */
export const ATTENDANCE_REMINDER = 'ATTENDANCE_REMINDER';

/**
 * Reads and writes the channel the bot posts the attendance reminder to.
 *
 * Talks to Prisma directly instead of through a repository: two calls on one table is not the
 * "complex or repeated queries" that earns a repository (architecture.md §3.2).
 */
@Injectable()
export class BotChannelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The configured channel.
   *
   * `null` is a normal state, not a failure: an admin may simply not have run `/cau-hinh-kenh`
   * yet. Unlike a missing env variable it cannot be checked at boot, so the caller decides what to
   * do about it.
   *
   * @returns The Discord channel id, or null when nothing is configured
   */
  async get(): Promise<string | null> {
    const row = await this.prisma.botChannel.findUnique({
      where: { purpose: ATTENDANCE_REMINDER },
    });

    return row?.channelId ?? null;
  }

  /**
   * Point the reminder at a channel, replacing whatever was there.
   * @param channelId - Discord channel id
   * @returns A promise resolving once the row is written
   */
  async set(channelId: string): Promise<void> {
    await this.prisma.botChannel.upsert({
      where: { purpose: ATTENDANCE_REMINDER },
      create: { purpose: ATTENDANCE_REMINDER, channelId },
      update: { channelId },
    });
  }
}
```

- [ ] **Step 6: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- bot-channel`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/prisma apps/api/src/modules/discord-bot
git commit -m "feat(api): store the bot announcement channel"
```

---

### Task 4: Client gọi Discord REST

Lần đầu bot chủ động gọi Discord — tới giờ nó chỉ trả lời webhook. Một provider mỏng bọc `fetch`, đúng một phương thức. Không thêm `discord.js`: dự án cần một lời gọi `POST /channels/{id}/messages`, còn thư viện đó mang theo một gateway WebSocket mà Vercel Function không giữ được.

**Files:**
- Create: `apps/api/src/modules/discord-bot/discord-rest.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/discord-rest.spec.ts`

**Interfaces:**
- Consumes: `MessagePayload` từ `./commands/command.types`; `ConfigService<Env, true>`.
- Produces: `class DiscordRestClient { postMessage(channelId: string, payload: MessagePayload): Promise<void> }` — ném `Error` khi Discord từ chối.

- [ ] **Step 1: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/discord-rest.spec.ts`:

```ts
import { DiscordRestClient } from '../discord-rest';

const CONFIG = { get: () => 'bot-token-value' } as never;

/**
 * Replace global fetch with a stub for one test.
 * @param response - What fetch resolves to
 * @returns The jest mock, for assertions
 */
function stubFetch(response: { ok: boolean; status?: number; text?: string }) {
  const mock = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    text: async () => response.text ?? '',
  });

  global.fetch = mock as never;

  return mock;
}

describe('DiscordRestClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gửi payload tới đúng channel, kèm bot token', async () => {
    const fetchMock = stubFetch({ ok: true });
    const client = new DiscordRestClient(CONFIG);

    await client.postMessage('424242', { content: 'chào' });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe('https://discord.com/api/v10/channels/424242/messages');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bot bot-token-value');
    expect(JSON.parse(init.body)).toEqual({ content: 'chào' });
  });

  it('ném kèm status khi Discord từ chối', async () => {
    stubFetch({ ok: false, status: 403, text: '{"message":"Missing Access"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessage('424242', { content: 'chào' }),
    ).rejects.toThrow('403');
  });

  it('mang theo thân lỗi để log đọc được nguyên nhân', async () => {
    stubFetch({ ok: false, status: 403, text: '{"message":"Missing Access"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessage('424242', { content: 'chào' }),
    ).rejects.toThrow('Missing Access');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- discord-rest`
Expected: FAIL — không resolve được `../discord-rest`.

- [ ] **Step 3: Cài đặt tối thiểu**

Create `apps/api/src/modules/discord-bot/discord-rest.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config';
import type { MessagePayload } from './commands/command.types';

/** Base of Discord's REST API, pinned to the version the payload shapes were written against. */
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * The bot's outgoing calls to Discord.
 *
 * Every reply to an interaction travels back in the webhook's own HTTP response, so until the
 * reminder existed the bot never called Discord at all. This is that one direction: a message the
 * bot sends because a schedule said so, not because someone typed something.
 *
 * A hand-written `fetch` wrapper rather than `discord.js`: what is needed is one route, and that
 * library is built around a gateway WebSocket a Vercel Function cannot hold open.
 */
@Injectable()
export class DiscordRestClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Post a message into a channel.
   * @param channelId - Discord channel id
   * @param payload - The message body, the same shape an interaction reply carries
   * @returns A promise resolving once Discord has accepted the message
   * @throws Error when Discord rejects the call — the status and its response body are both in the
   *   message, because "the reminder did not arrive" is otherwise unanswerable from a log
   */
  async postMessage(channelId: string, payload: MessagePayload): Promise<void> {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.config.get('DISCORD_BOT_TOKEN', { infer: true })}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Discord từ chối gửi tin vào channel ${channelId} (${response.status}): ${await response.text()}`,
      );
    }
  }
}
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- discord-rest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add a discord rest client for outgoing messages"
```

---

### Task 5: Rút hàng nút chung ra khỏi `announcement.ts`

Tin nhắc mang **cùng** hàng nút với `/thong-bao`. Dựng lại nó ở file thứ hai là hai bản sao sẽ trôi khỏi nhau — đổi nhãn một nút ở một chỗ rồi quên chỗ kia. `announcement.spec.ts` **không đổi**, và chính nó là bằng chứng việc rút không đổi hành vi.

**Files:**
- Create: `apps/api/src/modules/discord-bot/entry-buttons.ts`
- Modify: `apps/api/src/modules/discord-bot/announcement.ts`
- Modify: `apps/api/src/modules/discord-bot/custom-id.ts` (chỉ doc comment)
- Test: `apps/api/src/modules/discord-bot/__tests__/announcement.spec.ts` (giữ nguyên, phải vẫn xanh)

**Interfaces:**
- Produces: `buildEntryButtons(webOrigin: string): ActionRow`

- [ ] **Step 1: Tạo file mới, chuyển nguyên hàm sang**

Create `apps/api/src/modules/discord-bot/entry-buttons.ts`. Nội dung là hàm `buildButtons` đang private trong `announcement.ts`, đổi tên và export:

```ts
import type { ActionRow } from './commands/command.types';
import { ANNOUNCEMENT_ATTENDANCE_ID } from './custom-id';
import { BUTTON_STYLE, COMPONENT_TYPE } from './discord.constants';

/**
 * The row of buttons under any message the bot addresses to the whole guild.
 *
 * Shared by the weekly announcement and the attendance reminder rather than built in each: the two
 * messages are the same offer — answer here, or go look at the site — and two copies of one row
 * drift the first time a label changes.
 *
 * @param webOrigin - Origin of the web app
 * @returns One action row holding both buttons
 */
export function buildEntryButtons(webOrigin: string): ActionRow {
  return {
    type: COMPONENT_TYPE.actionRow,
    components: [
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.primary,
        label: '✅ Điểm danh ngay',
        custom_id: ANNOUNCEMENT_ATTENDANCE_ID,
      },
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.link,
        label: '🌐 Mở website',
        url: webOrigin,
      },
    ],
  };
}
```

- [ ] **Step 2: Cho `announcement.ts` dùng nó**

Trong `apps/api/src/modules/discord-bot/announcement.ts`:
- Xoá hàm private `buildButtons` và mọi import nay không còn ai dùng (`ActionRow`, `ANNOUNCEMENT_ATTENDANCE_ID`, `BUTTON_STYLE`, `COMPONENT_TYPE` — kiểm tra từng cái, `EMBED_COLOR` vẫn cần).
- Thêm `import { buildEntryButtons } from './entry-buttons';`
- Trong `buildAnnouncement`, đổi `components: [buildButtons(links.webOrigin)]` thành `components: [buildEntryButtons(links.webOrigin)]`.

- [ ] **Step 3: Chạy test cũ cho chắc là không đổi hành vi**

Run: `pnpm --filter api test -- announcement`
Expected: PASS, không sửa một dòng test nào. Nếu có test đỏ thì việc rút đã đổi hành vi — sửa code, đừng sửa test.

- [ ] **Step 4: Sửa doc comment của `ANNOUNCEMENT_ATTENDANCE_ID`**

Trong `apps/api/src/modules/discord-bot/custom-id.ts`, thay doc comment của hằng số đó — nó đang nói nút chỉ nằm trên thông báo `/thong-bao`:

```ts
/**
 * custom_id of the "Điểm danh ngay" button, on both the `/thong-bao` announcement and the
 * attendance reminder.
 *
 * A fixed string rather than an encoded value: the button always means "open the presser's own
 * board", and who is pressing arrives inside the signed interaction — so the same id works on any
 * message the bot sends. Two parts behind an `ann` prefix, so `decodeAttendanceButtonId` — which
 * wants four parts behind `dd` — can never take it for an attendance button.
 */
```

- [ ] **Step 5: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "refactor(api): share the entry button row between bot messages"
```

---

### Task 6: Dựng nội dung tin nhắc (thuần, không I/O)

Toàn bộ hình dạng message nằm ở đây và không chạm database, nên layout test được bằng dữ liệu dựng tay. Hai ràng buộc quan trọng nhất: **mention phải ở `content`** (Discord không báo cho mention nằm trong embed), và **mỗi người chỉ xuất hiện một lần** dù thiếu mấy ngày (nếu không, ba ngày đánh là chạm trần 2000 ký tự).

**Files:**
- Create: `apps/api/src/modules/discord-bot/reminder.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/command.types.ts` (`allowed_mentions.users`)
- Test: `apps/api/src/modules/discord-bot/__tests__/reminder.spec.ts`

**Interfaces:**
- Consumes: `BattleSession` từ `@guild/shared/schemas`; `formatDeadlineLabel` từ `../battle-sessions/battle-sessions.public` (Task 1); `buildEntryButtons` (Task 5); `EMBED_COLOR`.
- Produces:
  - `interface MissingMember { name: string; discordId: string | null }`
  - `interface DueSession { session: BattleSession; missing: MissingMember[] }`
  - `buildReminder(due: readonly DueSession[], webOrigin: string): MessagePayload`

- [ ] **Step 1: Mở `allowed_mentions` cho user**

Trong `apps/api/src/modules/discord-bot/commands/command.types.ts`, sửa trường `allowed_mentions` của `MessagePayload`:

```ts
  /**
   * What this message is allowed to ping, snake_case because it is Discord's payload. Present to
   * *close* the default, not to open it: a message built from admin-entered text could otherwise
   * carry an `@everyone` nobody intended. Each list is declared only by the message that pings that
   * kind — the announcement names roles, the reminder names users.
   */
  allowed_mentions?: { roles?: string[]; users?: string[] };
```

`/thong-bao` đang truyền `{ roles: [...] }`, vẫn hợp lệ sau thay đổi này.

- [ ] **Step 2: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/reminder.spec.ts`:

```ts
import type { BattleSession } from '@guild/shared/schemas';

import { buildReminder, type DueSession } from '../reminder';

const WEB_ORIGIN = 'https://mmgh-nth.vercel.app';

/**
 * A battle session with only the fields the reminder reads.
 * @param overrides - Fields to change
 * @returns A session shaped like the API returns one
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'gw-2026-09-05',
    label: 'Thứ 7 · 20:00 · Bang Chiến',
    dateTime: '2026-09-05T13:00:00.000Z',
    deadline: '2026-09-03T10:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: true,
    opponent: null,
    weekStart: '2026-08-30T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

/** One due session with two linked members missing. */
const GUILD_WAR: DueSession = {
  session: session(),
  missing: [
    { name: 'Mèo Béo', discordId: '111' },
    { name: 'Cún Con', discordId: '222' },
  ],
};

describe('buildReminder', () => {
  it('đặt mention trong content, vì embed không ping ai', () => {
    const payload = buildReminder([GUILD_WAR], WEB_ORIGIN);

    expect(payload.content).toContain('<@111>');
    expect(payload.content).toContain('<@222>');
    expect(payload.embeds?.[0].description).not.toContain('<@111>');
  });

  it('mỗi người chỉ mention một lần dù thiếu nhiều ngày', () => {
    const scrim: DueSession = {
      session: session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      missing: [{ name: 'Mèo Béo', discordId: '111' }],
    };

    const payload = buildReminder([GUILD_WAR, scrim], WEB_ORIGIN);

    expect(payload.content.match(/<@111>/g)).toHaveLength(1);
  });

  it('khoá allowed_mentions vào đúng những người được nhắc', () => {
    const payload = buildReminder([GUILD_WAR], WEB_ORIGIN);

    expect(payload.allowed_mentions).toEqual({ users: ['111', '222'] });
  });

  it('mỗi ngày đánh một heading riêng, icon theo loại', () => {
    const scrim: DueSession = {
      session: session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      missing: [{ name: 'Bún Chả', discordId: '333' }],
    };

    const description = buildReminder([GUILD_WAR, scrim], WEB_ORIGIN)
      .embeds?.[0].description as string;

    expect(description).toContain('### 🛡️ Thứ 7 · 20:00 · Bang Chiến');
    expect(description).toContain('### ⚔️ Thứ 5 · 20:30');
  });

  it('in hạn chót đã dựng thành chữ', () => {
    const description = buildReminder([GUILD_WAR], WEB_ORIGIN).embeds?.[0]
      .description as string;

    // 2026-09-03T10:00:00Z là 17:00 giờ VN thứ 5 ngày 03/09.
    expect(description).toContain('17:00 · Thứ 5 (03/09)');
  });

  it('người chưa liên kết Discord hiện tên nhưng không lọt vào mention', () => {
    const due: DueSession = {
      session: session(),
      missing: [
        { name: 'Mèo Béo', discordId: '111' },
        { name: 'Chim Sẻ', discordId: null },
      ],
    };

    const payload = buildReminder([due], WEB_ORIGIN);
    const description = payload.embeds?.[0].description as string;

    expect(payload.allowed_mentions).toEqual({ users: ['111'] });
    expect(description).toContain('Chưa liên kết Discord: Chim Sẻ');
    expect(description).toContain('Mèo Béo');
  });

  it('số đếm tính cả người chưa liên kết Discord', () => {
    const due: DueSession = {
      session: session(),
      missing: [
        { name: 'Mèo Béo', discordId: '111' },
        { name: 'Chim Sẻ', discordId: null },
      ],
    };

    expect(buildReminder([due], WEB_ORIGIN).embeds?.[0].description).toContain(
      'còn 2 người',
    );
  });

  it('bỏ dòng "chưa liên kết" khi mọi người đều có Discord ID', () => {
    expect(
      buildReminder([GUILD_WAR], WEB_ORIGIN).embeds?.[0].description,
    ).not.toContain('Chưa liên kết Discord');
  });

  it('mang cùng hàng nút với thông báo tuần', () => {
    const row = buildReminder([GUILD_WAR], WEB_ORIGIN).components?.[0];

    expect(row?.components).toHaveLength(2);
    expect(row?.components[1]).toMatchObject({ url: WEB_ORIGIN });
  });
});
```

- [ ] **Step 3: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- reminder.spec`
Expected: FAIL — không resolve được `../reminder`.

- [ ] **Step 4: Cài đặt tối thiểu**

Create `apps/api/src/modules/discord-bot/reminder.ts`:

```ts
import type { BattleSession } from '@guild/shared/schemas';

import { formatDeadlineLabel } from '../battle-sessions/battle-sessions.public';
import type { MessagePayload } from './commands/command.types';
import { EMBED_COLOR } from './discord.constants';
import { buildEntryButtons } from './entry-buttons';

const TITLE = '⏰ CHƯA ĐIỂM DANH';

const LEAD = '⏰ **Nhắc điểm danh** — mấy ngày dưới đây hết hạn vào ngày mai.';

const FOOTER = 'Guild Manager';

/** One member who has not answered for a session. */
export interface MissingMember {
  name: string;
  /** null when no admin has filled in their Discord ID yet — they cannot be mentioned. */
  discordId: string | null;
}

/** One battle day whose deadline falls tomorrow, with everyone still missing from it. */
export interface DueSession {
  session: BattleSession;
  missing: MissingMember[];
}

/**
 * One battle day as a block of the embed.
 *
 * The day's name is a `###` heading: Discord renders it visibly larger than body text, which is the
 * only size control an embed offers, and a heading always starts its own line. The label itself is
 * the one the backend already built (`formatSessionLabel`), never rebuilt here.
 *
 * Names, not mentions: a mention inside an embed notifies nobody, so spending its characters here
 * would only make the message longer. The pings live in `content`.
 *
 * @param due - The battle day and who is missing from it
 * @returns Heading, a detail line, the names, and the unlinked line when there is one
 */
function toBlock(due: DueSession): string {
  const icon = due.session.isGuildWar ? '🛡️' : '⚔️';
  const deadline = formatDeadlineLabel(new Date(due.session.deadline));

  const linked = due.missing.filter((member) => member.discordId !== null);
  const unlinked = due.missing.filter((member) => member.discordId === null);

  const lines = [
    `### ${icon} ${due.session.label}`,
    `⏳ Hạn: ${deadline} · 👥 còn ${due.missing.length} người`,
    linked.map((member) => member.name).join(', '),
  ];

  // Said out loud rather than dropped: nobody can ping them, so an admin has to — and has to know.
  if (unlinked.length > 0) {
    lines.push(
      `Chưa liên kết Discord: ${unlinked.map((member) => member.name).join(', ')}`,
    );
  }

  return lines.filter((line) => line.length > 0).join('\n');
}

/**
 * Every Discord ID to ping, each exactly once.
 *
 * The union rather than a list per battle day: somebody missing three days would otherwise be
 * mentioned three times, and three days' worth of mentions is where a 2000-character message body
 * runs out.
 *
 * @param due - The due battle days
 * @returns Discord IDs in the order they were first met
 */
function mentionedIds(due: readonly DueSession[]): string[] {
  const ids = due.flatMap((day) =>
    day.missing
      .map((member) => member.discordId)
      .filter((id): id is string => id !== null),
  );

  return [...new Set(ids)];
}

/**
 * Build the attendance reminder.
 *
 * Pure: everything it shows arrives in `due`, so the whole layout is testable without a database.
 * The mentions live in `content` rather than inside the embed, because Discord only notifies people
 * for mentions in the message text.
 *
 * @param due - Battle days whose deadline falls tomorrow, each with everyone still missing. Never
 *   empty and never carrying an empty `missing`: `ReminderService` drops those before calling, so a
 *   message that says nothing is never built
 * @param webOrigin - Origin of the web app, for the link button
 * @returns The message body, ready for `DiscordRestClient.postMessage`
 */
export function buildReminder(
  due: readonly DueSession[],
  webOrigin: string,
): MessagePayload {
  const ids = mentionedIds(due);

  return {
    content: `${LEAD}\n${ids.map((id) => `<@${id}>`).join(' ')}`,
    embeds: [
      {
        title: TITLE,
        // A blank line between blocks: Discord collapses a heading against the line above it.
        description: due.map(toBlock).join('\n\n'),
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [buildEntryButtons(webOrigin)],
    allowed_mentions: { users: ids },
  };
}
```

- [ ] **Step 5: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- reminder.spec`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): build the attendance reminder message"
```

---

### Task 7: `ReminderService` — chọn ngày, tìm người thiếu, gửi

Đây là thân của cả cron lẫn `/nhac-diem-danh`; hai đường đó gọi cùng một hàm chứ không phải hai bản sao. Ba nhánh "không gửi gì" đều là trạng thái bình thường, không phải lỗi: một tin "hôm nay không có gì" mỗi sáng là cách nhanh nhất khiến người ta tắt thông báo channel.

**Files:**
- Create: `apps/api/src/modules/discord-bot/reminder.service.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/reminder.service.spec.ts`

**Interfaces:**
- Consumes: `BattleSessionsService.listByWeek()`, `AttendanceService.getRecords()`, `CharactersService.listRows()`, `BotChannelService.get()` (Task 3), `DiscordRestClient.postMessage()` (Task 4), `buildReminder` (Task 6), `isReminderDay` (Task 1), `Clock`, `ConfigService<Env, true>`.
- Produces:
  - `interface ReminderResult { sent: boolean; sessionCount: number; missingCount: number }`
  - `class ReminderService { run(): Promise<ReminderResult> }`

- [ ] **Step 1: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/reminder.service.spec.ts`:

```ts
import type { BattleSession } from '@guild/shared/schemas';

import { FixedClock } from '../../../common';
import { ReminderService } from '../reminder.service';

/** 09:00 giờ VN thứ 4 02/09/2026 — sáng trước hạn 17:00 thứ 5 03/09. */
const NOW = new Date('2026-09-02T02:00:00.000Z');

/**
 * A battle session with only the fields the service reads.
 * @param overrides - Fields to change
 * @returns A session shaped like the API returns one
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'gw-2026-09-05',
    label: 'Thứ 7 · 20:00 · Bang Chiến',
    dateTime: '2026-09-05T13:00:00.000Z',
    // 17:00 giờ VN thứ 5 03/09 → hạn rơi vào "ngày mai" so với NOW.
    deadline: '2026-09-03T10:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: true,
    opponent: null,
    weekStart: '2026-08-30T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

interface Options {
  channelId?: string | null;
  sessions?: BattleSession[];
  records?: { characterId: string; sessionId: string }[];
  members?: { id: string; name: string; discordId: string | null }[];
}

/**
 * Build the service around stubbed collaborators.
 * @param options - What each collaborator resolves to
 * @returns The service plus the postMessage mock, for assertions
 */
function makeService(options: Options = {}) {
  const postMessage = jest.fn().mockResolvedValue(undefined);

  const service = new ReminderService(
    {
      listByWeek: jest.fn().mockResolvedValue(options.sessions ?? [session()]),
    } as never,
    { getRecords: jest.fn().mockResolvedValue(options.records ?? []) } as never,
    {
      listRows: jest.fn().mockResolvedValue(
        options.members ?? [
          { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
        ],
      ),
    } as never,
    { get: jest.fn().mockResolvedValue(options.channelId ?? '424242') } as never,
    { postMessage } as never,
    new FixedClock(NOW),
    { get: () => 'https://mmgh-nth.vercel.app' } as never,
  );

  return { service, postMessage };
}

describe('ReminderService.run', () => {
  it('gửi khi có ngày tới hạn và còn người thiếu', async () => {
    const { service, postMessage } = makeService();

    await expect(service.run()).resolves.toEqual({
      sent: true,
      sessionCount: 1,
      missingCount: 1,
    });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0][0]).toBe('424242');
  });

  it('không gửi gì khi chưa cấu hình channel', async () => {
    const { service, postMessage } = makeService({ channelId: null });

    await expect(service.run()).resolves.toMatchObject({ sent: false });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('không gửi gì khi không ngày nào tới hạn vào mai', async () => {
    const { service, postMessage } = makeService({
      // Hạn 17:00 thứ 5 10/09 — còn hơn một ngày nữa.
      sessions: [session({ deadline: '2026-09-10T10:00:00.000Z' })],
    });

    await expect(service.run()).resolves.toMatchObject({
      sent: false,
      sessionCount: 0,
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('không gửi gì khi mọi người đã trả lời', async () => {
    const { service, postMessage } = makeService({
      records: [{ characterId: 'meo-beo', sessionId: 'gw-2026-09-05' }],
    });

    await expect(service.run()).resolves.toMatchObject({
      sent: false,
      missingCount: 0,
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('người trả lời "Không" cũng là đã điểm danh', async () => {
    // Record tồn tại là đã trả lời; isPresent chỉ là nội dung câu trả lời.
    const { service, postMessage } = makeService({
      records: [
        {
          characterId: 'meo-beo',
          sessionId: 'gw-2026-09-05',
          isPresent: false,
        },
      ] as never,
    });

    await expect(service.run()).resolves.toMatchObject({ sent: false });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('bỏ ngày đã đủ người, giữ ngày còn thiếu', async () => {
    const { service, postMessage } = makeService({
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
      records: [{ characterId: 'meo-beo', sessionId: 's1' }],
    });

    await expect(service.run()).resolves.toMatchObject({
      sent: true,
      sessionCount: 1,
    });

    const description = postMessage.mock.calls[0][1].embeds[0].description;

    expect(description).toContain('Bang Chiến');
    expect(description).not.toContain('Thứ 5 · 20:30');
  });

  it('đếm mỗi người một lần dù thiếu nhiều ngày', async () => {
    const { service } = makeService({
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
    });

    await expect(service.run()).resolves.toMatchObject({ missingCount: 1 });
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- reminder.service`
Expected: FAIL — không resolve được `../reminder.service`.

- [ ] **Step 3: Cài đặt tối thiểu**

Create `apps/api/src/modules/discord-bot/reminder.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Clock } from '../../common';
import type { Env } from '../../config';
import { AttendanceService } from '../attendance/attendance.public';
import {
  BattleSessionsService,
  isReminderDay,
} from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { BotChannelService } from './bot-channel.service';
import { DiscordRestClient } from './discord-rest';
import { buildReminder, type DueSession } from './reminder';

/** What one run did, for the cron response and for `/nhac-diem-danh`'s reply. */
export interface ReminderResult {
  /** Whether a message was actually posted */
  sent: boolean;
  /** Battle days the message covered */
  sessionCount: number;
  /** People mentioned, each counted once however many days they are missing from */
  missingCount: number;
}

/** Nothing to say, in the shape `run` returns. */
const NOTHING: ReminderResult = {
  sent: false,
  sessionCount: 0,
  missingCount: 0,
};

/**
 * Finds who still has not answered for a deadline falling tomorrow, and says so in Discord.
 *
 * Both the cron endpoint and `/nhac-diem-danh` call `run`: a scheduled reminder and a hand-run one
 * must not be able to disagree about who is missing.
 */
@Injectable()
export class ReminderService {
  constructor(
    private readonly battleSessions: BattleSessionsService,
    private readonly attendance: AttendanceService,
    private readonly characters: CharactersService,
    private readonly channels: BotChannelService,
    private readonly rest: DiscordRestClient,
    private readonly clock: Clock,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private readonly logger = new Logger(ReminderService.name);

  /**
   * Post the reminder, if there is anything to remind about.
   *
   * Silence is a normal outcome, not a failure: no deadline tomorrow, or everyone has already
   * answered. A daily "nothing today" is the fastest way to get a channel muted.
   *
   * @returns What the run did
   * @throws Error when Discord rejects the message — the caller decides how loud that is
   */
  async run(): Promise<ReminderResult> {
    const channelId = await this.channels.get();

    if (!channelId) {
      this.logger.warn(
        'Chưa cấu hình channel nhắc điểm danh — chạy /cau-hinh-kenh trong channel muốn dùng.',
      );

      return NOTHING;
    }

    const now = this.clock.now();
    const sessions = await this.battleSessions.listByWeek();
    const dueSessions = sessions.filter((session) =>
      isReminderDay(new Date(session.deadline), now),
    );

    if (dueSessions.length === 0) return NOTHING;

    const [members, records] = await Promise.all([
      this.characters.listRows(),
      this.attendance.getRecords(),
    ]);

    const due: DueSession[] = dueSessions
      .map((session) => ({
        session,
        // A record existing is the whole test: answering "Không" is answering.
        missing: members
          .filter(
            (member) =>
              !records.some(
                (record) =>
                  record.sessionId === session.id &&
                  record.characterId === member.id,
              ),
          )
          .map((member) => ({
            name: member.name,
            discordId: member.discordId,
          })),
      }))
      .filter((day) => day.missing.length > 0);

    if (due.length === 0) return NOTHING;

    const payload = buildReminder(
      due,
      this.config.get('WEB_ORIGIN', { infer: true }),
    );

    await this.rest.postMessage(channelId, payload);

    return {
      sent: true,
      sessionCount: due.length,
      missingCount: new Set(
        due.flatMap((day) => day.missing.map((member) => member.name)),
      ).size,
    };
  }
}
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- reminder.service`
Expected: PASS. Nếu constructor stub trong test lệch thứ tự tham số thì sửa **test** cho khớp constructor — thứ tự tham số là hợp đồng của code, không phải của test.

- [ ] **Step 5: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): find who has not answered before tomorrow's deadline"
```

---

### Task 8: Endpoint cron, guard, và lịch trên Vercel

`DiscordBotController` gắn `DiscordSignatureGuard` ở cấp class; endpoint này xác thực bằng bearer secret. Hai cách xác thực khác nhau không chung một controller được, nên có controller riêng — nhưng vẫn trong module `discord-bot`, vì tác dụng duy nhất của nó là gửi một tin Discord.

**Files:**
- Create: `apps/api/src/modules/discord-bot/cron.guard.ts`
- Create: `apps/api/src/modules/discord-bot/reminder.controller.ts`
- Modify: `apps/api/src/modules/discord-bot/discord-bot.module.ts`
- Modify: `apps/api/vercel.json`
- Test: `apps/api/src/modules/discord-bot/__tests__/cron.guard.spec.ts`

**Interfaces:**
- Consumes: `ReminderService.run()` (Task 7), `ConfigService<Env, true>`.
- Produces: `GET /api/cron/attendance-reminder` → `{ data: ReminderResult }`.

- [ ] **Step 1: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/cron.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';

import { CronSecretGuard } from '../cron.guard';

const SECRET = 'x'.repeat(32);

/**
 * An execution context carrying one Authorization header.
 * @param authorization - Header value, undefined when absent
 * @returns The minimal context shape the guard reads
 */
function contextWith(authorization?: string): never {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as never;
}

const CONFIG = { get: () => SECRET } as never;

describe('CronSecretGuard', () => {
  it('cho qua khi secret đúng', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(guard.canActivate(contextWith(`Bearer ${SECRET}`))).toBe(true);
  });

  it('từ chối khi thiếu header', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() => guard.canActivate(contextWith())).toThrow(
      UnauthorizedException,
    );
  });

  it('từ chối khi sai scheme', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() => guard.canActivate(contextWith(SECRET))).toThrow(
      UnauthorizedException,
    );
  });

  it('từ chối khi secret sai', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() =>
      guard.canActivate(contextWith(`Bearer ${'y'.repeat(32)}`)),
    ).toThrow(UnauthorizedException);
  });

  it('từ chối khi secret chỉ đúng phần đầu', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() => guard.canActivate(contextWith('Bearer xxxx'))).toThrow(
      UnauthorizedException,
    );
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- cron.guard`
Expected: FAIL — không resolve được `../cron.guard`.

- [ ] **Step 3: Viết guard**

Create `apps/api/src/modules/discord-bot/cron.guard.ts`:

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import type { Env } from '../../config';

/** Authorization header prefix per the Bearer scheme, case-sensitive like `startsWith`. */
const BEARER_PREFIX = 'Bearer ';

/**
 * Compare two secrets without leaking how far they matched.
 * @param a - Value from the request
 * @param b - The configured secret
 * @returns true when the two are byte-for-byte identical
 */
function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  // timingSafeEqual throws on a length mismatch, which is itself the answer.
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Rejects every call to the cron endpoint that does not carry `CRON_SECRET`.
 *
 * Vercel attaches `Authorization: Bearer <CRON_SECRET>` to a scheduled invocation by itself. The
 * endpoint behind this guard messages the whole guild, so it is not something a stranger who
 * guesses the path may trigger.
 *
 * It lives in this module rather than `common/guards/` because it has exactly one consumer; a
 * second cron endpoint is when it moves.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Check the request's cron secret.
   * @param context - Execution context, used to get the Express request
   * @returns true when the secret matches
   * @throws UnauthorizedException when the header is missing, of the wrong scheme, or wrong
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    const provided = header?.startsWith(BEARER_PREFIX)
      ? header.slice(BEARER_PREFIX.length)
      : null;

    // One sentence for every case: telling a prober which part was wrong is free information.
    if (
      !provided ||
      !secretsMatch(provided, this.config.get('CRON_SECRET', { infer: true }))
    ) {
      throw new UnauthorizedException('Không có quyền gọi endpoint này.');
    }

    return true;
  }
}
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- cron.guard`
Expected: PASS.

- [ ] **Step 5: Viết controller**

Create `apps/api/src/modules/discord-bot/reminder.controller.ts`:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { CronSecretGuard } from './cron.guard';
import { ReminderService, type ReminderResult } from './reminder.service';

/**
 * The scheduled attendance reminder.
 *
 * Separate from `DiscordBotController` because that one verifies Discord's Ed25519 signature on
 * every request and this one verifies a shared secret — two authentication schemes cannot share a
 * class-level guard. It stays inside this module all the same: the only thing it does is send a
 * Discord message, and everything it calls lives here.
 *
 * Excluded from Swagger: it is not part of the api ↔ web contract.
 */
@ApiExcludeController()
@Controller('cron')
@UseGuards(CronSecretGuard)
export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}

  /**
   * Run the reminder once.
   *
   * `GET` because Vercel Cron only ever issues GET requests. It is not side-effect free, which is
   * the one place this endpoint departs from what the verb implies — the schedule, not the verb, is
   * what decides it runs.
   *
   * @returns What the run did, wrapped as `{ data }` by the transform interceptor
   */
  @Get('attendance-reminder')
  run(): Promise<ReminderResult> {
    return this.reminders.run();
  }
}
```

- [ ] **Step 6: Đăng ký trong module**

Sửa `apps/api/src/modules/discord-bot/discord-bot.module.ts` — thêm import và đăng ký, giữ nguyên khối `imports` sẵn có:

```ts
import { BotChannelService } from './bot-channel.service';
import { CronSecretGuard } from './cron.guard';
import { DiscordRestClient } from './discord-rest';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
  imports: [AttendanceModule, BattleSessionsModule, CharactersModule],
  controllers: [DiscordBotController, ReminderController],
  providers: [
    DiscordSignatureGuard,
    InteractionRouter,
    ActorResolver,
    BotChannelService,
    DiscordRestClient,
    ReminderService,
    CronSecretGuard,
  ],
})
export class DiscordBotModule {}
```

Cập nhật doc comment của class cho khớp: module này nay còn giữ một job chạy theo lịch, không chỉ endpoint interaction.

- [ ] **Step 7: Khai báo lịch trên Vercel**

Sửa `apps/api/vercel.json`, thêm khối `crons` — giữ nguyên `installCommand` và `git`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile --filter api --filter @guild/shared",
  "git": {
    "deploymentEnabled": {
      "**": false
    }
  },
  "crons": [
    {
      "path": "/api/cron/attendance-reminder",
      "schedule": "0 2 * * *"
    }
  ]
}
```

`0 2 * * *` là **UTC** — Vercel không nhận timezone — tức 09:00 giờ VN. Gói Hobby chỉ bảo đảm nổ trong khoảng giờ đó, và cả khoảng nằm gọn trong một ngày VN nên luật vẫn đúng.

- [ ] **Step 8: Kiểm tra app khởi động được**

Run: `pnpm --filter api build`
Expected: build xanh. DI thiếu provider sẽ lộ ra ở đây hoặc lúc chạy test.

Run: `pnpm --filter api test`
Expected: toàn bộ suite xanh.

- [ ] **Step 9: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot apps/api/vercel.json
git commit -m "feat(api): run the attendance reminder from vercel cron"
```

---

### Task 9: `channel_id` trong interaction, và deps mới cho command

Hai lệnh sắp viết cần đọc channel đang gõ và gọi tới hai service mới. Tách thành task riêng vì nó chạm vào file dùng chung: sai ở đây là mọi lệnh cùng gãy.

**Files:**
- Modify: `apps/api/src/modules/discord-bot/interaction.schema.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/command.types.ts`
- Modify: `apps/api/src/modules/discord-bot/interaction-router.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts`

**Interfaces:**
- Produces:
  - `ApplicationCommandInteraction['channel_id']: string`
  - `CommandDeps.channels: BotChannelService`, `CommandDeps.reminders: ReminderService`, `CommandDeps.rest: DiscordRestClient`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts`:

```ts
describe('channel_id trên lệnh', () => {
  it('đọc ra channel nơi lệnh được gõ', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: { name: 'cau-hinh-kenh' },
      member: { user: { id: '111' } },
    });

    expect(parsed).toMatchObject({ channel_id: '424242' });
  });

  it('từ chối một lệnh không mang channel_id', () => {
    expect(() =>
      interactionSchema.parse({
        type: 2,
        data: { name: 'cau-hinh-kenh' },
        member: { user: { id: '111' } },
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- interaction.schema`
Expected: FAIL — test thứ hai fail vì schema chưa đòi `channel_id`; test thứ nhất fail vì Zod đã bỏ trường lạ.

- [ ] **Step 3: Thêm trường vào schema**

Trong `apps/api/src/modules/discord-bot/interaction.schema.ts`, sửa `applicationCommandInteractionSchema`:

```ts
const applicationCommandInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.applicationCommand),
  /**
   * Channel the command was typed in, snake_case because this is Discord's payload. Required:
   * `/cau-hinh-kenh` reads it instead of making an admin copy a channel id by hand, and Discord
   * always sends it for a command used in a server — the bot registers guild commands only.
   */
  channel_id: z.string().min(1),
  data: z.object({
    name: z.string().min(1),
    options: z.array(commandOptionSchema).optional(),
  }),
  ...invokerFields,
});
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- interaction.schema`
Expected: PASS.

Run: `pnpm --filter api test -- discord-bot`
Expected: các spec lệnh sẵn có (`thong-bao`, `diem-danh`, `diem-danh-ho`, `commands`, `interaction-router`) có thể **đỏ** vì object `INTERACTION` dựng tay trong chúng chưa có `channel_id`. Thêm `channel_id: '424242'` vào từng object đó. Đây là sửa fixture cho khớp hợp đồng mới, không phải sửa kỳ vọng hành vi.

- [ ] **Step 5: Mở rộng `CommandDeps`**

Trong `apps/api/src/modules/discord-bot/commands/command.types.ts`, thêm import kiểu và ba trường vào `CommandDeps`:

```ts
import type { BotChannelService } from '../bot-channel.service';
import type { DiscordRestClient } from '../discord-rest';
import type { ReminderService } from '../reminder.service';
```

```ts
export interface CommandDeps {
  attendance: AttendanceService;
  battleSessions: BattleSessionsService;
  characters: CharactersService;
  actors: ActorResolver;
  links: CommandLinks;
  /** Where the bot's announcements go */
  channels: BotChannelService;
  /** The reminder run, shared with the cron endpoint */
  reminders: ReminderService;
  /** Outgoing Discord calls — a command needs it to post outside its own reply */
  rest: DiscordRestClient;
}
```

- [ ] **Step 6: Cấp deps từ router**

Trong `apps/api/src/modules/discord-bot/interaction-router.ts`, inject ba service mới vào constructor và trả chúng trong getter `deps`:

```ts
  constructor(
    private readonly attendance: AttendanceService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly actors: ActorResolver,
    private readonly config: ConfigService<Env, true>,
    private readonly channels: BotChannelService,
    private readonly reminders: ReminderService,
    private readonly rest: DiscordRestClient,
  ) {}
```

```ts
  private get deps(): CommandDeps {
    return {
      attendance: this.attendance,
      battleSessions: this.battleSessions,
      characters: this.characters,
      actors: this.actors,
      links: {
        webOrigin: this.config.get('WEB_ORIGIN', { infer: true }),
        guildRoleId: this.config.get('DISCORD_GUILD_ROLE_ID', { infer: true }),
      },
      channels: this.channels,
      reminders: this.reminders,
      rest: this.rest,
    };
  }
```

- [ ] **Step 7: Chạy toàn bộ suite**

Run: `pnpm --filter api test`
Expected: PASS. `makeDeps` trong các spec lệnh cũ ép kiểu `as never` nên không cần thêm ba khoá mới — nếu một spec nào đó không ép kiểu thì thêm chúng vào.

- [ ] **Step 8: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): carry the channel id and the reminder deps into commands"
```

---

### Task 10: Lệnh `/cau-hinh-kenh`

Lệnh không nhận option nào: gõ ở channel nào thì chọn channel đó. Điểm quan trọng nhất là **thử gửi trước khi lưu** — nếu không, sai quyền chỉ lộ ra lúc 9h sáng hôm sau, trong một job không ai ngồi xem log, và cái mất là một lần nhắc không lấy lại được.

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/cau-hinh-kenh.command.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/index.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/cau-hinh-kenh.command.spec.ts`

**Interfaces:**
- Consumes: `deps.actors`, `deps.rest`, `deps.channels`; `canManageGuild` từ `@guild/shared/lib`; `NOT_LINKED` từ `../attendance-board`; `ephemeralText` từ `../reply`.
- Produces: `cauHinhKenhCommand: SlashCommand`

- [ ] **Step 1: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/cau-hinh-kenh.command.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { cauHinhKenhCommand } from '../commands/cau-hinh-kenh.command';
import type { CommandDeps } from '../commands/command.types';
import { MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'cau-hinh-kenh' },
  member: { user: { id: '111' } },
};

/**
 * A resolved actor carrying the given role.
 * @param role - Guild role the caller signs in with
 * @returns The shape ActorResolver.resolve returns
 */
function actor(role: GuildRole): unknown {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    characterId: 'meo-beo-k7ma3x',
  };
}

/**
 * Build deps around one resolved actor and one REST outcome.
 * @param resolved - What ActorResolver.resolve returns
 * @param postMessage - Stub for the confirmation post
 * @returns Stubbed deps plus the `set` mock, for assertions
 */
function makeDeps(resolved: unknown, postMessage: jest.Mock) {
  const set = jest.fn().mockResolvedValue(undefined);

  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    rest: { postMessage },
    channels: { set },
  } as never as CommandDeps;

  return { deps, set };
}

describe('/cau-hinh-kenh', () => {
  it('lưu đúng channel đang gõ lệnh', async () => {
    const postMessage = jest.fn().mockResolvedValue(undefined);
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls[0][0]).toBe('424242');
    expect(set).toHaveBeenCalledWith('424242');
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('không lưu gì khi Discord từ chối tin xác nhận', async () => {
    const postMessage = jest
      .fn()
      .mockRejectedValue(new Error('Discord từ chối (403)'));
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('quyền');
  });

  it('thành viên thường bị từ chối, và chỉ mình họ thấy', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(actor(GuildRole.MEMBER), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('Discord ID không gán với ai thì bị từ chối', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(null, postMessage);

    await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- cau-hinh-kenh`
Expected: FAIL — không resolve được `../commands/cau-hinh-kenh.command`.

- [ ] **Step 3: Cài đặt tối thiểu**

Create `apps/api/src/modules/discord-bot/commands/cau-hinh-kenh.command.ts`:

```ts
import { canManageGuild } from '@guild/shared/lib';
import { Logger } from '@nestjs/common';

import { NOT_LINKED } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeralText } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown to a member who tried to configure the channel. */
const ADMIN_ONLY = 'Chỉ admin mới đặt được channel thông báo.';

/** Posted into the channel being configured, as the proof that the bot can post there at all. */
const CONFIRMATION =
  '✅ Channel này đã được đặt làm nơi bot nhắc điểm danh hằng ngày.';

/** Shown when Discord refuses the confirmation post. */
const CANNOT_POST =
  'Bot không gửi được tin vào channel này. Kiểm tra bot có thấy channel và có quyền ' +
  'Send Messages không, rồi chạy lại lệnh.';

/** Shown once the channel is stored. */
const SAVED = 'Đã lưu. Từ giờ bot sẽ nhắc điểm danh trong channel này.';

const logger = new Logger('cau-hinh-kenh');

/**
 * Point the daily attendance reminder at the channel this command was typed in — admins only.
 *
 * No option: the channel is already in the interaction, and asking an admin to enable Developer
 * Mode and copy an id adds three steps and a place to mistype.
 *
 * The confirmation post is sent **before** the row is written, and a refusal aborts the whole
 * command. A channel the bot cannot post in is not a configuration, and the alternative is finding
 * that out at 9am the next morning inside a job nobody is watching.
 */
export const cauHinhKenhCommand: SlashCommand = {
  definition: {
    name: 'cau-hinh-kenh',
    description: 'Đặt channel này làm nơi bot nhắc điểm danh (chỉ admin)',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const channelId = interaction.channel_id;

    try {
      await deps.rest.postMessage(channelId, { content: CONFIRMATION });
    } catch (error) {
      // Keep Discord's own reason in the log; the admin gets the action to take.
      logger.warn(
        `Không gửi được tin xác nhận vào channel ${channelId}`,
        error as Error,
      );

      return ephemeralText(CANNOT_POST);
    }

    await deps.channels.set(channelId);

    return ephemeralText(SAVED);
  },
};
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- cau-hinh-kenh`
Expected: PASS.

- [ ] **Step 5: Đăng ký lệnh**

Trong `apps/api/src/modules/discord-bot/commands/index.ts`, thêm import và một phần tử vào mảng `commands`:

```ts
import { cauHinhKenhCommand } from './cau-hinh-kenh.command';
```

```ts
export const commands: readonly SlashCommand[] = [
  pingCommand,
  diemDanhCommand,
  diemDanhHoCommand,
  thongBaoCommand,
  cauHinhKenhCommand,
];
```

- [ ] **Step 6: Chạy suite**

Run: `pnpm --filter api test -- discord-bot`
Expected: PASS. `commands.spec.ts` có thể khẳng định số lượng lệnh hoặc danh sách tên — cập nhật nó cho khớp.

- [ ] **Step 7: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the /cau-hinh-kenh command"
```

---

### Task 11: Lệnh `/nhac-diem-danh`

Gọi đúng `ReminderService.run()` của cron, không phải bản sao — một lần nhắc chạy tay và một lần theo lịch không được phép bất đồng về việc ai còn thiếu.

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/nhac-diem-danh.command.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/index.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/nhac-diem-danh.command.spec.ts`

**Interfaces:**
- Consumes: `deps.actors`, `deps.channels.get()`, `deps.reminders.run()`; `ReminderResult` (Task 7).
- Produces: `nhacDiemDanhCommand: SlashCommand`

- [ ] **Step 1: Viết test thất bại**

Create `apps/api/src/modules/discord-bot/__tests__/nhac-diem-danh.command.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { nhacDiemDanhCommand } from '../commands/nhac-diem-danh.command';
import { MESSAGE_FLAG } from '../discord.constants';
import type { ReminderResult } from '../reminder.service';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'nhac-diem-danh' },
  member: { user: { id: '111' } },
};

/**
 * A resolved actor carrying the given role.
 * @param role - Guild role the caller signs in with
 * @returns The shape ActorResolver.resolve returns
 */
function actor(role: GuildRole): unknown {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    characterId: 'meo-beo-k7ma3x',
  };
}

/**
 * Build deps around one resolved actor and one reminder outcome.
 * @param resolved - What ActorResolver.resolve returns
 * @param result - What ReminderService.run resolves to
 * @param channelId - What BotChannelService.get resolves to
 * @returns Stubbed deps plus the `run` mock, for assertions
 */
function makeDeps(
  resolved: unknown,
  result: ReminderResult,
  channelId: string | null = '424242',
) {
  const run = jest.fn().mockResolvedValue(result);

  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    reminders: { run },
    channels: { get: jest.fn().mockResolvedValue(channelId) },
  } as never as CommandDeps;

  return { deps, run };
}

describe('/nhac-diem-danh', () => {
  it('báo đã nhắc bao nhiêu người', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      sent: true,
      sessionCount: 2,
      missingCount: 5,
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('5');
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('nói rõ khi không còn ai thiếu', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      sent: false,
      sessionCount: 1,
      missingCount: 0,
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('đủ');
  });

  it('chỉ đường khi chưa cấu hình channel', async () => {
    const { deps, run } = makeDeps(
      actor(GuildRole.ADMIN),
      { sent: false, sessionCount: 0, missingCount: 0 },
      null,
    );

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).not.toHaveBeenCalled();
    expect(reply.data.content).toContain('/cau-hinh-kenh');
  });

  it('thành viên thường bị từ chối và không chạy gì', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.MEMBER), {
      sent: false,
      sessionCount: 0,
      missingCount: 0,
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là nó fail**

Run: `pnpm --filter api test -- nhac-diem-danh`
Expected: FAIL — không resolve được `../commands/nhac-diem-danh.command`.

- [ ] **Step 3: Cài đặt tối thiểu**

Create `apps/api/src/modules/discord-bot/commands/nhac-diem-danh.command.ts`:

```ts
import { canManageGuild } from '@guild/shared/lib';

import { NOT_LINKED } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeralText } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown to a member who tried to run the reminder. */
const ADMIN_ONLY = 'Chỉ admin mới chạy được lệnh nhắc.';

/** Shown when no channel has been configured yet — the fix is one command away. */
const NO_CHANNEL =
  'Chưa có channel nào để nhắc. Gõ /cau-hinh-kenh trong channel muốn dùng.';

/** Shown when nothing is due, or everyone due has already answered. */
const NOTHING_TO_SAY =
  'Không có ai cần nhắc: hoặc mai không có hạn nào, hoặc mọi người đã trả lời đủ.';

/**
 * Run the daily reminder right now — admins only.
 *
 * It calls the very same `ReminderService.run` the cron endpoint calls, so a hand-run reminder and
 * a scheduled one cannot disagree about who is missing. Its reason for existing is that the
 * scheduled path is otherwise unverifiable until the next morning.
 *
 * The channel is read before running only so the refusal can name the fix; `run` reads it again and
 * is the one that decides.
 */
export const nhacDiemDanhCommand: SlashCommand = {
  definition: {
    name: 'nhac-diem-danh',
    description: 'Nhắc ngay những ai chưa điểm danh (chỉ admin)',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const channelId = await deps.channels.get();

    if (!channelId) return ephemeralText(NO_CHANNEL);

    const result = await deps.reminders.run();

    if (!result.sent) return ephemeralText(NOTHING_TO_SAY);

    return ephemeralText(
      `Đã nhắc ${result.missingCount} người cho ${result.sessionCount} ngày đánh.`,
    );
  },
};
```

- [ ] **Step 4: Chạy test cho chắc là nó pass**

Run: `pnpm --filter api test -- nhac-diem-danh`
Expected: PASS.

- [ ] **Step 5: Đăng ký lệnh**

Trong `apps/api/src/modules/discord-bot/commands/index.ts`:

```ts
import { nhacDiemDanhCommand } from './nhac-diem-danh.command';
```

```ts
export const commands: readonly SlashCommand[] = [
  pingCommand,
  diemDanhCommand,
  diemDanhHoCommand,
  thongBaoCommand,
  cauHinhKenhCommand,
  nhacDiemDanhCommand,
];
```

- [ ] **Step 6: Bổ sung test khoá hành vi nút trên tin nhắc**

Thêm vào `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`, trong describe sẵn có cho component:

```ts
it('nút Điểm danh ngay trả message mới, không ghi đè tin nó nằm trên', async () => {
  // Nút này nằm trên cả thông báo tuần lẫn tin nhắc — cả hai đều là tin của cả bang.
  // Trả updateMessage sẽ khiến người bấm đầu tiên xoá tin đó của mọi người.
  const reply = await router.route({
    type: 3,
    data: { custom_id: ANNOUNCEMENT_ATTENDANCE_ID },
    member: { user: { id: '111' } },
  } as never);

  expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
  expect(reply.type).not.toBe(INTERACTION_RESPONSE_TYPE.updateMessage);
});
```

Dựng `router` theo đúng cách describe đó đang dựng nó; nếu file chưa import `ANNOUNCEMENT_ATTENDANCE_ID` thì thêm vào.

- [ ] **Step 7: Chạy toàn bộ suite**

Run: `pnpm --filter api test`
Expected: PASS toàn bộ. Cập nhật `commands.spec.ts` nếu nó đếm số lệnh.

- [ ] **Step 8: Commit**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the /nhac-diem-danh command"
```

---

### Task 12: Tài liệu

architecture.md là tài liệu **binding**, không phải mô tả. Một endpoint, một model và một job chạy theo lịch không có trong đó nghĩa là người sau sẽ đặt cái tiếp theo sai chỗ.

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/production.md`
- Modify: `apps/api/CLAUDE.md` (nếu file này liệt kê các lệnh slash)

- [ ] **Step 1: Bảng module trong architecture.md §3.3**

Sửa dòng `discord-bot`, mở rộng cột "Owns":

```markdown
| `discord-bot` | The Discord interactions endpoint, the slash command registry, attendance recorded from Discord (`/diem-danh`, `/diem-danh-ho`), the weekly schedule announcement (`/thong-bao`), the channel configuration (`/cau-hinh-kenh`), and the daily attendance reminder — run by Vercel Cron, or by hand with `/nhac-diem-danh` | Discord's Ed25519 signature for interactions; a shared `CRON_SECRET` for the scheduled reminder — no JWT, no session; the write rules stay `AttendanceService`'s |
```

- [ ] **Step 2: Bảng endpoint trong architecture.md §3.3**

Thêm một dòng dưới dòng `/discord/interactions`:

```markdown
| `GET` | `/cron/attendance-reminder` | Post the attendance reminder for tomorrow's deadlines | `CRON_SECRET` in `Authorization: Bearer` |
```

- [ ] **Step 3: Data model trong architecture.md §5**

Thêm một dòng vào bảng model, dưới `TeamName`:

```markdown
| `BotChannel` | Which Discord channel the bot posts a given kind of message to, keyed by `purpose`. Global configuration like `TeamName`, which is why it hangs off nothing in the diagram above. Today it holds one row, `ATTENDANCE_REMINDER`, written by `/cau-hinh-kenh` |
```

- [ ] **Step 4: "Where new behavior goes" trong architecture.md §7**

Thêm một dòng vào bảng, ngay dưới dòng về slash command:

```markdown
| **Something that must run on a schedule** | A `crons` entry in `apps/api/vercel.json` pointing at a `GET` endpoint behind `CronSecretGuard`. **Not** `@nestjs/schedule`: the API is a Vercel Function, so no process is alive to tick. The schedule is UTC, and Hobby only guarantees the hour, not the minute — a rule that needs the exact minute does not belong on this schedule |
```

- [ ] **Step 5: Mục "deliberately absent" trong architecture.md §8**

Câu "no monitoring or alerting" vẫn đúng, nhưng nay có một job chạy không ai xem. Thêm một câu vào cuối đoạn đầu:

```markdown
The one scheduled job — the attendance reminder — reports only into Vercel's Cron Jobs tab and the
function log; nothing alerts when a run fails, which is why `/nhac-diem-danh` exists to check it by
hand.
```

- [ ] **Step 6: Vận hành trong production.md**

Thêm một mục con vào §5 (hoặc mục vận hành tương đương), sau phần Data API grants:

```markdown
### Cron nhắc điểm danh

`apps/api/vercel.json` khai báo `GET /api/cron/attendance-reminder` chạy `0 2 * * *` — UTC, tức
09:00 giờ VN. Vercel tự gắn `Authorization: Bearer $CRON_SECRET`; thiếu biến đó thì API không boot.

- Cron **chỉ chạy trên deployment production**. Preview không có cron.
- Gói Hobby chỉ bảo đảm nổ trong khoảng giờ đã hẹn, không đúng phút — thực tế là đâu đó trong
  09:00–09:59 giờ VN. Luật của job chỉ cần đúng ngày, nên khoảng đó không ảnh hưởng.
- Xem lần chạy gần nhất: Vercel → project api → Cron Jobs.
- Sau khi deploy lần đầu, chạy `/cau-hinh-kenh` trong channel muốn nhận thông báo. Chưa cấu hình
  thì job vẫn chạy nhưng chỉ ghi một dòng warn rồi dừng.
- Kiểm chứng không cần chờ tới sáng hôm sau: `/nhac-diem-danh` chạy đúng cùng một hàm.
```

Thêm bảng mới vào danh sách kiểm tra Data API grant ở §5 nếu ở đó có liệt kê tên bảng.

- [ ] **Step 7: Commit**

```bash
git add docs apps/api/CLAUDE.md
git commit -m "docs: document the attendance reminder cron"
```

---

### Task 13: Kiểm tra cuối và mở PR

- [ ] **Step 1: Chạy đủ bộ kiểm tra CI chạy**

```bash
pnpm --filter api test
pnpm --filter api lint
pnpm --filter api format:check
pnpm --filter api typecheck
pnpm --filter api build
```

Expected: tất cả xanh. Đây là năm trong sáu check của CI cho phần `apps/api`.

- [ ] **Step 2: Xác nhận migration sạch**

Run: `pnpm --filter api prisma:status`
Expected: không có migration nào đang chờ, không có drift.

- [ ] **Step 3: Kiểm tra không có secret nào bị commit**

Run: `git diff main --stat` và `git diff main -- apps/api/.env.example`
Expected: `.env.example` chỉ có tên biến với giá trị rỗng; không có `.env`, `.env.production` hay `seed-data.json` trong danh sách file đổi.

- [ ] **Step 4: Chạy pr-review**

Repo có hook chặn push cho tới khi skill `pr-review` ghi nhận verdict Approve cho commit mới nhất. Chạy nó trước khi nghĩ tới việc đẩy nhánh lên.

- [ ] **Step 5: Đẩy nhánh và mở PR**

Thân PR theo `.github/pull_request_template.md`. Phải nêu rõ trong đó, vì merge là deploy ngay:

> **Trước khi merge:** set `CRON_SECRET` (≥32 ký tự) và `DISCORD_BOT_TOKEN` trên Vercel project của api. Cả hai bắt buộc — thiếu là API không boot.
>
> **Sau khi merge:** chạy `pnpm --filter api discord:register` và bản production
> `DISCORD_ENV_FILE=.env.production pnpm --filter api discord:register`, rồi gõ `/cau-hinh-kenh`
> trong channel muốn nhận thông báo và kiểm chứng bằng `/nhac-diem-danh`.
