# `/thong-bao` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans để thực thi
> plan này theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để theo dõi.
> (CLAUDE.md của dự án: **thực thi inline**, chỉ spawn subagent cho task lớn hoặc khi được
> yêu cầu; **một lượt review duy nhất ở cuối**, do một agent.)

**Goal:** Một lệnh Discord `/thong-bao` chỉ admin dùng được, đăng lịch đánh tuần đang mở
dưới dạng embed có mention role bang, kèm nút mở bảng điểm danh riêng tư ngay trong chat.

**Architecture:** Lệnh đọc `BattleSessionsService.listByWeek()` rồi giao cho một hàm thuần
`buildAnnouncement` dựng embed. Nút "Điểm danh ngay" mang một `custom_id` hằng số; router
so khớp nó và trả về **message ephemeral mới** thay vì `updateMessage`, để người bấm không
ghi đè bản thông báo chung. Trước đó, nhãn Bang Chiến được bổ sung giờ đánh trong
`formatSessionLabel` và dòng phụ trên web ngừng lặp lại giờ đó.

**Tech Stack:** NestJS · Zod · Jest (API) · Vitest + React Testing Library (web) ·
Discord Interactions API v10.

**Spec:** [`docs/superpowers/specs/2026-09-02-thong-bao-command-design.md`](../specs/2026-09-02-thong-bao-command-design.md)

## Global Constraints

- Comment và tên file bằng **tiếng Anh**; nội dung trong `docs/superpowers` bằng **tiếng Việt**.
- Mọi hàm phải có doc comment tiếng Anh: mục đích, từng param, giá trị trả về.
- Không thêm comment cho code đã tự giải thích; chỉ comment cái **vì sao**.
- Không `forwardRef()`. Không mutate — luôn trả object mới.
- Commit message tiếng Anh, Conventional Commits, **không** có dòng attribution ở cuối.
- Nhánh làm việc: `feat/thong-bao-command`. Không commit lên `main`.
- Nhãn mới của Bang Chiến, đúng từng ký tự: `Thứ 7 · 20:00 · Bang Chiến`
- Tên biến môi trường mới, đúng từng ký tự: `DISCORD_GUILD_ROLE_ID`
- `custom_id` của nút thông báo, đúng từng ký tự: `ann:diem-danh`
- Câu từ chối của `/thong-bao`: `Chỉ admin mới đăng thông báo được.`
- Lệnh chạy test: `pnpm --filter api test` · `pnpm --filter web test`
- Lệnh typecheck: `pnpm --filter api typecheck` · `pnpm --filter web typecheck`
- Plan này **không** sửa `packages/shared`, nên không cần build lại nó.

---

## Cấu trúc file

| File | Trách nhiệm | Task |
|---|---|---|
| `apps/api/src/modules/battle-sessions/session-schedule.ts` | Nhãn ngày đánh — thêm giờ cho Bang Chiến | 1 |
| `apps/web/features/attendance/lib/session-subtitle.ts` | Dòng phụ dưới nhãn — Bang Chiến hết nội dung, thêm `joinSessionMeta` | 2 |
| 7 component web | Bỏ qua dòng phụ rỗng | 2 |
| `apps/api/src/config/env.validation.ts`, `.env.example`, `docs/development.md`, `docs/production.md` | Biến `DISCORD_GUILD_ROLE_ID` | 3 |
| `apps/api/src/modules/discord-bot/discord.constants.ts` | Hằng số Discord: style nút, màu embed | 4 |
| `apps/api/src/modules/discord-bot/commands/command.types.ts` | Kiểu embed, link button, `CommandLinks` | 4 |
| `apps/api/src/modules/discord-bot/custom-id.ts` | `ANNOUNCEMENT_ATTENDANCE_ID` | 4 |
| `apps/api/src/modules/discord-bot/announcement.ts` | **Mới.** Dựng thân thông báo. Thuần, không I/O | 5 |
| `apps/api/src/modules/discord-bot/attendance-board.ts` | Thêm `buildOwnBoard` dùng chung | 6 |
| `apps/api/src/modules/discord-bot/commands/diem-danh.command.ts` | Rút gọn, gọi `buildOwnBoard` | 6 |
| `apps/api/src/modules/discord-bot/commands/thong-bao.command.ts` | **Mới.** Definition + execute | 7 |
| `apps/api/src/modules/discord-bot/commands/index.ts` | Đăng ký lệnh | 7 |
| `apps/api/src/modules/discord-bot/interaction-router.ts` | Dựng `links`, phân nhánh nút | 8 |

---

### Task 1: Nhãn Bang Chiến mang giờ đánh

**Files:**
- Modify: `apps/api/src/modules/battle-sessions/session-schedule.ts:222-238`
- Test: `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts:118-121`

**Interfaces:**
- Consumes: `vnWeekday`, `vnParts` từ `@guild/shared/lib` (đã import sẵn trong file).
- Produces: `formatSessionLabel(dateTime: Date, isGuildWar: boolean): string` — chữ ký
  không đổi, chỉ đổi chuỗi trả về cho Bang Chiến.

- [ ] **Bước 1: Sửa test cho hành vi mới**

Trong `session-schedule.spec.ts`, thay nguyên khối `it` của Guild War:

```ts
    it('Guild War hiện thứ, giờ đánh và chữ Bang Chiến', () => {
      expect(formatSessionLabel(vn('2026-07-25T20:00'), true)).toBe(
        'Thứ 7 · 20:00 · Bang Chiến',
      );
    });
```

Khối `it('trận thường hiện thứ và giờ đánh', …)` ngay trên đó **giữ nguyên** — nó là bằng
chứng nhãn scrim không đổi.

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter api test -- session-schedule`
Expected: FAIL — nhận `'Thứ 7 · Bang Chiến'`, mong `'Thứ 7 · 20:00 · Bang Chiến'`.

- [ ] **Bước 3: Sửa `formatSessionLabel`**

Thay nguyên hàm (kể cả doc comment) bằng:

```ts
/**
 * Display label of one battle day.
 *
 * Both kinds start with weekday and battle time, so a list of days reads down one column. Guild
 * War then names itself, because it is the only day of the week that is not a scrim.
 *
 * @param dateTime - Battle time (real UTC instant)
 * @param isGuildWar - Whether this is the weekly Guild War
 * @returns A label like "Thứ 3 · 20:30" or "Thứ 7 · 20:00 · Bang Chiến"
 */
