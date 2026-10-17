# Gửi thông báo đội hình vào Discord — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một nút trên thanh công cụ màn xếp đội hình chụp đội hình mọi trận của ngày đang mở thành
ảnh và đăng một thông báo kèm ảnh vào channel `#⚔️│bang-chiến` trên Discord, có ping role bang.

**Architecture:** Ảnh được chụp **ở trình duyệt** bằng `@zumer/snapdom` từ một bản sao đội hình vẽ
ngoài khung nhìn (để layout không phụ thuộc kích thước cửa sổ), gửi lên API dạng data URL base64 qua
server action; API dựng câu thông báo bằng một **hàm thuần** rồi đăng một message multipart lên
Discord. Endpoint sống trong module `discord-bot` dù đường dẫn mang tên `team-builder` — xem Task 5.

> **Đính chính sau khi thực thi (2026-09-05):** Task 5 ban đầu đặt endpoint trong `team-builder` và
> cho module đó `imports: [DiscordBotModule]`. Cách đó khép vòng
> `attendance → team-builder → discord-bot → attendance` và làm Nest chết lúc boot. Task 5 dưới đây
> đã được viết lại; Task 11 thêm lưới bắt vòng lặp.

**Tech Stack:** NestJS 11 + Zod + Jest (`apps/api`), Next.js 16 App Router + TanStack Query + Vitest
+ `@zumer/snapdom` (`apps/web`), Zod (`packages/shared`).

**Spec:** [`docs/superpowers/specs/2026-09-05-discord-formation-announcement-design.md`](../specs/2026-09-05-discord-formation-announcement-design.md)

## Global Constraints

- Mọi chữ người dùng đọc là **tiếng Việt**; tên file, định danh, comment, commit message là **tiếng Anh**.
- Comment JSDoc tiếng Anh cho **mọi** hàm/component: mục đích, từng param, giá trị trả về.
- `apps/api` **không có path alias**: import nội bộ dùng đường dẫn tương đối, code dùng chung dùng
  đúng tên package `@guild/shared/*`.
- `apps/api` **không đọc `process.env`**: khai báo biến trong `config/env.validation.ts` rồi inject
  `ConfigService` với `config.get('X', { infer: true })`.
- Module này chỉ được chạm module khác qua `<domain>.public.ts`. **Không `forwardRef()`.**
- Mọi response của endpoint dựng qua `verifyResponse(<shape>Schema, { … } satisfies <Shape>)`.
- `apps/web`: `lib/api-client.ts` là nơi duy nhất `fetch` backend; feature gọi qua hàm trong
  `features/<feature>/api/`; component gọi hook của feature, không `useQuery` trực tiếp.
- Sau khi sửa `packages/shared`, chạy `pnpm --filter @guild/shared build` trước khi hai app chạy được.
- Ba mốc giờ (spec §3.1): SCRIM = giờ đánh **−45 / −15 / −45** phút; BANG CHIẾN = **19:30 / 19:45 /
  19:45** cố định. Mọi phép đọc giờ đi qua `vnParts` / `shiftVnDate` của `@guild/shared/lib`.
- Cụm ngày (spec §3.2): cùng ngày → ` TỐI NAY`; ngày kế tiếp → ` TỐI MAI`; xa hơn → chuỗi rỗng.
- Ảnh: **webp**, data URL base64, tối đa 2 ảnh, mỗi ảnh tối đa 3.000.000 ký tự.
- Commit theo Conventional Commits, **không** dòng attribution ở cuối. Branch hiện tại:
  `feat/discord-formation-announcement` (không commit lên `main`).

---

### Task 1: Biến môi trường `DISCORD_BAO_BAN_CHANNEL_ID`

Channel `#🤒│báo-bận` được nhắc trong câu thông báo dưới dạng `<#id>`, nên id của nó phải là cấu hình
kiểm được lúc boot.

**Files:**
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/.env.example`
- Test: `apps/api/src/config/__tests__/env.validation.spec.ts`

**Interfaces:**
- Consumes: —
- Produces: `Env['DISCORD_BAO_BAN_CHANNEL_ID']: string` — Task 4 đọc qua `ConfigService`.

- [ ] **Step 1: Viết test đỏ**

Trong `apps/api/src/config/__tests__/env.validation.spec.ts`, thêm biến vào hằng `base` ở đầu file:

```ts
  DISCORD_BANG_CHIEN_CHANNEL_ID: '111222333444555666',
  DISCORD_BAO_BAN_CHANNEL_ID: '444555666777888999',
  DISCORD_NGHICH_THUY_HAN_CHANNEL_ID: '222333444555666777',
```

rồi thêm case mới vào `describe('validateEnv', …)`:

```ts
  // Câu thông báo đội hình render <#id> cho #🤒│báo-bận — thiếu id thì cả bang đọc được một link chết.
  it('chết khi thiếu DISCORD_BAO_BAN_CHANNEL_ID', () => {
    const withoutChannel: Partial<typeof base> = { ...base };
    delete withoutChannel.DISCORD_BAO_BAN_CHANNEL_ID;

    expect(() => validateEnv(withoutChannel)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter api test -- env.validation`
Expected: FAIL — `validateEnv` vẫn nhận cấu hình thiếu biến đó.

- [ ] **Step 3: Khai báo biến**

Trong `apps/api/src/config/env.validation.ts`, ngay dưới `DISCORD_KHAM_ACC_CHANNEL_ID`:

```ts
  /**
   * Discord channel id of `#🤒│báo-bận`, linked from the formation announcement so a member who
   * cannot make it knows where to say so. Required for the same reason as the channels above: a
   * `<#undefined>` in a message the whole guild reads is worse than a boot that fails.
   */
  DISCORD_BAO_BAN_CHANNEL_ID: z.string().min(1),
```

Trong `apps/api/.env.example`, dưới `DISCORD_KHAM_ACC_CHANNEL_ID=`:

```
# Channel #🤒│báo-bận — thông báo đội hình link tới đây cho người bận
DISCORD_BAO_BAN_CHANNEL_ID=
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test -- env.validation`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config/env.validation.ts apps/api/.env.example apps/api/src/config/__tests__/env.validation.spec.ts
git commit -m "feat(api): require the bao-ban channel id in the env schema"
```

---

### Task 2: Hàm thuần dựng câu thông báo

Nơi duy nhất giữ mẫu chữ. Tách sẵn hai hàm định dạng giờ VN đang bị `announcement.ts` giữ riêng, để
hai message không có hai cách viết `dd/MM`.

**Files:**
- Create: `apps/api/src/modules/discord-bot/vn-format.ts`
- Create: `apps/api/src/modules/discord-bot/formation-announcement.ts`
- Modify: `apps/api/src/modules/discord-bot/announcement.ts` (bỏ `formatDayMonth` riêng, import lại)
- Test: `apps/api/src/modules/discord-bot/__tests__/formation-announcement.spec.ts`

**Interfaces:**
- Consumes: `MessagePayload` từ `./commands/command.types`; `vnParts`, `shiftVnDate` từ `@guild/shared/lib`.
- Produces:
  ```ts
  // vn-format.ts
  export function formatVnTime(date: Date): string;      // "20:30"
  export function formatVnDayMonth(date: Date): string;   // "19/08"

  // formation-announcement.ts
  export interface FormationAnnouncementInput {
    isGuildWar: boolean;
    dateTime: Date;
    matchCount: number;
    now: Date;
  }
  export interface FormationAnnouncementLinks {
    guildRoleId: string;
    baoBanChannelId: string;
  }
  export function buildFormationAnnouncement(
    input: FormationAnnouncementInput,
    links: FormationAnnouncementLinks,
  ): MessagePayload;
  ```

- [ ] **Step 1: Viết test đỏ**

Tạo `apps/api/src/modules/discord-bot/__tests__/formation-announcement.spec.ts`:

```ts
import {
  buildFormationAnnouncement,
  type FormationAnnouncementInput,
} from '../formation-announcement';

const LINKS = { guildRoleId: '999888777', baoBanChannelId: '111222333' };

/** 19/08/2026 20:30 giờ VN. */
const SCRIM_AT_2030 = new Date('2026-08-19T13:30:00.000Z');
/** 19/08/2026 09:00 giờ VN — cùng ngày với trận trên. */
const MORNING_OF_BATTLE = new Date('2026-08-19T02:00:00.000Z');

/**
 * Input của một trận scrim 20:30, bấm nút ngay sáng ngày đánh.
 * @param overrides - Trường cần đổi so với mặc định
 * @returns Input đầy đủ cho `buildFormationAnnouncement`
 */
function input(
  overrides: Partial<FormationAnnouncementInput> = {},
): FormationAnnouncementInput {
  return {
    isGuildWar: false,
    dateTime: SCRIM_AT_2030,
    matchCount: 2,
    now: MORNING_OF_BATTLE,
    ...overrides,
  };
}

describe('buildFormationAnnouncement — scrim', () => {
  it('suy ba mốc giờ từ giờ đánh: −45, −15, −45', () => {
    const { content } = buildFormationAnnouncement(input(), LINKS);

    expect(content).toContain('online *sớm trước 19:45*');
    expect(content).toContain('Sau 20:15 chưa online');
    expect(content).toContain('vào trễ *sau 19:45*');
  });

  it('tiêu đề mang loại trận, giờ, ngày và số trận', () => {
    const { content } = buildFormationAnnouncement(input(), LINKS);

    expect(content.split('\n')[0]).toBe('# SCRIM 20:30 19/08 TỐI NAY - 2 TRẬN');
  });
});

describe('buildFormationAnnouncement — bang chiến', () => {
  // Bang chiến ghim 20:00 thứ 7 (architecture.md §6), nên ba mốc là chữ cố định chứ không phải
  // một bộ offset — 19:30 là −30 phút, không khớp offset −45 của scrim.
  it('in cứng 19:30 / 19:45 / 19:45', () => {
    const { content } = buildFormationAnnouncement(
      input({
        isGuildWar: true,
        dateTime: new Date('2026-08-08T13:00:00.000Z'),
        now: new Date('2026-08-08T02:00:00.000Z'),
      }),
      LINKS,
    );

    expect(content).toContain('online *sớm trước 19:30*');
    expect(content).toContain('Sau 19:45 chưa online');
    expect(content).toContain('vào trễ *sau 19:45*');
    expect(content.split('\n')[0]).toBe(
      '# BANG CHIẾN 20:00 08/08 TỐI NAY - 2 TRẬN',
    );
  });
});

describe('buildFormationAnnouncement — cụm ngày', () => {
  it('thông báo trước một ngày thì đọc là TỐI MAI', () => {
    const { content } = buildFormationAnnouncement(
      input({ now: new Date('2026-08-18T02:00:00.000Z') }),
      LINKS,
    );

    expect(content.split('\n')[0]).toContain('19/08 TỐI MAI -');
  });

  it('xa hơn ngày mai thì bỏ hẳn cụm ngày', () => {
    const { content } = buildFormationAnnouncement(
      input({ now: new Date('2026-08-15T02:00:00.000Z') }),
      LINKS,
    );

    expect(content.split('\n')[0]).toBe('# SCRIM 20:30 19/08 - 2 TRẬN');
  });

  // Nửa đêm giờ VN là 17:00 UTC hôm trước: so ngày theo giờ máy chủ sẽ lệch đúng một ngày.
  it('so ngày theo giờ Việt Nam, không theo UTC', () => {
    const { content } = buildFormationAnnouncement(
      input({ now: new Date('2026-08-18T17:30:00.000Z') }),
      LINKS,
    );

    expect(content.split('\n')[0]).toContain('TỐI NAY');
  });
});

describe('buildFormationAnnouncement — mention', () => {
  it('ping role bang và chỉ cho phép ping đúng role đó', () => {
    const payload = buildFormationAnnouncement(input(), LINKS);

    expect(payload.content.endsWith('<@&999888777>')).toBe(true);
    expect(payload.allowed_mentions).toEqual({ roles: ['999888777'] });
  });

  it('link tới channel báo bận thay vì chữ thường', () => {
    const { content } = buildFormationAnnouncement(input(), LINKS);

    expect(content).toContain('báo gấp vào <#111222333> .');
  });

  it('số trận đọc từ lịch đánh, không phải số ảnh', () => {
    const { content } = buildFormationAnnouncement(
      input({ matchCount: 1 }),
      LINKS,
    );

    expect(content.split('\n')[0]).toContain('- 1 TRẬN');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter api test -- formation-announcement`
Expected: FAIL — không tìm thấy module `../formation-announcement`.

- [ ] **Step 3: Viết `vn-format.ts`**

```ts
import { vnParts } from '@guild/shared/lib';

/**
 * Two-digit string of a number, for a wall clock or a calendar field.
 * @param value - The number, 0-99
 * @returns The number padded to two digits
 */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Wall-clock time of an instant, read in Vietnam time.
 * @param date - The instant
 * @returns A `HH:mm` string
 */
export function formatVnTime(date: Date): string {
  const { hour, minute } = vnParts(date);

  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * Day and month of an instant, read in Vietnam time.
 * @param date - The instant
 * @returns A `dd/MM` string
 */
export function formatVnDayMonth(date: Date): string {
  const { day, month } = vnParts(date);

  return `${pad(day)}/${pad(month)}`;
}
```

- [ ] **Step 4: Viết `formation-announcement.ts`**

```ts
import { shiftVnDate, vnParts } from '@guild/shared/lib';

import type { MessagePayload } from './commands/command.types';
import { formatVnDayMonth, formatVnTime } from './vn-format';

/** How long before a scrim members are asked to be online. */
const SCRIM_GATHER_MINUTES = 45;

/** How long before a scrim an empty slot is handed to somebody else. */
const SCRIM_REPLACE_MINUTES = 15;

/**
 * The Guild War's three times, written out rather than derived.
 *
 * The Guild War is pinned to 20:00 Saturday (architecture.md §6) and these are the words the guild
 * already knows. They are not a shifted copy of the scrim rule — 19:30 is 30 minutes before the
 * battle where a scrim asks for 45 — so forcing both into one formula would silently reword the
 * announcement. If the Guild War ever moves, this constant and the spec change together.
 */
const GUILD_WAR_TIMES = {
  gather: '19:30',
  replace: '19:45',
  late: '19:45',
} as const;

/** The rule of dashes the guild's own template puts above the mention. */
const SEPARATOR = '-'.repeat(69);

/** What the announcement says about the battle it announces. */
export interface FormationAnnouncementInput {
  /** Saturday Guild War — decides both the wording and the three times */
  isGuildWar: boolean;
  /** When the battle is played */
  dateTime: Date;
  /** How many matches the day is played over — the schedule, not the number of images */
  matchCount: number;
  /** Now, from `Clock` — decides the "TỐI NAY" / "TỐI MAI" phrase */
  now: Date;
}

/** The two Discord ids the message points at. */
export interface FormationAnnouncementLinks {
  /** Role mentioned so every member is notified */
  guildRoleId: string;
  /** Channel `#🤒│báo-bận`, where somebody who cannot make it says so */
  baoBanChannelId: string;
}

/**
 * The three times of one battle, already formatted.
 * @param input - The battle being announced
 * @returns Gather time, replacement time and the "arriving late" time
 */
function timesOf(input: FormationAnnouncementInput) {
  if (input.isGuildWar) return GUILD_WAR_TIMES;

  const before = (minutes: number) =>
    formatVnTime(new Date(input.dateTime.getTime() - minutes * 60_000));

  return {
    gather: before(SCRIM_GATHER_MINUTES),
    replace: before(SCRIM_REPLACE_MINUTES),
    late: before(SCRIM_GATHER_MINUTES),
  };
}

/**
 * A calendar day in Vietnam time, as a comparable key.
 * @param date - The instant
 * @returns A `YYYY-M-D` key
 */
function vnDayKey(date: Date): string {
  const { year, month, day } = vnParts(date);

  return `${year}-${month}-${day}`;
}

/**
 * The phrase saying how soon the battle is, appended to the date.
 *
 * Empty for anything past tomorrow: "TỐI NAY" on a message posted three days early is a lie, and
 * the date right before it already says when.
 *
 * @param dateTime - When the battle is played
 * @param now - Now
 * @returns " TỐI NAY", " TỐI MAI", or an empty string
 */
function dayPhrase(dateTime: Date, now: Date): string {
  const battleDay = vnDayKey(dateTime);

  if (battleDay === vnDayKey(now)) return ' TỐI NAY';
  if (battleDay === vnDayKey(shiftVnDate(now, 1, 0, 0))) return ' TỐI MAI';

  return '';
}

/**
 * Build the formation announcement posted with the line-up images.
 *
 * Pure: everything it says arrives in `input`, so the whole wording is testable without a database
 * or a clock. The mention lives in `content` because Discord only notifies people for mentions in
 * the message text, and `allowed_mentions` is present to *close* everything else — the message is
 * assembled from admin-entered data and must not be able to grow an `@everyone`.
 *
 * @param input - The battle being announced
 * @param links - The role to ping and the channel to link
 * @returns The message body, ready for `postMessageWithFiles`
 */
export function buildFormationAnnouncement(
  input: FormationAnnouncementInput,
  links: FormationAnnouncementLinks,
): MessagePayload {
  const times = timesOf(input);
  const kind = input.isGuildWar ? 'BANG CHIẾN' : 'SCRIM';
  const when = `${formatVnTime(input.dateTime)} ${formatVnDayMonth(input.dateTime)}`;

  return {
    content: [
      `# ${kind} ${when}${dayPhrase(input.dateTime, input.now)} - ${input.matchCount} TRẬN`,
      `## - Các thành viên có tên trong danh sách vui lòng online *sớm trước ${times.gather}* !`,
      `## - Sau ${times.replace} chưa online, slot được thay thế cho thành viên khác.`,
      `## - Nếu không thể tham gia hoặc vào trễ *sau ${times.late}*, báo gấp vào <#${links.baoBanChannelId}> .`,
      '## - Những ai không có tên trong danh sách *vẫn nên online để sẵn sàng thay thế khi cần thiết*.',
      SEPARATOR,
      `<@&${links.guildRoleId}>`,
    ].join('\n'),
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
```

- [ ] **Step 5: Dọn bản sao `formatDayMonth` trong `announcement.ts`**

Xoá hàm `formatDayMonth` private trong `apps/api/src/modules/discord-bot/announcement.ts` cùng
import `vnParts`, rồi import bản dùng chung:

```ts
import { shiftVnDate } from '@guild/shared/lib';
import { formatVnDayMonth } from './vn-format';
```

Thay mọi lời gọi `formatDayMonth(` trong file bằng `formatVnDayMonth(`.

- [ ] **Step 6: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test -- formation-announcement announcement`
Expected: PASS cả hai file — `announcement.spec.ts` vẫn xanh chứng minh việc dọn không đổi hành vi.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/discord-bot/vn-format.ts apps/api/src/modules/discord-bot/formation-announcement.ts apps/api/src/modules/discord-bot/announcement.ts apps/api/src/modules/discord-bot/__tests__/formation-announcement.spec.ts
git commit -m "feat(api): build the formation announcement message"
```

---

### Task 3: Gửi message kèm file lên Discord

**Files:**
- Modify: `apps/api/src/modules/discord-bot/discord-rest.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/discord-rest.spec.ts`

**Interfaces:**
- Consumes: `MessagePayload`.
- Produces:
  ```ts
  export interface OutgoingFile {
    filename: string;
    bytes: Uint8Array;
    contentType: string;
  }
  // trên DiscordRestClient
  postMessageWithFiles(
    channelId: string,
    payload: MessagePayload,
    files: OutgoingFile[],
  ): Promise<void>;
  ```

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `apps/api/src/modules/discord-bot/__tests__/discord-rest.spec.ts`:

```ts
describe('DiscordRestClient.postMessageWithFiles', () => {
  it('gửi multipart: payload_json cùng từng file, và khai báo attachments', async () => {
    const fetchMock = stubFetch({ ok: true });
    const client = new DiscordRestClient(CONFIG);

    await client.postMessageWithFiles(
      '424242',
      { content: 'đội hình' },
      [
        {
          filename: 'doi-hinh-1.webp',
          bytes: new Uint8Array([1, 2, 3]),
          contentType: 'image/webp',
        },
      ],
    );

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: FormData },
    ];

    expect(url).toBe('https://discord.com/api/v10/channels/424242/messages');
    expect(init.body).toBeInstanceOf(FormData);
    expect(JSON.parse(init.body.get('payload_json') as string)).toEqual({
      content: 'đội hình',
      attachments: [{ id: 0, filename: 'doi-hinh-1.webp' }],
    });
    expect(init.body.get('files[0]')).toBeInstanceOf(Blob);
  });

  // Tự đặt Content-Type là mất chuỗi boundary fetch sinh ra, và Discord từ chối cả message.
  it('không tự đặt Content-Type cho multipart', async () => {
    const fetchMock = stubFetch({ ok: true });
    const client = new DiscordRestClient(CONFIG);

    await client.postMessageWithFiles('424242', { content: 'x' }, [
      {
        filename: 'a.webp',
        bytes: new Uint8Array([1]),
        contentType: 'image/webp',
      },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];

    expect(init.headers.Authorization).toBe('Bot bot-token-value');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('ném kèm status và thân lỗi khi Discord từ chối', async () => {
    stubFetch({ ok: false, status: 413, text: '{"message":"Payload too large"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessageWithFiles('424242', { content: 'x' }, [
        {
          filename: 'a.webp',
          bytes: new Uint8Array([1]),
          contentType: 'image/webp',
        },
      ]),
    ).rejects.toThrow(/413.*Payload too large/s);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter api test -- discord-rest`
Expected: FAIL — `client.postMessageWithFiles is not a function`.

- [ ] **Step 3: Cài đặt**

Trong `apps/api/src/modules/discord-bot/discord-rest.ts`, thêm kiểu và hai helper riêng, rồi cho cả
hai đường gửi dùng chung phần dựng URL / header / lỗi:

```ts
/** One file travelling with a message — Discord takes them as multipart parts. */
export interface OutgoingFile {
  /** Name Discord shows under the message */
  filename: string;
  /** Raw bytes of the file */
  bytes: Uint8Array;
  /** MIME type, e.g. `image/webp` */
  contentType: string;
}
```

Trong class, thêm:

```ts
  /**
   * URL of a channel's message route.
   * @param channelId - Discord channel id
   * @returns The absolute endpoint
   */
  private messagesUrl(channelId: string): string {
    return `${DISCORD_API_BASE}/channels/${channelId}/messages`;
  }

  /**
   * The bot authorization header every outgoing call carries.
   * @returns The header pair
   */
  private authHeader(): Record<string, string> {
    return {
      Authorization: `Bot ${this.config.get('DISCORD_BOT_TOKEN', { infer: true })}`,
    };
  }

  /**
   * Turn a refusal into an error a log can be read from.
   * @param channelId - Channel the message was meant for
   * @param response - Discord's response
   * @returns A promise resolving when the response was fine
   * @throws Error carrying both the status and the response body
   */
  private async ensureAccepted(
    channelId: string,
    response: Response,
  ): Promise<void> {
    if (response.ok) return;

    throw new Error(
      `Discord từ chối gửi tin vào channel ${channelId} (${response.status}): ${await response.text()}`,
    );
  }

  /**
   * Post a message carrying files — the line-up images of a formation announcement.
   *
   * Multipart rather than JSON because Discord takes an upload no other way: the message body goes
   * in a `payload_json` part and each file in a `files[n]` part, tied together by an `attachments`
   * entry per file. `Content-Type` is deliberately absent — `fetch` writes it itself, boundary
   * included, and setting it by hand loses that boundary and the whole message with it.
   *
   * @param channelId - Discord channel id
   * @param payload - The message body
   * @param files - Files to attach, in the order they should appear
   * @returns A promise resolving once Discord has accepted the message
   * @throws Error when Discord rejects the call, carrying the status and the response body
   */
  async postMessageWithFiles(
    channelId: string,
    payload: MessagePayload,
    files: OutgoingFile[],
  ): Promise<void> {
    const form = new FormData();

    form.append(
      'payload_json',
      JSON.stringify({
        ...payload,
        attachments: files.map((file, index) => ({
          id: index,
          filename: file.filename,
        })),
      }),
    );

    files.forEach((file, index) => {
      form.append(
        `files[${index}]`,
        new Blob([file.bytes], { type: file.contentType }),
        file.filename,
      );
    });

    const response = await fetch(this.messagesUrl(channelId), {
      method: 'POST',
      headers: this.authHeader(),
      body: form,
    });

    await this.ensureAccepted(channelId, response);
  }
```

Viết lại `postMessage` để dùng chung ba helper trên (giữ nguyên hành vi: `Content-Type:
application/json` + body JSON).

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test -- discord-rest`
Expected: PASS toàn bộ file, kể cả ba test cũ của `postMessage`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/discord-bot/discord-rest.ts apps/api/src/modules/discord-bot/__tests__/discord-rest.spec.ts
git commit -m "feat(api): post a discord message with file attachments"
```

---

### Task 4: `FormationAnnouncerService`

**Files:**
- Create: `apps/api/src/modules/discord-bot/formation-announcer.service.ts`
- Modify: `apps/api/src/modules/discord-bot/discord-bot.module.ts`
- Modify: `apps/api/src/modules/discord-bot/discord-bot.public.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/formation-announcer.service.spec.ts`

**Interfaces:**
- Consumes: `buildFormationAnnouncement` (Task 2), `DiscordRestClient.postMessageWithFiles` +
  `OutgoingFile` (Task 3), `BattleSessionsService.findById` từ `../battle-sessions/battle-sessions.public`,
  `Clock` từ `../../common`, `Env` từ `../../config`.
- Produces:
  ```ts
  export class FormationAnnouncerService {
    announce(sessionId: string, images: string[]): Promise<number>; // số ảnh đã gửi
  }
  ```

- [ ] **Step 1: Viết test đỏ**

Tạo `apps/api/src/modules/discord-bot/__tests__/formation-announcer.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import type { BattleSession } from '@guild/shared/schemas';

import { FormationAnnouncerService } from '../formation-announcer.service';

/** Một ảnh webp tí hon, đúng dạng data URL frontend gửi lên. */
const IMAGE = 'data:image/webp;base64,AQID';

const ENV: Record<string, string> = {
  DISCORD_BANG_CHIEN_CHANNEL_ID: 'channel-bang-chien',
  DISCORD_GUILD_ROLE_ID: '999888777',
  DISCORD_BAO_BAN_CHANNEL_ID: '111222333',
};

/**
 * Một trận scrim 20:30 ngày 19/08, đúng các trường announcer đọc.
 * @param overrides - Trường cần đổi
 * @returns Session như API trả về
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'session-1',
    label: 'Thứ 4 · 20:30',
    dateTime: '2026-08-19T13:30:00.000Z',
    deadline: '2026-08-19T03:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: 'Moonlight',
    weekStart: '2026-08-16T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 2,
    ...overrides,
  };
}

/**
 * Dựng service với các phụ thuộc đã bị thay bằng mock.
 * @param found - Session `findById` trả về, null nghĩa là không tìm thấy
 * @returns Service cùng các mock để assert
 */
function build(found: BattleSession | null = session()) {
  const battleSessions = { findById: jest.fn().mockResolvedValue(found) };
  const rest = { postMessageWithFiles: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (key: string) => ENV[key] };
  const clock = { now: () => new Date('2026-08-19T02:00:00.000Z') };

  const service = new FormationAnnouncerService(
    battleSessions as never,
    rest as never,
    config as never,
    clock as never,
  );

  return { service, battleSessions, rest };
}

describe('FormationAnnouncerService', () => {
  it('không tìm thấy trận thì từ chối bằng câu tiếng Việt', async () => {
    const { service, rest } = build(null);

    await expect(service.announce('không-có', [IMAGE])).rejects.toThrow(
      NotFoundException,
    );
    expect(rest.postMessageWithFiles).not.toHaveBeenCalled();
  });

  it('gửi đúng channel bang chiến, một message mang mọi ảnh', async () => {
    const { service, rest } = build();

    const sent = await service.announce('session-1', [IMAGE, IMAGE]);

    expect(sent).toBe(2);
    expect(rest.postMessageWithFiles).toHaveBeenCalledTimes(1);

    const [channelId, payload, files] = rest.postMessageWithFiles.mock
      .calls[0] as [string, { content: string }, { filename: string }[]];

    expect(channelId).toBe('channel-bang-chien');
    expect(payload.content).toContain('# SCRIM 20:30 19/08 TỐI NAY - 2 TRẬN');
    expect(files.map((file) => file.filename)).toEqual([
      'doi-hinh-1.webp',
      'doi-hinh-2.webp',
    ]);
  });

  it('giải mã base64 thành bytes thật, bỏ tiền tố data URL', async () => {
    const { service, rest } = build();

    await service.announce('session-1', [IMAGE]);

    const [, , files] = rest.postMessageWithFiles.mock.calls[0] as [
      string,
      unknown,
      { bytes: Uint8Array; contentType: string }[],
    ];

    expect(Array.from(files[0].bytes)).toEqual([1, 2, 3]);
    expect(files[0].contentType).toBe('image/webp');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter api test -- formation-announcer`
Expected: FAIL — không tìm thấy module `../formation-announcer.service`.

- [ ] **Step 3: Cài đặt service**

Tạo `apps/api/src/modules/discord-bot/formation-announcer.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Clock } from '../../common';
import type { Env } from '../../config';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import type { OutgoingFile } from './discord-rest';
import { DiscordRestClient } from './discord-rest';
import { buildFormationAnnouncement } from './formation-announcement';

/** The only image format the announcement accepts, mirrored by the shared schema. */
const IMAGE_CONTENT_TYPE = 'image/webp';

/** Prefix every incoming image carries, already enforced by `announceFormationSchema`. */
const DATA_URL_PREFIX = `data:${IMAGE_CONTENT_TYPE};base64,`;

/** Shown when the battle the announcement points at no longer exists. */
const SESSION_NOT_FOUND = 'Không tìm thấy trận đánh này.';

/**
 * Posts a day's line-up into the guild's battle channel.
 *
 * Lives in `discord-bot` because everything it touches does — the message shape, the REST client,
 * the channel and role ids. `team-builder` reaches it through `discord-bot.public.ts`, which keeps
 * the dependency one-way: the bot has never needed to know a formation exists.
 */
@Injectable()
export class FormationAnnouncerService {
  constructor(
    private readonly battleSessions: BattleSessionsService,
    private readonly rest: DiscordRestClient,
    private readonly config: ConfigService<Env, true>,
    private readonly clock: Clock,
  ) {}

  /**
   * Announce one battle day's line-up.
   *
   * One message carrying every image, never one per match: a half-sent announcement would leave the
   * channel with a line-up nobody can act on and nothing to clean it up with.
   *
   * @param sessionId - Battle day being announced
   * @param images - Line-up images as `data:image/webp;base64,…`, in match order
   * @returns How many images were sent
   * @throws NotFoundException when the battle day does not exist
   * @throws Error when Discord rejects the message
   */
  async announce(sessionId: string, images: string[]): Promise<number> {
    const session = await this.battleSessions.findById(sessionId);

    if (!session) throw new NotFoundException(SESSION_NOT_FOUND);

    const payload = buildFormationAnnouncement(
      {
        isGuildWar: session.isGuildWar,
        dateTime: new Date(session.dateTime),
        matchCount: session.matchCount,
        now: this.clock.now(),
      },
      {
        guildRoleId: this.config.get('DISCORD_GUILD_ROLE_ID', { infer: true }),
        baoBanChannelId: this.config.get('DISCORD_BAO_BAN_CHANNEL_ID', {
          infer: true,
        }),
      },
    );

    await this.rest.postMessageWithFiles(
      this.config.get('DISCORD_BANG_CHIEN_CHANNEL_ID', { infer: true }),
      payload,
      images.map(toFile),
    );

    return images.length;
  }
}

/**
 * Turn one incoming data URL into the file Discord is handed.
 * @param image - A `data:image/webp;base64,…` string
 * @param index - Zero-based match index, used to name the file
 * @returns The file part
 */
function toFile(image: string, index: number): OutgoingFile {
  return {
    filename: `doi-hinh-${index + 1}.webp`,
    bytes: new Uint8Array(
      Buffer.from(image.slice(DATA_URL_PREFIX.length), 'base64'),
    ),
    contentType: IMAGE_CONTENT_TYPE,
  };
}
```

- [ ] **Step 4: Khai báo và mở cửa public**

`discord-bot.module.ts` — thêm vào `providers` và thêm `exports`:

```ts
  providers: [
    DiscordSignatureGuard,
    InteractionRouter,
    ActorResolver,
    BotChannelService,
    DiscordRestClient,
    ReminderService,
    FormationAnnouncerService,
    CronSecretGuard,
  ],
  // team-builder gửi thông báo đội hình qua service này; chiều ngược lại không tồn tại.
  exports: [FormationAnnouncerService],
```

`discord-bot.public.ts` — thêm dòng:

```ts
export { FormationAnnouncerService } from './formation-announcer.service';
```

- [ ] **Step 5: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test -- formation-announcer module-boundary`
Expected: PASS cả hai — ranh giới module vẫn nguyên.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/discord-bot/formation-announcer.service.ts apps/api/src/modules/discord-bot/discord-bot.module.ts apps/api/src/modules/discord-bot/discord-bot.public.ts apps/api/src/modules/discord-bot/__tests__/formation-announcer.service.spec.ts
git commit -m "feat(api): add the formation announcer service"
```

---

### Task 5: Schema dùng chung + endpoint

**Files:**
- Modify: `packages/shared/schemas/formation.schema.ts`
- Create: `apps/api/src/modules/discord-bot/dto/announce-formation.dto.ts`
- Create: `apps/api/src/modules/discord-bot/formation-announce.controller.ts`
- Modify: `apps/api/src/modules/discord-bot/formation-announcer.service.ts` (trả `AnnouncementResult`)
- Modify: `apps/api/src/modules/discord-bot/discord-bot.module.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/announce-formation.schema.spec.ts`

**Endpoint KHÔNG đặt trong `team-builder`.** `DiscordBotModule` đã import `AttendanceModule`, và
`AttendanceModule` import `TeamBuilderModule` — cho `TeamBuilderModule` import `DiscordBotModule` là
khép vòng và Nest chết lúc boot. Method trên `TeamBuilderService` cũng chỉ chuyển tiếp tham số, nên
cạnh phụ thuộc đó tồn tại thuần tuý để khép vòng; bỏ nó đi là xong. Controller mới mang
`@Controller('team-builder')` nên đường dẫn và Swagger tag không đổi.

**Interfaces:**
- Consumes: `FormationAnnouncerService.announce` (Task 4).
- Produces:
  ```ts
  // @guild/shared/schemas
  export const ANNOUNCEMENT_IMAGE_MAX_CHARS: number;
  export const announceFormationSchema: z.ZodType<{ images: string[] }>;
  export const announcementResultSchema: z.ZodType<{ imageCount: number }>;
  export type AnnounceFormationInput = { images: string[] };
  export type AnnouncementResult = { imageCount: number };

  // TeamBuilderService
  announceFormation(sessionId: string, images: string[]): Promise<AnnouncementResult>;
  ```
  Endpoint: `POST /team-builder/formations/:sessionId/announce`.

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `apps/api/src/modules/team-builder/__tests__/team-builder.controller.spec.ts`:

```ts
describe('TeamBuilderController.announceFormation', () => {
  it('chuyển thẳng sessionId và ảnh xuống service', async () => {
    const teamBuilder = {
      announceFormation: jest.fn().mockResolvedValue({ imageCount: 2 }),
    };
    const controller = new TeamBuilderController(
      teamBuilder as unknown as TeamBuilderService,
    );
    const images = ['data:image/webp;base64,AQID', 'data:image/webp;base64,BAUG'];

    await expect(
      controller.announceFormation('session-1', { images }),
    ).resolves.toEqual({ imageCount: 2 });

    expect(teamBuilder.announceFormation).toHaveBeenCalledWith(
      'session-1',
      images,
    );
  });
});
```

Và một file test cho schema — tạo
`apps/api/src/modules/team-builder/__tests__/announce-formation.schema.spec.ts`:

```ts
import { announceFormationSchema } from '@guild/shared/schemas';

const IMAGE = 'data:image/webp;base64,AQID';

describe('announceFormationSchema', () => {
  it('nhận một tới hai ảnh webp', () => {
    expect(announceFormationSchema.safeParse({ images: [IMAGE] }).success).toBe(
      true,
    );
    expect(
      announceFormationSchema.safeParse({ images: [IMAGE, IMAGE] }).success,
    ).toBe(true);
  });

  it('từ chối khi không có ảnh nào', () => {
    expect(announceFormationSchema.safeParse({ images: [] }).success).toBe(
      false,
    );
  });

  // Trần 2 khớp với matchCount tối đa của một ngày.
  it('từ chối quá hai ảnh', () => {
    expect(
      announceFormationSchema.safeParse({ images: [IMAGE, IMAGE, IMAGE] })
        .success,
    ).toBe(false);
  });

  it('từ chối định dạng khác webp', () => {
    expect(
      announceFormationSchema.safeParse({
        images: ['data:image/png;base64,AQID'],
      }).success,
    ).toBe(false);
  });

  it('từ chối ảnh vượt trần kích thước', () => {
    const huge = `data:image/webp;base64,${'A'.repeat(3_000_001)}`;

    expect(announceFormationSchema.safeParse({ images: [huge] }).success).toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter api test -- announce-formation team-builder.controller`
Expected: FAIL — `announceFormationSchema` chưa tồn tại và controller chưa có method.

- [ ] **Step 3: Thêm schema dùng chung**

Cuối `packages/shared/schemas/formation.schema.ts`:

```ts
/**
 * Longest a single line-up image may be as a base64 data URL.
 *
 * Sized well under the 4.5MB body limit a Vercel Function accepts, with room for two of them: an
 * announcement that dies at the edge would fail with no Vietnamese sentence to show.
 */
export const ANNOUNCEMENT_IMAGE_MAX_CHARS = 3_000_000;

/**
 * One line-up image on the wire. The format is pinned to webp — the browser encodes it, the API
 * hands it to Discord, and one constant deciding both is what keeps them from drifting.
 */
const announcementImageSchema = z
  .string()
  .regex(
    /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/,
    "Ảnh đội hình không hợp lệ.",
  )
  .max(ANNOUNCEMENT_IMAGE_MAX_CHARS, "Ảnh đội hình quá lớn.");

/**
 * Body of POST /team-builder/formations/:sessionId/announce — one image per match laid out,
 * in match order. `min(1)` because an announcement with no line-up is not one; `max(2)` is the
 * same ceiling a day's match count carries.
 */
export const announceFormationSchema = z.object({
  images: z
    .array(announcementImageSchema)
    .min(1, "Chưa có ảnh đội hình nào để gửi.")
    .max(2, "Một ngày nhiều nhất 2 trận."),
});

/** What the announce endpoint answers: how many images reached Discord. */
export const announcementResultSchema = z.object({
  imageCount: z.number(),
});

export type AnnounceFormationInput = z.infer<typeof announceFormationSchema>;

export type AnnouncementResult = z.infer<typeof announcementResultSchema>;
```

Rồi build lại package:

```bash
pnpm --filter @guild/shared build
```

- [ ] **Step 4: DTO, controller, service, module**

`apps/api/src/modules/discord-bot/dto/announce-formation.dto.ts`:

```ts
import { announceFormationSchema } from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/** Body of POST /team-builder/formations/:sessionId/announce. */
export class AnnounceFormationDto extends createZodDto(
  announceFormationSchema,
) {}
```

`formation-announcer.service.ts` — đổi `announce` để trả `AnnouncementResult` thay vì `number`:

```ts
  async announce(
    sessionId: string,
    images: string[],
  ): Promise<AnnouncementResult> {
    // … như cũ …
    return verifyResponse(announcementResultSchema, {
      imageCount: images.length,
    } satisfies AnnouncementResult);
  }
```

`apps/api/src/modules/discord-bot/formation-announce.controller.ts` — controller riêng, vì
`DiscordBotController` xác thực bằng chữ ký Ed25519 và `ReminderController` bằng cron secret, còn
cái này bằng JWT admin; một guard cấp class không thể là cả ba:

```ts
@ApiTags('team-builder')
@Controller('team-builder')
@UseGuards(JwtAuthGuard, AdminGuard)
export class FormationAnnounceController {
  constructor(private readonly announcer: FormationAnnouncerService) {}

  @Post('formations/:sessionId/announce')
  @ApiOperation({ summary: 'Gửi thông báo đội hình của ngày này vào Discord' })
  announceFormation(
    @Param('sessionId') sessionId: string,
    @Body() body: AnnounceFormationDto,
  ): Promise<AnnouncementResult> {
    return this.announcer.announce(sessionId, body.images);
  }
}
```

`discord-bot.module.ts` — thêm controller vào mảng `controllers`. **Không** export
`FormationAnnouncerService` và **không** cho `TeamBuilderModule` import module này.

- [ ] **Step 5: Chạy test, xác nhận xanh**

Run: `pnpm --filter api test`
Expected: PASS toàn bộ, kể cả `module-boundary.spec.ts`.

- [ ] **Step 6: Kiểm tra kiểu và build**

Run: `pnpm --filter api typecheck && pnpm --filter api build`
Expected: không lỗi. Nếu Nest báo cycle lúc build, dừng lại — đó là dấu hiệu chiều phụ thuộc bị
đảo, và câu trả lời là tách module thứ ba, không phải `forwardRef()`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/schemas/formation.schema.ts apps/api/src/modules/team-builder
git commit -m "feat(api): add the formation announce endpoint"
```

---

### Task 6: Nút "Gửi Discord" trên thanh công cụ

**Files:**
- Modify: `apps/web/features/team-builder/components/formation-toolbar.tsx`
- Test: `apps/web/features/team-builder/components/__tests__/formation-toolbar.test.tsx`

**Interfaces:**
- Consumes: —
- Produces: `FormationToolbarProps` thêm `announcing: boolean` và `onAnnounce: () => void`.
  Task 9 truyền hai prop này vào.

- [ ] **Step 1: Viết test đỏ**

Trong `formation-toolbar.test.tsx`, thêm hai prop vào `renderToolbar`:

```ts
      announcing={false}
      onAnnounce={vi.fn()}
```

rồi thêm describe mới:

```tsx
describe("FormationToolbar — nút gửi Discord", () => {
  it("bấm nút thì gọi onAnnounce", () => {
    const onAnnounce = vi.fn();
    renderToolbar({ onAnnounce });

    fireEvent.click(screen.getByRole("button", { name: /Gửi Discord/ }));

    expect(onAnnounce).toHaveBeenCalledOnce();
  });

  it("đang gửi thì khoá nút và nói đang gửi", () => {
    renderToolbar({ announcing: true });

    const button = screen.getByRole("button", {
      name: /Đang gửi/,
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });

  // Trận đã đá xong thì không còn gì để thông báo.
  it("ngày đã đánh xong thì không có nút gửi", () => {
    renderToolbar({ editable: false });

    expect(screen.queryByRole("button", { name: /Gửi Discord/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter web test -- formation-toolbar`
Expected: FAIL — không tìm thấy nút tên `Gửi Discord`.

- [ ] **Step 3: Thêm nút**

Trong `formation-toolbar.tsx`, thêm `Send` vào import từ `lucide-react`, thêm hai prop vào
interface (kèm JSDoc) và vào danh sách destructure, rồi chèn nút **ngay trước** nút "Lưu":

```tsx
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAnnounce}
        disabled={saving || announcing}
      >
        {announcing ? <Spinner /> : <Send />}
        {announcing ? "Đang gửi..." : "Gửi Discord"}
      </Button>
```

JSDoc của hai prop mới:

```tsx
  /** Whether the Discord announcement is in flight */
  announcing: boolean;
  /** Open the confirmation dialog for the Discord announcement */
  onAnnounce: () => void;
```

Thêm cả hai vào khối `@param` của component.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- formation-toolbar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/components/formation-toolbar.tsx apps/web/features/team-builder/components/__tests__/formation-toolbar.test.tsx
git commit -m "feat(web): add the discord announce button to the formation toolbar"
```

---

### Task 7: Modal xác nhận

**Files:**
- Create: `apps/web/features/team-builder/components/announce-formation-dialog.tsx`
- Test: `apps/web/features/team-builder/components/__tests__/announce-formation-dialog.test.tsx`

**Interfaces:**
- Consumes: `Dialog…` từ `@/components/ui/dialog`, `Spinner` từ `@/components/shared/spinner`.
- Produces:
  ```ts
  interface AnnounceFormationDialogProps {
    open: boolean;
    filledCounts: number[];   // số slot đã xếp của từng trận, theo thứ tự
    slotCount: number;        // tổng slot một trận (60)
    blocked: boolean;         // ngày còn thay đổi chưa lưu
    sending: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }
  export function AnnounceFormationDialog(props): JSX.Element;
  ```

- [ ] **Step 1: Viết test đỏ**

Tạo `apps/web/features/team-builder/components/__tests__/announce-formation-dialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnnounceFormationDialog } from "../announce-formation-dialog";

afterEach(cleanup);

/**
 * Render the dialog of a saved day whose two matches are partly filled.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderDialog(
  props: Partial<React.ComponentProps<typeof AnnounceFormationDialog>> = {}
) {
  render(
    <AnnounceFormationDialog
      open
      filledCounts={[56, 48]}
      slotCount={60}
      blocked={false}
      sending={false}
      onOpenChange={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />
  );
}

/**
 * Read the confirm button off the rendered dialog.
 * @returns The button element
 */
function confirmButton(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: /Gửi thông báo|Đang gửi/,
  }) as HTMLButtonElement;
}

describe("AnnounceFormationDialog", () => {
  it("nói số người còn thiếu của từng trận", () => {
    renderDialog();

    expect(screen.getByText(/Trận 1: thiếu 4\/60/)).toBeTruthy();
    expect(screen.getByText(/Trận 2: thiếu 12\/60/)).toBeTruthy();
  });

  it("trận xếp đủ thì nói đủ chứ không nói thiếu 0", () => {
    renderDialog({ filledCounts: [60] });

    expect(screen.getByText(/Trận 1: đủ 60\/60/)).toBeTruthy();
  });

  it("xác nhận thì gọi onConfirm", () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  // Ảnh gửi cho cả bang mà khác dữ liệu đã lưu là mâu thuẫn không ai gỡ được về sau.
  it("còn thay đổi chưa lưu thì chặn gửi và nói phải lưu trước", () => {
    renderDialog({ blocked: true });

    expect(confirmButton().disabled).toBe(true);
    expect(screen.getByText(/Lưu/)).toBeTruthy();
  });

  it("đang gửi thì khoá nút xác nhận", () => {
    renderDialog({ sending: true });

    expect(confirmButton().disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `pnpm --filter web test -- announce-formation-dialog`
Expected: FAIL — không tìm thấy module `../announce-formation-dialog`.

- [ ] **Step 3: Viết component**

```tsx
"use client";

import { Send, X } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnnounceFormationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** How many slots each match of the day has filled, in match order */
  filledCounts: number[];
  /** How many slots one match holds in total */
  slotCount: number;
  /** The day still has unsaved changes — sending is refused */
  blocked: boolean;
  /** Whether the announcement is in flight */
  sending: boolean;
  /** Called when the user closes the dialog */
  onOpenChange: (open: boolean) => void;
  /** Capture the line-ups and send the announcement */
  onConfirm: () => void;
}

/**
 * Confirm posting the day's line-up to Discord.
 *
 * It counts the empty slots per match rather than for the day as a whole: two matches sharing one
 * number hides which of them is the one still short of people.
 *
 * A day with unsaved changes cannot be announced at all — the images would show a line-up the
 * server does not have, and nothing downstream could ever reconcile the two.
 *
 * @param open - Whether the dialog is open
 * @param filledCounts - Slots filled per match, in match order
 * @param slotCount - Slots one match holds in total
 * @param blocked - Whether unsaved changes are refusing the send
 * @param sending - Whether the announcement is in flight
 * @param onOpenChange - Called when the user closes the dialog
 * @param onConfirm - Capture and send
 * @returns The confirmation dialog
 */
export function AnnounceFormationDialog({
  open,
  filledCounts,
  slotCount,
  blocked,
  sending,
  onOpenChange,
  onConfirm,
}: AnnounceFormationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Gửi thông báo đội hình?</DialogTitle>
          </DialogHeader>
          <ul className="grid gap-1 text-sm">
            {filledCounts.map((filled, index) => (
              <li key={index}>
                {`Trận ${index + 1}: `}
                {filled >= slotCount
                  ? `đủ ${filled}/${slotCount}`
                  : `thiếu ${slotCount - filled}/${slotCount}`}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Ảnh đội hình của {filledCounts.length === 1 ? "trận" : "cả hai trận"}{" "}
            sẽ được đăng vào channel bang chiến kèm thông báo tập hợp.
          </p>
          {blocked ? (
            <p className="text-sm text-destructive">
              Đội hình còn thay đổi chưa lưu. Bấm Lưu trước rồi gửi lại.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X />
              Huỷ
            </Button>
            <Button onClick={onConfirm} disabled={blocked || sending}>
              {sending ? <Spinner /> : <Send />}
              {sending ? "Đang gửi..." : "Gửi thông báo"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- announce-formation-dialog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/team-builder/components/announce-formation-dialog.tsx apps/web/features/team-builder/components/__tests__/announce-formation-dialog.test.tsx
git commit -m "feat(web): add the discord announcement confirmation dialog"
```

---

### Task 8: Bản chụp ngoài khung nhìn

Đây là chỗ quyết định ảnh trông thế nào: một bản sao đội hình vẽ ngoài màn hình, rộng cố định, ép 5
cột, để ảnh không đổi theo kích thước cửa sổ người bấm.

**Files:**
- Modify: `apps/web/package.json` (thêm `@zumer/snapdom`)
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/features/team-builder/components/formation-grid.tsx`
- Create: `apps/web/features/team-builder/components/formation-capture-sheet.tsx`
- Create: `apps/web/features/team-builder/lib/announce-capture.ts`
- Test: `apps/web/features/team-builder/components/__tests__/formation-capture-sheet.test.tsx`

**Interfaces:**
- Consumes: `FormationGrid`, `buildBannerTitle`, `MatchDraft` từ `../types/formation`,
  `SessionFormation`, `Character`, `TeamNames` từ `@guild/shared/schemas`.
- Produces:
  ```ts
  // formation-capture-sheet.tsx
  export const CAPTURE_NODE_ATTRIBUTE = "data-formation-capture";
  export function FormationCaptureSheet(props: {
    session: SessionFormation;
    matches: MatchDraft[];
    charactersById: Map<string, Character>;
    absentIds: Set<string>;
    names: TeamNames;
  }): JSX.Element;

  // announce-capture.ts
  export function readCaptureNodes(): HTMLElement[];
  export function captureFormations(nodes: HTMLElement[]): Promise<string[]>;
  ```
  `FormationGrid` thêm prop `fixedColumns?: boolean`.

- [ ] **Step 1: Cài snapDOM và kiểm tra API thật của nó**

```bash
pnpm --filter web add @zumer/snapdom
```

Đọc kiểu của package trước khi viết code — không đoán tên hàm:

```bash
sed -n 1,80p apps/web/node_modules/@zumer/snapdom/types/index.d.ts
```

Kỳ vọng có `snapdom(el, options)` trả về object mang `toWebp()`, hoặc lối tắt
`snapdom.toWebp(el, options)` trả `Promise<HTMLImageElement>` với `.src` là data URL. Dùng đúng thứ
có thật trong file kiểu đó ở Step 5.

- [ ] **Step 2: Nới hạn body của server action**

Server action mặc định chỉ nhận 1MB, mà hai ảnh webp base64 vượt được con số đó. Sửa
`apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Thông báo đội hình đẩy 1-2 ảnh webp base64 qua server action; mặc định 1MB là quá chật.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
```

- [ ] **Step 3: Viết test đỏ**

Tạo `apps/web/features/team-builder/components/__tests__/formation-capture-sheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SessionFormation } from "@guild/shared/schemas";

import type { MatchDraft } from "../../types/formation";
import {
  CAPTURE_NODE_ATTRIBUTE,
  FormationCaptureSheet,
} from "../formation-capture-sheet";

afterEach(cleanup);

const SESSION: SessionFormation = {
  sessionId: "session-1",
  label: "Thứ 4 · 20:30",
  dateTime: "2026-08-19T13:30:00.000Z",
  isGuildWar: false,
  matchCount: 2,
  opponent: "Moonlight",
  locked: false,
  matches: [],
};

const EMPTY_MATCH: MatchDraft = { assignment: {}, notes: {} };

/**
 * Render the sheet for a day with the given matches.
 * @param matches - Matches of the day
 * @returns The rendered container
 */
function renderSheet(matches: MatchDraft[]) {
  return render(
    <DndContext>
      <FormationCaptureSheet
        session={SESSION}
        matches={matches}
        charactersById={new Map()}
        absentIds={new Set()}
        names={{}}
      />
    </DndContext>
  );
}

describe("FormationCaptureSheet", () => {
  it("một node chụp cho mỗi trận của ngày", () => {
    const { container } = renderSheet([EMPTY_MATCH, EMPTY_MATCH]);

    expect(container.querySelectorAll(`[${CAPTURE_NODE_ATTRIBUTE}]`).length).toBe(
      2
    );
  });

  // Ảnh không được đổi theo bề rộng cửa sổ của người bấm nút.
  it("ép lưới 5 cột thay vì bộ class responsive", () => {
    const { container } = renderSheet([EMPTY_MATCH]);
    const grid = container.querySelector(".grid") as HTMLElement;

    expect(grid.className).toContain("grid-cols-5");
    expect(grid.className).not.toContain("lg:grid-cols-5");
  });

  it("banner của mỗi trận nói đúng số thứ tự trận", () => {
    const { container } = renderSheet([EMPTY_MATCH, EMPTY_MATCH]);
    const nodes = container.querySelectorAll(`[${CAPTURE_NODE_ATTRIBUTE}]`);

    expect(nodes[0].textContent).toContain("trận 1/2");
    expect(nodes[1].textContent).toContain("trận 2/2");
  });
});
```

- [ ] **Step 4: Chạy test, xác nhận đỏ**

Run: `pnpm --filter web test -- formation-capture-sheet`
Expected: FAIL — không tìm thấy module `../formation-capture-sheet`.

- [ ] **Step 5: Thêm prop `fixedColumns` cho `FormationGrid`**

Trong `formation-grid.tsx`: import `cn` từ `@/lib/utils`, thêm prop vào interface và destructure

```tsx
  /** Lay the columns out as a fixed five-wide grid, whatever the viewport is */
  fixedColumns?: boolean;
```

rồi đổi `className` của div lưới:

```tsx
      <div
        className={cn(
          "grid gap-3",
          fixedColumns
            ? "grid-cols-5"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-5"
        )}
      >
```

Nhớ thêm dòng `@param fixedColumns - …` vào JSDoc của component.

- [ ] **Step 6: Viết `formation-capture-sheet.tsx`**

```tsx
"use client";

import type { Character, SessionFormation, TeamNames } from "@guild/shared/schemas";

import { buildBannerTitle } from "../lib/banner-title";
import type { MatchDraft } from "../types/formation";
import { FormationGrid } from "./formation-grid";

/**
 * Marks a node the Discord announcement screenshots. The capture step finds its nodes by this
 * attribute rather than by threading refs down through the dialog that owns the sheet — the
 * attribute is also what the test asserts on, so there is one way in, not two.
 */
export const CAPTURE_NODE_ATTRIBUTE = "data-formation-capture";

/** How wide each captured line-up is rendered, in CSS pixels. */
// Đã đổi thành 1920 sau khi triển khai: ở 1280 tên thành viên bị cắt còn 4-5 ký tự.
// Xem §5.1 của bản thiết kế và doc comment trong formation-capture-sheet.tsx.
const CAPTURE_WIDTH = 1280;

interface FormationCaptureSheetProps {
  /** The battle day being announced — the banner is built from it */
  session: SessionFormation;
  /** Matches of that day, in order; one image is captured per entry */
  matches: MatchDraft[];
  /** Full roster indexed by character id */
  charactersById: Map<string, Character>;
  /** Ids of members who are placed but marked absent for this battle */
  absentIds: Set<string>;
  /** Team names, keyed by team number */
  names: TeamNames;
}

/**
 * A copy of the day's line-ups, drawn outside the viewport for the screenshot.
 *
 * Positioned off to the left rather than hidden: snapDOM reads real layout, and a subtree with
 * `display: none` measures zero in every direction. Its width is pinned and the grid forced to five
 * columns so the image is the same picture whatever window the admin happens to be on — without
 * that, announcing from a narrow laptop sends the guild a one-column strip ten screens tall.
 *
 * Read-only: no drag handles, no note inputs to focus. The banner rides inside the grid already,
 * so screenshotting the grid is what puts the battle's name on the image.
 *
 * @param session - The battle day being announced
 * @param matches - Matches of that day, in order
 * @param charactersById - Full roster indexed by character id
 * @param absentIds - Ids of placed members who dropped out
 * @param names - Team names, keyed by team number
 * @returns The off-screen sheet, one grid per match
 */
export function FormationCaptureSheet({
  session,
  matches,
  charactersById,
  absentIds,
  names,
}: FormationCaptureSheetProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-[-10000px] z-[-1]"
    >
      {matches.map((match, index) => (
        <div
          key={index}
          {...{ [CAPTURE_NODE_ATTRIBUTE]: String(index) }}
          className="bg-background p-4"
          style={{ width: CAPTURE_WIDTH }}
        >
          <FormationGrid
            bannerTitle={buildBannerTitle({
              isGuildWar: session.isGuildWar,
              dateTime: session.dateTime,
              opponent: session.opponent,
              activeMatchIndex: index,
              draftMatchCount: matches.length,
              scheduledMatchCount: session.matchCount,
            })}
            isGuildWar={session.isGuildWar}
            locked={false}
            assignment={match.assignment}
            charactersById={charactersById}
            readOnly
            absentIds={absentIds}
            notes={match.notes}
            onNoteChange={() => {}}
            names={names}
            onNameChange={() => {}}
            fixedColumns
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Viết `announce-capture.ts`**

Dùng đúng API đã xác nhận ở Step 1; bản dưới giả định lối tắt `snapdom.toWebp`:

```ts
import { snapdom } from "@zumer/snapdom";

import { CAPTURE_NODE_ATTRIBUTE } from "../components/formation-capture-sheet";

/** Pixel density of the screenshot — 2 keeps the names readable when Discord scales the image. */
const CAPTURE_SCALE = 2;

/** WebP quality. High enough that the grid's borders stay clean, low enough to stay small. */
const CAPTURE_QUALITY = 0.92;

/**
 * The off-screen nodes to screenshot, in match order.
 *
 * Read from the document rather than from refs: the sheet is mounted by the screen while the
 * dialog owns the confirm click, and passing an array of refs between the two only to find the
 * same elements is more moving parts for the same answer.
 *
 * @returns One element per match currently laid out
 */
export function readCaptureNodes(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${CAPTURE_NODE_ATTRIBUTE}]`)
  );
}

/**
 * Screenshot each line-up into a webp data URL.
 *
 * Fonts are embedded because the image is read on somebody else's machine: without them Discord
 * shows the grid in a fallback face, with every name a different width.
 *
 * @param nodes - Elements to capture, in match order
 * @returns One `data:image/webp;base64,…` per node, in the same order
 * @throws Error when the browser cannot rasterise a node
 */
export async function captureFormations(
  nodes: HTMLElement[]
): Promise<string[]> {
  const images = await Promise.all(
    nodes.map((node) =>
      snapdom.toWebp(node, {
        scale: CAPTURE_SCALE,
        quality: CAPTURE_QUALITY,
        embedFonts: true,
      })
    )
  );

  return images.map((image) => image.src);
}
```

- [ ] **Step 8: Chạy test, xác nhận xanh**

Run: `pnpm --filter web test -- formation-capture-sheet formation-grid`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/next.config.ts apps/web/features/team-builder/components/formation-grid.tsx apps/web/features/team-builder/components/formation-capture-sheet.tsx apps/web/features/team-builder/lib/announce-capture.ts apps/web/features/team-builder/components/__tests__/formation-capture-sheet.test.tsx
git commit -m "feat(web): render the formation off-screen for screenshotting"
```

---

### Task 9: Nối dây — server action, hook, màn hình

**Files:**
- Modify: `apps/web/features/team-builder/api/team-builder-api.ts`
- Create: `apps/web/features/team-builder/hooks/use-formation-announce.ts`
- Modify: `apps/web/features/team-builder/components/team-builder-screen.tsx`

**Interfaces:**
- Consumes: `announceFormation` (bên dưới), `captureFormations` + `readCaptureNodes` (Task 8),
  `AnnounceFormationDialog` (Task 7), `FormationCaptureSheet` (Task 8), `toastSuccess` /
  `toastError` từ `@/components/shared/toast`, `FormationScreenState` từ `use-formation-screen`.
- Produces:
  ```ts
  // team-builder-api.ts
  export interface AnnounceFormationArgs { sessionId: string; images: string[] }
  export async function announceFormation(
    input: AnnounceFormationArgs,
  ): Promise<AnnouncementResult>;

  // use-formation-announce.ts
  export interface FormationAnnounceState {
    open: boolean;
    sending: boolean;
    setOpen: (open: boolean) => void;
    confirm: () => Promise<void>;
  }
  export function useFormationAnnounce(
    sessionId: string | null,
    blocked: boolean,
  ): FormationAnnounceState;
  ```

- [ ] **Step 1: Thêm server action**

Cuối `team-builder-api.ts`:

```ts
/** Arguments of `announceFormation`. `sessionId` travels on the URL; only `images` is sent. */
export interface AnnounceFormationArgs {
  /** Id of the battle day being announced */
  sessionId: string;
  /** One `data:image/webp;base64,…` per match, in match order */
  images: string[];
}

/**
 * Post the day's line-up to Discord, with one image per match.
 * @param input - sessionId and the captured images
 * @returns How many images reached Discord
 * @throws ApiError when signed out, the day is gone (404), or Discord refuses the message
 */
export async function announceFormation(
  input: AnnounceFormationArgs
): Promise<AnnouncementResult> {
  return apiFetch<AnnouncementResult>(
    `/team-builder/formations/${encodeURIComponent(input.sessionId)}/announce`,
    {
      method: "POST",
      body: JSON.stringify({ images: input.images }),
      headers: await authHeader(),
    }
  );
}
```

Thêm `AnnouncementResult` vào khối `import type … from "@guild/shared/schemas"` ở đầu file.

- [ ] **Step 2: Viết hook**

Tạo `apps/web/features/team-builder/hooks/use-formation-announce.ts`:

```ts
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/components/shared/toast";
import { announceFormation } from "../api/team-builder-api";
import { captureFormations, readCaptureNodes } from "../lib/announce-capture";

/** Shown when the browser cannot rasterise the off-screen line-up. */
const CAPTURE_FAILED = "Không chụp được ảnh đội hình.";

/** Shown when the announcement went out. */
const SENT = "Đã gửi thông báo vào Discord.";

/** Shown when the request failed with no message of its own. */
const SEND_FAILED = "Không gửi được thông báo vào Discord.";

/** The Discord announcement: the dialog's state and the action behind its confirm button. */
export interface FormationAnnounceState {
  /** Whether the confirmation dialog is open */
  open: boolean;
  /** Whether a capture or a request is in flight */
  sending: boolean;
  /** Open or close the confirmation dialog */
  setOpen: (open: boolean) => void;
  /** Capture the line-ups and send them */
  confirm: () => Promise<void>;
}

/**
 * Screenshot the day's line-ups and post them to Discord.
 *
 * The capture and the request are caught separately: they fail for unrelated reasons, and one
 * message covering both would tell the admin nothing about which half to retry.
 *
 * @param sessionId - Battle day on screen, null when there is none
 * @param blocked - Whether unsaved changes refuse the send
 * @returns The dialog's state and its confirm action
 */
export function useFormationAnnounce(
  sessionId: string | null,
  blocked: boolean
): FormationAnnounceState {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const mutation = useMutation({ mutationFn: announceFormation });

  /**
   * Capture the off-screen sheet, then send it.
   * @returns A promise resolving once the toast has been raised
   */
  async function confirm(): Promise<void> {
    if (!sessionId || blocked) return;

    let images: string[];

    setCapturing(true);
    try {
      images = await captureFormations(readCaptureNodes());
    } catch {
      // Swallowed on purpose: snapDOM's own error names a DOM node, which tells an admin nothing.
      toastError(CAPTURE_FAILED);
      return;
    } finally {
      setCapturing(false);
    }

    try {
      await mutation.mutateAsync({ sessionId, images });
      toastSuccess(SENT);
      setOpen(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : SEND_FAILED);
    }
  }

  return {
    open,
    sending: capturing || mutation.isPending,
    setOpen,
    confirm,
  };
}
```

- [ ] **Step 3: Nối vào màn hình**

Trong `team-builder-screen.tsx`:

```tsx
import { AnnounceFormationDialog } from "./announce-formation-dialog";
import { FormationCaptureSheet } from "./formation-capture-sheet";
import { useFormationAnnounce } from "../hooks/use-formation-announce";
```

Sau `const [confirmingCopy, setConfirmingCopy] = useState(false);` (và sau khi `dirty` đã được
tính), thêm:

```tsx
  const announce = useFormationAnnounce(screen.selection.activeSessionId, dirty);
```

Truyền hai prop mới cho `FormationToolbar`:

```tsx
            announcing={announce.sending}
            onAnnounce={() => announce.setOpen(true)}
```

Ngay dưới `<CopyFormationDialog … />`, thêm modal và bản chụp. Bản chụp là **anh em** của dialog, không
nằm trong nó: nội dung dialog đi qua portal, còn tấm chụp phải ở lại cây bình thường để giữ layout.

```tsx
        <AnnounceFormationDialog
          open={announce.open}
          filledCounts={screen.draft.matches.map(
            (match) => Object.values(match.assignment).filter(Boolean).length
          )}
          slotCount={screen.draft.slotCount}
          blocked={dirty}
          sending={announce.sending}
          onOpenChange={announce.setOpen}
          onConfirm={announce.confirm}
        />

        {announce.open ? (
          <FormationCaptureSheet
            session={activeSession}
            matches={screen.draft.matches}
            charactersById={screen.pool.charactersById}
            absentIds={screen.pool.absentIds}
            names={screen.teamNames.names}
          />
        ) : null}
```

Ba giá trị `charactersById` / `absentIds` / `names` là đúng những giá trị `FormationGrid` đang nhận
ngay bên dưới trong cùng file — đối chiếu chỗ đó nếu nghi ngờ.

- [ ] **Step 4: Kiểm tra kiểu và chạy toàn bộ test web**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: không lỗi kiểu, toàn bộ test PASS.

- [ ] **Step 5: Thử tay trên máy**

```bash
pnpm --filter api dev   # cửa sổ 1
pnpm --filter web dev   # cửa sổ 2
```

Mở `/xep-doi-hinh`, chọn một ngày, bấm **Gửi Discord**:
- modal nói đúng số thiếu của từng trận;
- sửa một ô rồi mở lại modal → nút xác nhận bị khoá, có dòng bảo lưu trước;
- lưu rồi gửi → spinner, ảnh xuất hiện trong channel bang chiến, câu chữ đúng mẫu, ping đúng role,
  link `#🤒│báo-bận` bấm được;
- ngày hai trận → hai ảnh trong cùng một message.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/team-builder
git commit -m "feat(web): send the formation announcement to discord"
```

---

### Task 10: Tài liệu và dọn dẹp

**Files:**
- Modify: `docs/architecture.md` (bảng endpoint §3.3)
- Modify: `docs/development.md` (§3 bảng biến môi trường)
- Modify: `docs/production.md` (§3 bảng biến môi trường)
- Delete: `apps/api/tb.md`

**Interfaces:**
- Consumes: mọi thứ đã dựng ở Task 1-9.
- Produces: —

- [ ] **Step 1: Thêm endpoint vào architecture.md**

Tìm bảng endpoint của `team-builder` trong §3.3:

```bash
grep -n "team-builder/formations" docs/architecture.md
```

Thêm một hàng ngay dưới hàng `PUT /team-builder/formations/:sessionId`, theo đúng số cột của bảng:

```
| `POST /team-builder/formations/:sessionId/announce` | Đăng ảnh đội hình cả ngày kèm thông báo tập hợp vào Discord | Admin |
```

- [ ] **Step 2: Thêm biến môi trường vào hai bảng docs**

```bash
grep -n "DISCORD_KHAM_ACC_CHANNEL_ID" docs/development.md docs/production.md
```

Ở mỗi chỗ tìm được, thêm một hàng cùng định dạng:

```
| `DISCORD_BAO_BAN_CHANNEL_ID` | Channel `#🤒│báo-bận`, được link trong thông báo đội hình | Bắt buộc |
```

- [ ] **Step 3: Xoá file mẫu tạm**

```bash
rm apps/api/tb.md
```

Mẫu chữ giờ sống trong `formation-announcement.ts` và có test canh — giữ thêm một bản markdown chỉ
tạo ra hai nguồn sự thật.

- [ ] **Step 4: Kiểm tra toàn bộ trước khi mở PR**

```bash
pnpm --filter @guild/shared build
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
pnpm --filter api build && pnpm --filter web build
```

Expected: tất cả xanh. Đây đúng là sáu check CI chạy trên PR.

- [ ] **Step 5: Đối chiếu spec ↔ code**

Đọc lại spec §3 (mẫu chữ), §4 (bảng file backend), §5 (bảng file frontend) và xác nhận từng dòng có
thật trong code. Chỗ nào lệch thì sửa spec ngay trong commit này, kèm một câu nói vì sao.

- [ ] **Step 6: Commit**

```bash
git add docs apps/api/tb.md
git commit -m "docs: document the formation announcement endpoint and env"
```

---

---

### Task 11: Lưới bắt vòng lặp module

Không có task này, một vòng lặp import đi qua trọn vẹn 6 check CI: jest không dựng DI container,
`nest build` chỉ biên dịch, `module-boundary.spec.ts` kiểm đường dẫn import chứ không kiểm đồ thị DI.
Lỗi chỉ lộ ra lúc `pnpm dev` — hoặc tệ hơn, lúc deploy.

**Files:**
- Create: `apps/api/src/__tests__/module-graph.spec.ts`

**Interfaces:**
- Consumes: `Reflect.getMetadata('imports', …)` trên từng class module.
- Produces: —

- [ ] **Step 1: Viết test đỏ**

Duyệt sâu metadata `imports` của từng module, mang theo đường đi; module đã nằm trên đường đi hiện
tại là một vòng lặp. Liệt kê module bằng tay chứ **không** duyệt từ `AppModule`: import file đó chạy
`ConfigModule.forRoot`, và test sẽ đỏ vì thiếu biến môi trường chứ không phải vì đồ thị.

```ts
describe('Đồ thị module', () => {
  it.each(MODULES.map((moduleClass) => [moduleClass.name, moduleClass]))(
    '%s không nằm trong vòng lặp import nào',
    (_name, moduleClass) => {
      expect(findCycle(moduleClass as ModuleClass)).toBeNull();
    },
  );
});
```

- [ ] **Step 2: Chạy test**

Run: `pnpm --filter api test -- module-graph`
Expected: PASS sau khi Task 5 đã đặt endpoint đúng chỗ. Nếu đỏ, thông báo lỗi in ra chính vòng lặp
dưới dạng `A → B → C → A`.

- [ ] **Step 3: Boot thật**

Run: `pnpm --filter api start`
Expected: `Nest application successfully started`, và log `RouterExplorer` có dòng
`Mapped {/api/team-builder/formations/:sessionId/announce, POST}`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/__tests__/module-graph.spec.ts
git commit -m "test(api): catch module import cycles before boot"
```

---

## Ghi chú cho người thực thi

- **Không** chạy `pnpm discord:register`: task này không thêm slash command nào.
- **Không** đụng database: không có migration trong kế hoạch này. Nếu thấy mình đang viết
  `schema.prisma`, dừng lại — đã đi chệch spec.
- Biến `DISCORD_BAO_BAN_CHANNEL_ID` phải được điền trong `apps/api/.env` (id thật của channel) trước
  khi thử tay ở Task 9, và phải thêm vào biến môi trường của project trên Vercel trước khi merge —
  nếu không, API sẽ **chết lúc boot** ngay sau khi deploy.