export function formatSessionLabel(
  dateTime: Date,
  isGuildWar: boolean,
): string {
  const weekday = WEEKDAY_NAMES[vnWeekday(dateTime)];
  const { hour, minute } = vnParts(dateTime);
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (isGuildWar) return `${weekday} · ${time} · Bang Chiến`;

  return `${weekday} · ${time}`;
}
```

- [ ] **Bước 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter api test -- session-schedule`
Expected: PASS.

- [ ] **Bước 5: Chạy toàn bộ test API**

Run: `pnpm --filter api test`
Expected: PASS. Các test khác chỉ dùng `'Thứ 7 · Bang Chiến'` làm **fixture** cho `label`,
không gọi `formatSessionLabel`, nên không hỏng. Nếu có test nào đỏ, nó đang khẳng định
đúng thứ vừa đổi — sửa chuỗi mong đợi, đừng sửa hàm.

- [ ] **Bước 6: Commit**

```bash
git add apps/api/src/modules/battle-sessions
git commit -m "feat(api): put the battle time in the guild war label"
```

---

### Task 2: Dòng phụ trên web thôi lặp lại giờ

Trước Task 1, `getSessionSubtitle` hiện giờ đánh của Bang Chiến vì nhãn không có. Giờ nhãn
đã có, để nguyên là hiện hai lần.

**Files:**
- Modify: `apps/web/features/attendance/lib/session-subtitle.ts`
- Modify: `apps/web/features/attendance/index.ts`
- Modify: `apps/web/features/attendance/components/week-timeline.tsx:93-96`
- Modify: `apps/web/features/attendance/components/attendance-grid.tsx:189-192`
- Modify: `apps/web/features/attendance/components/attendance-summary-card.tsx:157-159`
- Modify: `apps/web/features/attendance/components/member-attendance-card.tsx:207-209`
- Modify: `apps/web/features/settings/components/session-row.tsx:49-51`
- Modify: `apps/web/features/settings/components/delete-session-dialog.tsx:58-62`
- Modify: `apps/web/features/team-builder/components/session-tabs.tsx:89-91`
- Test: `apps/web/features/attendance/lib/__tests__/session-subtitle.test.ts`

**Interfaces:**
- Consumes: `formatSessionLabel` đã đổi ở Task 1 (chỉ là quan hệ ý nghĩa, không import).
- Produces:
  - `getSessionSubtitle(session: SessionSubtitleInput): string` — chữ ký không đổi; Bang
    Chiến nay trả `""`.
  - `joinSessionMeta(...parts: (string | null | undefined)[]): string` — nối bằng `" · "`,
    bỏ mảnh rỗng. Export qua `features/attendance/index.ts`.

- [ ] **Bước 1: Sửa test cho hành vi mới**

Trong `session-subtitle.test.ts`, thay khối `it` của Guild War, và thêm một `describe` cho
helper mới. Hai khối `it` của scrim giữ nguyên.

```ts
  it("Guild War không còn dòng phụ vì nhãn đã mang giờ đánh", () => {
    expect(
      getSessionSubtitle({
        isGuildWar: true,
        dateTime: "2026-07-25T13:00:00.000Z",
        opponent: null,
      })
    ).toBe("");
  });
});

describe("joinSessionMeta", () => {
  it("nối các mảnh bằng dấu chấm giữa", () => {
    expect(joinSessionMeta("VS: Hắc Long Đường", "đã điểm danh 12/30")).toBe(
      "VS: Hắc Long Đường · đã điểm danh 12/30"
    );
  });

  it("bỏ mảnh rỗng thay vì để lại dấu phân cách thừa", () => {
    expect(joinSessionMeta("", "đã điểm danh 12/30")).toBe(
      "đã điểm danh 12/30"
    );
    expect(joinSessionMeta("VS: Hắc Long Đường", null)).toBe(
      "VS: Hắc Long Đường"
    );
    expect(joinSessionMeta("", null)).toBe("");
  });
});
```

Sửa dòng import đầu file:

```ts
import { getSessionSubtitle, joinSessionMeta } from "../session-subtitle";
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test -- session-subtitle`
Expected: FAIL — `joinSessionMeta` chưa tồn tại, và Guild War vẫn trả `"20:00"`.

- [ ] **Bước 3: Sửa `session-subtitle.ts`**

Thay nguyên hàm `getSessionSubtitle` và bỏ import `formatTime` (không còn chỗ dùng):

```ts
/** The session fields needed to build the subtitle. */
interface SessionSubtitleInput {
  /** A Guild War session — no opponent */
  isGuildWar: boolean;
  /** Battle time (ISO string) */
  dateTime: string;
  /** Opponent guild name, null when undecided */
  opponent: string | null;
}

/**
 * The subtitle rendered under a battle day's label.
 *
 * A scrim shows the opponent guild, and says so plainly when there is none yet so admins know
 * information is still missing. A Guild War has nothing left to add — its label already carries
 * the battle time — so it returns an empty string and callers drop the line entirely.
 *
 * @param session - Session to display
 * @returns The built subtitle, empty when there is nothing to say
 */
export function getSessionSubtitle(session: SessionSubtitleInput): string {
  if (session.isGuildWar) return "";

  return session.opponent ? `VS: ${session.opponent}` : "Chưa có đối thủ";
}

/**
 * Join the pieces of one meta line, dropping the empty ones.
 *
 * A Guild War has no subtitle, so a caller that appends its own piece — a count, a progress
 * marker — must not be left with a leading separator.
 *
 * @param parts - Pieces in display order; empty, null and undefined are skipped
 * @returns The joined line, empty when nothing survived
 */
export function joinSessionMeta(
  ...parts: (string | null | undefined)[]
): string {
  return parts.filter(Boolean).join(" · ");
}
```

`SessionSubtitleInput.dateTime` được giữ lại dù không còn chỗ đọc: nó mô tả hình dạng
session mà bảy chỗ gọi đang truyền vào nguyên cả object.

- [ ] **Bước 4: Export helper**

Trong `apps/web/features/attendance/index.ts`, sửa dòng export dòng phụ:

```ts
export { getSessionSubtitle, joinSessionMeta } from "./lib/session-subtitle";
```

- [ ] **Bước 5: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test -- session-subtitle`
Expected: PASS.

- [ ] **Bước 6: Bỏ qua dòng phụ rỗng ở bảy chỗ gọi**

`week-timeline.tsx` — bọc cả `<div>` (biến `subtitle` đã có sẵn ở dòng 84):

```tsx
                <SessionLabel session={session} />
                {subtitle && (
                  <div className="text-xs font-medium text-muted-foreground">
                    {subtitle}
                  </div>
                )}
                <SessionDeadline session={session} />
```

`attendance-grid.tsx` — bọc cả `<span>` (biến `subtitle` đã có sẵn ở dòng 186):

```tsx
                        <SessionLabel session={session} size="sm" />
                        {subtitle && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {subtitle}
                          </span>
                        )}
```

`attendance-summary-card.tsx` — nối qua helper thay vì nội suy thẳng:

```tsx
        <div className="text-xs font-medium text-muted-foreground">
          {joinSessionMeta(
            getSessionSubtitle(session),
            `đã điểm danh ${answered}/${total}`
          )}
        </div>
```

và sửa import ở đầu file:

```tsx
import { getSessionSubtitle, joinSessionMeta } from "../lib/session-subtitle";
```

`member-attendance-card.tsx` — bọc cả `<p>`:

```tsx
                      <SessionLabel session={battleSession} size="md" />
                      {getSessionSubtitle(battleSession) && (
                        <p className="text-sm text-muted-foreground">
                          {getSessionSubtitle(battleSession)}
                        </p>
                      )}
```

`session-row.tsx` — bọc cả `<div>`:

```tsx
        </SessionLabel>
        {getSessionSubtitle(session) && (
          <div className="text-xs text-muted-foreground">
            {getSessionSubtitle(session)}
          </div>
        )}
        <SessionDeadline session={session} />
```

`delete-session-dialog.tsx` — bọc cả `<div>`:

```tsx
      description={
        session &&
        getSessionSubtitle(session) && (
          <div className="text-sm text-muted-foreground">
            {getSessionSubtitle(session)}
          </div>
        )
      }
```

`session-tabs.tsx` — bỏ toán tử ba ngôi, dùng helper (biến `subtitle` đã có sẵn ở dòng 72):

```tsx
              <span className="text-xs font-normal opacity-80">
                {joinSessionMeta(subtitle, progress)}
              </span>
```

và sửa import ở đầu file:

```tsx
import { getSessionSubtitle, joinSessionMeta } from "@/features/attendance";
```

- [ ] **Bước 7: Chạy toàn bộ test và typecheck web**

Run: `pnpm --filter web test && pnpm --filter web typecheck`
Expected: PASS cả hai. Nếu một render-test nào đỏ vì mong thấy `"20:00"` dưới nhãn Bang
Chiến, nó đang khẳng định đúng thứ vừa đổi — sửa test.

- [ ] **Bước 8: Commit**

```bash
git add apps/web
git commit -m "refactor(web): drop the guild war subtitle now the label carries the time"
```

---

### Task 3: Biến môi trường `DISCORD_GUILD_ROLE_ID`

**Files:**
- Modify: `apps/api/src/config/env.validation.ts:43-51`
- Modify: `apps/api/.env.example:40-46`
- Modify: `docs/development.md:67`
- Modify: `docs/production.md:80`

**Interfaces:**
- Produces: `Env['DISCORD_GUILD_ROLE_ID']: string` — đọc bằng
  `config.get('DISCORD_GUILD_ROLE_ID', { infer: true })` ở Task 8.

- [ ] **Bước 1: Thêm vào schema**

Trong `env.validation.ts`, chèn ngay **sau** khối `DISCORD_PUBLIC_KEY`:

```ts
  /**
   * Discord ID of the guild role `/thong-bao` mentions.
   * Enable Developer Mode, then Server Settings → Roles → right-click the role → Copy Role ID.
   */
  DISCORD_GUILD_ROLE_ID: z.string().min(1),
```

- [ ] **Bước 2: Thêm vào `.env.example`**

Chèn ngay sau khối `DISCORD_PUBLIC_KEY=`:

```
# Guild role mentioned by /thong-bao. Enable Developer Mode, then Server Settings → Roles →
# right-click the role → Copy Role ID. Required: a missing value kills the API at boot.
DISCORD_GUILD_ROLE_ID=
```

- [ ] **Bước 3: Thêm một dòng vào bảng env của `docs/development.md`**

Ngay dưới dòng `DISCORD_PUBLIC_KEY` (dòng 67):

```
| `DISCORD_GUILD_ROLE_ID` | ✅ | — | Discord ID of the guild role `/thong-bao` mentions (Server Settings → Roles → Copy Role ID). Required — **the API refuses to boot without it** |
```

- [ ] **Bước 4: Thêm một dòng vào bảng env của `docs/production.md`**

Ngay dưới dòng `DISCORD_PUBLIC_KEY` (dòng 80):

```
| `DISCORD_GUILD_ROLE_ID` | Discord ID of the guild role `/thong-bao` mentions. **Set it before merging the PR that ships the command**: it is required, so a missing value kills the API at boot — and the web app has no other backend |
```

- [ ] **Bước 5: Đặt giá trị vào `.env` local rồi khởi động API**

Thêm `DISCORD_GUILD_ROLE_ID=<role id thật>` vào `apps/api/.env` (file này git-ignore, không
commit).

Run: `pnpm --filter api dev`
Expected: API boot bình thường. Bỏ biến ra và chạy lại thì phải chết ngay lúc boot với
thông báo nhắc đúng tên biến — đó là bằng chứng "misconfiguration fails loud" hoạt động.
Đặt lại giá trị trước khi đi tiếp.

- [ ] **Bước 6: Commit**

```bash
git add apps/api/src/config/env.validation.ts apps/api/.env.example docs/development.md docs/production.md
git commit -m "feat(api): require the guild role id used by the announcement command"
```

---

### Task 4: Kiểu embed, link button, và `custom_id` của nút thông báo

Không có test riêng: task này chỉ khai báo kiểu và hằng số, chúng được Task 5 khẳng định.
Cổng kiểm tra ở đây là `typecheck`.

**Files:**
- Modify: `apps/api/src/modules/discord-bot/discord.constants.ts:41-58`
- Modify: `apps/api/src/modules/discord-bot/commands/command.types.ts:26-80`
- Modify: `apps/api/src/modules/discord-bot/custom-id.ts:1-10`

**Interfaces:**
- Produces:
  - `BUTTON_STYLE.primary = 1`, `BUTTON_STYLE.link = 5`, `EMBED_COLOR: number`
  - `EmbedField`, `EmbedPayload`, `CustomIdButton`, `LinkButton`,
    `ButtonComponent = CustomIdButton | LinkButton`
  - `MessagePayload.embeds?: EmbedPayload[]`, `MessagePayload.allowed_mentions?: { roles: string[] }`
  - `CommandLinks { webOrigin: string; guildRoleId: string }`, `CommandDeps.links: CommandLinks`
  - `ANNOUNCEMENT_ATTENDANCE_ID = 'ann:diem-danh'`

- [ ] **Bước 1: Thêm hai style nút và màu embed**

Trong `discord.constants.ts`, thêm vào `BUTTON_STYLE` — `primary` đứng **trước**
`secondary` để khối giữ đúng thứ tự số của Discord:

```ts
export const BUTTON_STYLE = {
  /** Blurple — a call to action that is not an answer to anything */
  primary: 1,
  /** Grey — the answer that is not currently chosen */
  secondary: 2,
  /** Green — "Có", when it is the current answer */
  success: 3,
  /** Red — "Không", when it is the current answer */
  danger: 4,
  /** Opens a URL. Carries `url` instead of `custom_id`, and sends no interaction back */
  link: 5,
} as const;
```

Doc comment sẵn có phía trên `BUTTON_STYLE` nói về quy ước màu của bảng điểm danh; giữ
nguyên, nó vẫn đúng cho ba style đó.

Thêm hằng số màu ngay dưới `COMPONENT_TYPE`:

```ts
/**
 * Left border of the announcement embed, as Discord's 24-bit integer. Blurple: the announcement is
 * the bot speaking for itself, not a status the attendance colours describe.
 */
export const EMBED_COLOR = 0x5865f2;
```

- [ ] **Bước 2: Tách `ButtonComponent` thành union**

Trong `command.types.ts`, thay khối `ButtonComponent` hiện tại bằng:

```ts
/** A button that sends an interaction back. `custom_id` is snake_case: Discord's payload, verbatim. */
export interface CustomIdButton {
  type: (typeof COMPONENT_TYPE)['button'];
  /** A value from `BUTTON_STYLE`, never `link` */
  style: number;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

/**
 * A button that opens a URL. Discord handles the click itself and sends nothing back, which is why
 * this variant has no `custom_id` to route on.
 */
export interface LinkButton {
  type: (typeof COMPONENT_TYPE)['button'];
  style: (typeof BUTTON_STYLE)['link'];
  label: string;
  url: string;
}

/** One button of either kind. */
export type ButtonComponent = CustomIdButton | LinkButton;
```

Thêm `BUTTON_STYLE` vào khối import type sẵn có ở đầu file:

```ts
import type {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
} from '../discord.constants';
```

- [ ] **Bước 3: Thêm kiểu embed**

Chèn ngay trên `MessagePayload`:

```ts
/** One field of an embed. Discord lays up to three `inline` fields side by side on a row. */
export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** The framed, coloured block a message may carry alongside its text. */
export interface EmbedPayload {
  title: string;
  description: string;
  /** Left border colour, a 24-bit integer — see `EMBED_COLOR` */
  color: number;
  fields: EmbedField[];
  footer: { text: string };
}
```

- [ ] **Bước 4: Mở rộng `MessagePayload`**

```ts
/** The body of a message the bot sends or rewrites. */
export interface MessagePayload {
  content: string;
  /** Discord allows up to 10; the bot never sends more than one. */
  embeds?: EmbedPayload[];
  components?: ActionRow[];
  /** A bit field from `MESSAGE_FLAG` */
  flags?: number;
  /**
   * What this message is allowed to ping, snake_case because it is Discord's payload. Present to
   * *close* the default, not to open it: an embed built from admin-entered text could otherwise
   * carry an `@everyone` nobody intended.
   */
  allowed_mentions?: { roles: string[] };
}
```

- [ ] **Bước 5: Thêm `links` vào `CommandDeps`**

Chèn ngay trên `CommandDeps`:

```ts
/**
 * Configuration a command may read, resolved from env once by `InteractionRouter`.
 *
 * A flat value object rather than `ConfigService`: a command needs exactly these two strings, and
 * a test builds them as a literal instead of stubbing a Nest provider.
 */
export interface CommandLinks {
  /** Origin of the web app, linked from the announcement */
  webOrigin: string;
  /** Discord ID of the guild role `/thong-bao` mentions */
  guildRoleId: string;
}
```

và thêm một dòng vào `CommandDeps`:

```ts
export interface CommandDeps {
  attendance: AttendanceService;
  battleSessions: BattleSessionsService;
  characters: CharactersService;
  actors: ActorResolver;
  links: CommandLinks;
}
```

- [ ] **Bước 6: Thêm `custom_id` của nút thông báo**

Trong `custom-id.ts`, chèn ngay dưới khối `PART_COUNT`:

```ts
/**
 * custom_id of the "Điểm danh ngay" button on a `/thong-bao` announcement.
 *
 * A fixed string rather than an encoded value: the button always means "open the presser's own
 * board", and who is pressing arrives inside the signed interaction. Two parts behind an `ann`
 * prefix, so `decodeAttendanceButtonId` — which wants four parts behind `dd` — can never take it
 * for an attendance button.
 */
export const ANNOUNCEMENT_ATTENDANCE_ID = 'ann:diem-danh';
```

- [ ] **Bước 7: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: FAIL đúng một chỗ — `CommandDeps` giờ đòi `links`, mà getter `deps` trong
`interaction-router.ts` chưa có. Đó là lỗi được chờ đợi; Task 8 vá nó. Các file test dựng
deps bằng `as never` nên không đỏ.

- [ ] **Bước 8: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add embed and link button shapes to the discord command types"
```

---

### Task 5: `announcement.ts` — dựng thân thông báo

**Files:**
- Create: `apps/api/src/modules/discord-bot/announcement.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/announcement.spec.ts`

**Interfaces:**
- Consumes: `CommandLinks`, `EmbedField`, `MessagePayload`, `ActionRow` (Task 4);
  `ANNOUNCEMENT_ATTENDANCE_ID` (Task 4); `BUTTON_STYLE`, `COMPONENT_TYPE`, `EMBED_COLOR`
  (Task 4); `vnParts`, `shiftVnDate` từ `@guild/shared/lib`; `BattleSession` từ
  `@guild/shared/schemas`.
- Produces: `buildAnnouncement(sessions: readonly BattleSession[], links: CommandLinks): MessagePayload`

- [ ] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/announcement.spec.ts`:

```ts
import type { BattleSession } from '@guild/shared/schemas';

import { buildAnnouncement } from '../announcement';
import { ANNOUNCEMENT_ATTENDANCE_ID } from '../custom-id';
import { BUTTON_STYLE } from '../discord.constants';

const LINKS = {
  webOrigin: 'https://mmgh-nth.vercel.app',
  guildRoleId: '999888777',
};

/** Monday 2026-08-31 00:00 VN, the week both fixtures below belong to. */
const WEEK_START = '2026-08-30T17:00:00.000Z';

/**
 * One battle session, with only the fields the announcement reads spelled out.
 * @param overrides - Fields to override on top of a Thursday scrim
 * @returns A session shaped like the API returns it
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'a',
    label: 'Thứ 5 · 20:30',
    dateTime: '2026-09-03T13:30:00.000Z',
    deadline: '2026-09-03T03:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: 'Moonlight',
    weekStart: WEEK_START,
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

describe('buildAnnouncement', () => {
  it('mention role bang và chỉ cho phép ping đúng role đó', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.content).toBe('<@&999888777>');
    expect(payload.allowed_mentions).toEqual({ roles: ['999888777'] });
  });

  it('mỗi ngày đánh một field, kèm ngày và số trận', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const [field] = payload.embeds![0].fields;

    expect(field.name).toBe('⚔️ Thứ 5 · 20:30');
    expect(field.value).toContain('📅 03/09');
    expect(field.value).toContain('🎮 2 trận');
    expect(field.inline).toBe(true);
  });

  it('Bang Chiến đổi icon và không có dòng đối thủ', () => {
    const payload = buildAnnouncement(
      [
        session({
          label: 'Thứ 7 · 20:00 · Bang Chiến',
          isGuildWar: true,
          opponent: null,
          dateTime: '2026-09-05T13:00:00.000Z',
        }),
      ],
      LINKS,
    );
    const [field] = payload.embeds![0].fields;

    expect(field.name).toBe('🛡️ Thứ 7 · 20:00 · Bang Chiến');
    expect(field.value).not.toContain('🆚');
  });

  it('scrim có đối thủ thì hiện tên bang', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.embeds![0].fields[0].value).toContain('🆚 Moonlight');
  });

  it('scrim chưa chốt đối thủ thì bỏ hẳn dòng đó', () => {
    const payload = buildAnnouncement([session({ opponent: null })], LINKS);

    expect(payload.embeds![0].fields[0].value).not.toContain('🆚');
  });

  it('mô tả khoảng tuần từ thứ 2 đến thứ 7', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.embeds![0].description).toBe('31/08 – 05/09');
  });

  it('ghi chú hướng dẫn là field cuối, không inline', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const { fields } = payload.embeds![0];
    const last = fields[fields.length - 1];

    expect(fields).toHaveLength(2);
    expect(last.name).toBe('✅ Điểm danh');
    expect(last.value).toContain('/diem-danh');
    expect(last.inline).toBe(false);
  });

  it('tuần rỗng thì nói rõ và chỉ còn ghi chú', () => {
    const payload = buildAnnouncement([], LINKS);

    expect(payload.embeds![0].description).toBe(
      'Tuần này chưa có ngày đánh nào.',
    );
    expect(payload.embeds![0].fields).toHaveLength(1);
  });

  it('hai nút: điểm danh mang custom_id hằng số, mở web là link button', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const [attendance, website] = payload.components![0].components;

    expect(attendance).toEqual({
      type: 2,
      style: BUTTON_STYLE.primary,
      label: '✅ Điểm danh ngay',
      custom_id: ANNOUNCEMENT_ATTENDANCE_ID,
    });
    expect(website).toEqual({
      type: 2,
      style: BUTTON_STYLE.link,
      label: '🌐 Mở website',
      url: 'https://mmgh-nth.vercel.app',
    });
  });

  it('thông báo không ephemeral — cả bang phải thấy', () => {
    expect(buildAnnouncement([session()], LINKS).flags).toBeUndefined();
  });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter api test -- announcement`
Expected: FAIL — `Cannot find module '../announcement'`.

- [ ] **Bước 3: Viết `announcement.ts`**

```ts
import { shiftVnDate, vnParts } from '@guild/shared/lib';
import type { BattleSession } from '@guild/shared/schemas';

import type {
  ActionRow,
  CommandLinks,
  EmbedField,
  MessagePayload,
} from './commands/command.types';
import { ANNOUNCEMENT_ATTENDANCE_ID } from './custom-id';
import {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  EMBED_COLOR,
} from './discord.constants';

const TITLE = '📢 LỊCH ĐÁNH TUẦN NÀY';

/** Replaces the date range when the week holds no battle day at all. */
const NO_SESSIONS = 'Tuần này chưa có ngày đánh nào.';

const HOW_TO_NAME = '✅ Điểm danh';

const HOW_TO_VALUE = [
  'Bấm **Điểm danh ngay** bên dưới, hoặc gõ `/diem-danh` trong chat.',
  'Bận thì chọn **KHÔNG**.',
  'Gặp lỗi đăng nhập thì báo admin.',
].join('\n');

const FOOTER = 'Guild Manager';

/** An attendance week runs Monday 00:00 → Saturday 23:59 (architecture.md §6). */
const DAYS_TO_WEEK_END = 5;

/**
 * Day and month of an instant, read in Vietnam time.
 * @param date - The instant
 * @returns A `dd/MM` string
 */
function formatDayMonth(date: Date): string {
  const { day, month } = vnParts(date);

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/**
 * The week's date range, for the line under the title.
 * @param weekStart - Monday 00:00 of the week, as the API returns it
 * @returns A range like "31/08 – 05/09"
 */
function describeWeek(weekStart: string): string {
  const start = new Date(weekStart);
  const end = shiftVnDate(start, DAYS_TO_WEEK_END, 0, 0);

  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

/**
 * One battle day as an embed field.
 *
 * The label is the one the backend already built (`formatSessionLabel`), never rebuilt here — a
 * second labelling convention is exactly what this command was written to avoid.
 *
 * @param session - The battle day
 * @returns An inline field, so Discord lays three of them per row
 */
function toField(session: BattleSession): EmbedField {
  const icon = session.isGuildWar ? '🛡️' : '⚔️';
  const lines = [
    `📅 ${formatDayMonth(new Date(session.dateTime))}`,
    `🎮 ${session.matchCount} trận`,
  ];

  if (session.opponent) lines.push(`🆚 ${session.opponent}`);

  return {
    name: `${icon} ${session.label}`,
    value: lines.join('\n'),
    inline: true,
  };
}

/**
 * The row of buttons under the announcement.
 * @param webOrigin - Origin of the web app
 * @returns One action row holding both buttons
 */
function buildButtons(webOrigin: string): ActionRow {
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

/**
 * Build the weekly schedule announcement.
 *
 * Pure: everything it shows arrives in `sessions`, so the whole layout is testable without a
 * database. The role mention lives in `content` rather than inside the embed, because Discord only
 * notifies people for mentions in the message text.
 *
 * @param sessions - Battle days of the open week, in the order they are played
 * @param links - Web origin and the guild role to mention
 * @returns The message body, ready to be wrapped by `publicMessage`
 */
export function buildAnnouncement(
  sessions: readonly BattleSession[],
  links: CommandLinks,
): MessagePayload {
  const howTo: EmbedField = {
    name: HOW_TO_NAME,
    value: HOW_TO_VALUE,
    inline: false,
  };

  return {
    content: `<@&${links.guildRoleId}>`,
    embeds: [
      {
        title: TITLE,
        description:
          sessions.length > 0
            ? describeWeek(sessions[0].weekStart)
            : NO_SESSIONS,
        color: EMBED_COLOR,
        fields: [...sessions.map(toField), howTo],
        footer: { text: FOOTER },
      },
    ],
    components: [buildButtons(links.webOrigin)],
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
```

- [ ] **Bước 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter api test -- announcement`
Expected: PASS — 10 test.

- [ ] **Bước 5: Commit**

```bash
git add apps/api/src/modules/discord-bot/announcement.ts apps/api/src/modules/discord-bot/__tests__/announcement.spec.ts
git commit -m "feat(api): build the weekly schedule announcement embed"
```

---

### Task 6: `buildOwnBoard` — một đường dựng bảng cho chính người gọi

`/diem-danh` và nút "Điểm danh ngay" cần đúng một chuỗi: resolve actor → kiểm tra nhân vật
→ dựng bảng. Rút thành một hàm trước khi có hai chỗ gọi.

**Files:**
- Modify: `apps/api/src/modules/discord-bot/attendance-board.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/diem-danh.command.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/diem-danh.command.spec.ts` (không sửa)

**Interfaces:**
- Consumes: `CommandDeps`, `MessagePayload` (Task 4).
- Produces: `buildOwnBoard(discordId: string, deps: CommandDeps): Promise<MessagePayload>` —
  export từ `attendance-board.ts`, dùng lại ở Task 8.

- [ ] **Bước 1: Thêm `buildOwnBoard` vào `attendance-board.ts`**

Chuyển hằng số `NO_OWN_CHARACTER` từ `diem-danh.command.ts` sang, đặt cạnh `NOT_LINKED`:

```ts
/** Shown to a rescue admin who has no character of their own to mark. */
const NO_OWN_CHARACTER =
  'Tài khoản admin này không gắn với nhân vật nào — dùng /diem-danh-ho.';
```

rồi thêm hàm vào cuối file:

```ts
/**
 * The attendance board for whoever is acting, resolved from their Discord ID.
 *
 * Shared by `/diem-danh` and the "Điểm danh ngay" button on a `/thong-bao` announcement. The two
 * differ only in how the reply is wrapped, and two copies of this resolve-then-check chain would
 * drift apart the first time one of the refusals is reworded.
 *
 * @param discordId - Discord ID read out of the signed interaction
 * @param deps - Services the board reads through
 * @returns The board, or a body explaining why there is none
 */
export async function buildOwnBoard(
  discordId: string,
  deps: CommandDeps,
): Promise<MessagePayload> {
  const resolved = await deps.actors.resolve(discordId);

  if (!resolved) return { content: NOT_LINKED };
  if (!resolved.characterId) return { content: NO_OWN_CHARACTER };

  const row = await deps.characters.findById(resolved.characterId);

  if (!row) return { content: NOT_LINKED };

  return buildAttendanceBoard(
    { characterId: row.id, characterName: row.name, discordId: row.discordId },
    resolved.actor,
    deps,
  );
}
```

- [ ] **Bước 2: Rút gọn `diem-danh.command.ts`**

Thay toàn bộ nội dung file:

```ts
import { buildOwnBoard } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeral } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Attendance for the caller's own character.
 *
 * Everything it needs is derived from the Discord ID inside the signed interaction: the command
 * takes no arguments, so there is nothing a caller could point at somebody else.
 */
export const diemDanhCommand: SlashCommand = {
  definition: {
    name: 'diem-danh',
    description: 'Điểm danh các ngày đánh trong tuần',
  },

  execute: async (interaction, deps): Promise<CommandReply> =>
    ephemeral(await buildOwnBoard(callerDiscordId(interaction), deps)),
};
```

- [ ] **Bước 3: Chạy test cũ, xác nhận PASS không sửa gì**

Run: `pnpm --filter api test -- diem-danh`
Expected: PASS. `diem-danh.command.spec.ts` **không được sửa** — nó là bằng chứng việc rút
hàm không đổi hành vi. Nếu nó đỏ thì việc rút hàm sai, không phải test sai.

- [ ] **Bước 4: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "refactor(api): share the own-character board between command and button"
```

---

### Task 7: Lệnh `/thong-bao`

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/thong-bao.command.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/index.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/thong-bao.command.spec.ts`

**Interfaces:**
- Consumes: `buildAnnouncement` (Task 5); `NOT_LINKED` từ `attendance-board.ts`;
  `canManageGuild` từ `@guild/shared/lib`; `callerDiscordId`; `ephemeralText`,
  `publicMessage`; `CommandDeps.links` (Task 4).
- Produces: `thongBaoCommand: SlashCommand`, đăng ký trong `commands`.

- [ ] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/thong-bao.command.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { thongBaoCommand } from '../commands/thong-bao.command';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  data: { name: 'thong-bao' },
  member: { user: { id: '111' } },
};

/**
 * Build deps around one resolved actor.
 * @param resolved - What ActorResolver.resolve returns
 * @returns Stubbed deps holding no battle session
 */
function makeDeps(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    characters: {},
    attendance: {},
    links: {
      webOrigin: 'https://mmgh-nth.vercel.app',
      guildRoleId: '999888777',
    },
  } as never;
}

/**
 * A resolved actor with the given role.
 * @param role - Guild role the caller signs in with
 * @returns The shape ActorResolver.resolve returns
 */
function actor(role: GuildRole): unknown {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    characterId: 'meo-beo-k7ma3x',
  };
}

describe('/thong-bao', () => {
  it('admin đăng được thông báo công khai có mention role', async () => {
    const reply = await thongBaoCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.ADMIN)),
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBeUndefined();
    expect(reply.data.content).toBe('<@&999888777>');
  });

  it('thành viên thường bị từ chối, và chỉ mình họ thấy', async () => {
    const reply = await thongBaoCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.MEMBER)),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toBe('Chỉ admin mới đăng thông báo được.');
  });

  it('Discord ID chưa gán nhân vật nào thì nói rõ', async () => {
    const reply = await thongBaoCommand.execute(INTERACTION, makeDeps(null));

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('không đọc lịch khi người gọi không đủ quyền', async () => {
    const deps = makeDeps(actor(GuildRole.MEMBER));

    await thongBaoCommand.execute(INTERACTION, deps);

    expect(deps.battleSessions.listByWeek).not.toHaveBeenCalled();
  });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter api test -- thong-bao`
Expected: FAIL — `Cannot find module '../commands/thong-bao.command'`.

- [ ] **Bước 3: Viết lệnh**

Tạo `apps/api/src/modules/discord-bot/commands/thong-bao.command.ts`:

```ts
import { canManageGuild } from '@guild/shared/lib';

import { buildAnnouncement } from '../announcement';
import { NOT_LINKED } from '../attendance-board';
import { callerDiscordId } from '../interaction.schema';
import { ephemeralText, publicMessage } from '../reply';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Shown to a member who tried to announce.
 * The refusal stays ephemeral even though the announcement is public: a channel does not need to
 * watch someone be told no.
 */
const ADMIN_ONLY = 'Chỉ admin mới đăng thông báo được.';

/**
 * Post this week's schedule for the whole guild — admins only.
 *
 * It never runs on its own. There is no scheduler behind it and none is planned: an announcement
 * carries a mention that pings every member, and who is pinged when is a decision an admin makes,
 * not a cron expression.
 *
 * The role is checked here rather than left to a service, because the reply itself is the effect —
 * by the time anything downstream could refuse, the message would already be in the channel.
 */
export const thongBaoCommand: SlashCommand = {
  definition: {
    name: 'thong-bao',
    description: 'Đăng lịch đánh tuần này cho cả bang (chỉ admin)',
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const sessions = await deps.battleSessions.listByWeek();

    return publicMessage(buildAnnouncement(sessions, deps.links));
  },
};
```

- [ ] **Bước 4: Đăng ký lệnh**

Trong `commands/index.ts`, thêm import và một phần tử:

```ts
import { thongBaoCommand } from './thong-bao.command';
```

```ts
export const commands: readonly SlashCommand[] = [
  pingCommand,
  diemDanhCommand,
  diemDanhHoCommand,
  thongBaoCommand,
];
```

- [ ] **Bước 5: Chạy test, xác nhận PASS**

Run: `pnpm --filter api test -- thong-bao`
Expected: PASS — 4 test.

- [ ] **Bước 6: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the /thong-bao weekly schedule announcement command"
```

---

### Task 8: Router — dựng `links` và phân nhánh nút

**Files:**
- Modify: `apps/api/src/modules/discord-bot/interaction-router.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`

**Interfaces:**
- Consumes: `buildOwnBoard` (Task 6); `ANNOUNCEMENT_ATTENDANCE_ID` (Task 4);
  `CommandLinks` (Task 4); `ConfigService<Env, true>`.
- Produces: `InteractionRouter` với constructor **5 tham số** —
  `(attendance, battleSessions, characters, actors, config)`.

- [ ] **Bước 1: Viết test thất bại**

Thay toàn bộ `interaction-router.spec.ts` bằng:

```ts
import { ANNOUNCEMENT_ATTENDANCE_ID } from '../custom-id';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

/** Every refusal below lands on this one sentence, so it is written once. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/**
 * Build a router over stubbed collaborators.
 * @param resolve - What ActorResolver.resolve returns; the /ping path never reaches it
 * @returns The router under test
 */
function makeRouter(resolve: unknown = null): InteractionRouter {
  return new InteractionRouter(
    {} as never,
    {} as never,
    {} as never,
    { resolve: jest.fn().mockResolvedValue(resolve) } as never,
    { get: jest.fn().mockReturnValue('') } as never,
  );
}

describe('InteractionRouter', () => {
  it('trả PONG cho gói PING', async () => {
    await expect(makeRouter().route({ type: 1 })).resolves.toEqual({
      type: INTERACTION_RESPONSE_TYPE.pong,
    });
  });

  it('gọi đúng lệnh theo tên', async () => {
    const reply = await makeRouter().route({ type: 2, data: { name: 'ping' } });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: 'Pong! Bot đang chạy.' },
    });
  });

  it('lệnh chưa có trong registry thì báo lỗi chung và ghi log', async () => {
    // Trước đây lỗi thoát ra thành 500. Giờ Discord phải nhận 200 kèm một câu, nếu không nó chỉ
    // hiện "ứng dụng không phản hồi" — chi tiết vẫn nằm nguyên trong log của router.
    const reply = await makeRouter().route({
      type: 2,
      data: { name: 'khong-ton-tai' },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: {
        content: 'Có lỗi xảy ra. Thử lại sau hoặc điểm danh trên web.',
        flags: MESSAGE_FLAG.ephemeral,
      },
    });
  });

  it('nút trên thông báo mở một message riêng, không ghi đè thông báo chung', async () => {
    const reply = await makeRouter().route({
      type: 3,
      data: { custom_id: ANNOUNCEMENT_ATTENDANCE_ID },
      member: { user: { id: '111' } },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: NOT_LINKED, flags: MESSAGE_FLAG.ephemeral },
    });
  });

  it('nút trên bảng điểm danh vẫn ghi đè chính message nó đang nằm', async () => {
    const reply = await makeRouter().route({
      type: 3,
      data: { custom_id: 'dd:session-1:char-1:1' },
      member: { user: { id: '111' } },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.updateMessage,
      data: { content: NOT_LINKED },
    });
  });
});
```

- [ ] **Bước 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter api test -- interaction-router`
Expected: FAIL — `InteractionRouter` mới nhận 4 tham số, và nút announcement đang trả
`updateMessage`.

- [ ] **Bước 3: Thêm `ConfigService` và getter `links`**

Trong `interaction-router.ts`, thêm/gộp các import (đừng thêm dòng trùng —
`handleAttendanceButton` và `ephemeralText` đã được import từ trước):

```ts
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config';
import { buildOwnBoard, handleAttendanceButton } from './attendance-board';
import { ANNOUNCEMENT_ATTENDANCE_ID } from './custom-id';
import {
  callerDiscordId,
  type Interaction,
  type MessageComponentInteraction,
} from './interaction.schema';
import { ephemeral, ephemeralText } from './reply';
```

Thêm tham số cuối vào constructor:

```ts
  constructor(
    private readonly attendance: AttendanceService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly actors: ActorResolver,
    private readonly config: ConfigService<Env, true>,
  ) {}
```

Thay getter `deps`:

```ts
  /** The services and configuration a command may reach, bundled once. */
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
    };
  }
```

- [ ] **Bước 4: Phân nhánh nút**

Trong `dispatch`, thay nhánh `messageComponent`:

```ts
      case INTERACTION_TYPE.messageComponent:
        return this.routeComponent(interaction);
```

và thêm phương thức ngay dưới `dispatch`:

```ts
  /**
   * Answer one component press.
   *
   * The announcement's button gets a **new** ephemeral message rather than an update. It sits on a
   * message the whole guild is reading, so updating would replace the announcement itself with the
   * presser's own board — the first person to press would delete it for everyone. Every other
   * component is an attendance button, which does sit on a message it is entitled to rewrite.
   *
   * @param interaction - The validated button press
   * @returns The reply Discord shows
   */
  private async routeComponent(
    interaction: MessageComponentInteraction,
  ): Promise<InteractionReply> {
    if (interaction.data.custom_id === ANNOUNCEMENT_ATTENDANCE_ID) {
      return ephemeral(
        await buildOwnBoard(callerDiscordId(interaction), this.deps),
      );
    }

    return {
      type: INTERACTION_RESPONSE_TYPE.updateMessage,
      data: await handleAttendanceButton(interaction, this.deps),
    };
  }
```

- [ ] **Bước 5: Chạy test, xác nhận PASS**

Run: `pnpm --filter api test -- interaction-router`
Expected: PASS — 5 test.

- [ ] **Bước 6: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: PASS. Lỗi `CommandDeps` thiếu `links` từ Task 4 giờ đã hết.

- [ ] **Bước 7: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): open a private board from the announcement button"
```

---

### Task 9: Kiểm chứng end-to-end và mở PR

**Files:** không sửa file nào; PR body điền theo `.github/pull_request_template.md`.

- [ ] **Bước 1: Chạy đủ sáu cổng CI ở local**

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Expected: PASS tất cả. Đỏ chỗ nào thì sửa tại đó rồi chạy lại — đừng đi tiếp.

- [ ] **Bước 2: Đăng ký lệnh với Discord (local)**

Run: `pnpm --filter api discord:register`
Expected: log liệt kê **4** lệnh: `ping, diem-danh, diem-danh-ho, thong-bao`.

- [ ] **Bước 3: Thử tay trong server Discord test**

1. Gõ `/thong-bao` bằng tài khoản ADMIN ⇒ thông báo công khai, embed có viền màu, role bang
   được ping thật (hiện highlight, có notification).
2. Gõ `/thong-bao` bằng tài khoản MEMBER ⇒ chỉ mình họ thấy câu
   `Chỉ admin mới đăng thông báo được.`
3. Bấm **Điểm danh ngay** ⇒ hiện bảng điểm danh riêng tư, **và thông báo gốc vẫn còn nguyên
   trong kênh**. Đây là kiểm chứng quan trọng nhất của cả plan.
4. Bấm Có/Không trên bảng vừa mở ⇒ bảng tự cập nhật tại chỗ, không đẻ message mới.
5. Bấm **Mở website** ⇒ mở đúng `WEB_ORIGIN`.
6. Mở `/diem-danh` trên web và trong Discord ⇒ nhãn Bang Chiến hiện
   `Thứ 7 · 20:00 · Bang Chiến` ở cả hai, và **không** có dòng phụ `20:00` thừa bên dưới.

- [ ] **Bước 4: Đặt biến trên production TRƯỚC khi mở PR**

Đặt `DISCORD_GUILD_ROLE_ID` trong environment của API production. Biến là bắt buộc: merge
PR mà chưa đặt thì API không boot, và web không có backend nào khác — cả site sập.

- [ ] **Bước 5: Mở PR**

Đẩy nhánh `feat/thong-bao-command` lên `origin`, rồi tạo PR vào `main` với tiêu đề
`feat(api): add the /thong-bao weekly schedule announcement`.

Lưu ý: repo có hook chặn thao tác đẩy cho tới khi review pass — chạy skill `pr-review`
trước, khi verdict là Approve thì thao tác đẩy mới được cho qua.

PR body theo `.github/pull_request_template.md`, và **phải** nêu ba việc vận hành:

1. `DISCORD_GUILD_ROLE_ID` đã đặt trên production (bắt buộc, thiếu là API chết lúc boot).
2. Sau khi deploy, chạy
   `DISCORD_ENV_FILE=.env.production pnpm --filter api discord:register`.
3. Role bang phải mentionable, hoặc bot có quyền Mention Everyone.

---

## Self-review

**Spec coverage**

| Mục spec | Task |
|---|---|
| §2 Không chạy tự động | 7 (nêu trong doc comment của lệnh) |
| §3.1 Tuần đang mở, không option | 7 |
| §3.2 Role từ env, bắt buộc | 3, 8 |
| §3.3 `allowed_mentions` tường minh | 4, 5 |
| §3.4 Nút trả message mới | 8 (có test riêng) |
| §3.5 So khớp hằng số | 4, 8 |
| §3.6 Dùng chung đường dựng bảng | 6 |
| §3.7 `CommandDeps.links` | 4, 8 |
| §3.8 Nhãn kèm giờ + dọn dòng phụ | 1, 2 |
| §4 Hình dạng thông báo | 5 |
| §5 Bảng file | 1–8 |
| §6 Luồng | 7, 8 |
| §7 Vận hành | 3, 9 |
| §8 Test | 1, 2, 5, 7, 8 |
| §9 Rủi ro | 9 |

**Placeholder scan** — không có TBD/TODO; mọi bước code đều có khối code thật.

**Type consistency** — `CommandLinks` (Task 4) được Task 5 và Task 8 dùng đúng tên trường
`webOrigin` / `guildRoleId`; `ANNOUNCEMENT_ATTENDANCE_ID` khai báo ở Task 4, dùng ở Task 5
và Task 8; `buildOwnBoard` khai báo ở Task 6, dùng ở Task 8; `buildAnnouncement` khai báo ở
Task 5, dùng ở Task 7; `joinSessionMeta` khai báo và dùng trong Task 2.

**Thứ tự** — Task 4 cố ý để `typecheck` đỏ cho tới Task 8; đó là lỗi duy nhất được phép tồn
tại giữa chừng và bước 7 của Task 4 nói rõ. Mọi task khác kết thúc ở trạng thái xanh.
