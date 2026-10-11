# Lệnh Discord `/diem-danh` và `/diem-danh-ho` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép điểm danh ngay trong Discord bằng `/diem-danh` (cho chính mình) và `/diem-danh-ho @ai-đó` (admin điểm danh thay người khác), qua một tin nhắn ephemeral có nút `Có` / `Không` cho từng ngày đánh của tuần đang mở.

**Architecture:** Không có endpoint mới — cả hai lệnh đi qua `POST /discord/interactions` đã có. Registry lệnh đổi từ hàm thuần đồng bộ sang `async execute(interaction, deps)`, với `deps` do một `InteractionRouter` (provider Nest) bó sẵn; như vậy `register-discord-commands.ts` vẫn import `commandDefinitions` tĩnh mà không phải boot Nest. Mọi lượt ghi vẫn đi qua `AttendanceService.mark`, nên bot không có bộ luật quyền riêng.

**Tech Stack:** NestJS 11, TypeScript, Zod, Prisma, Jest 30. Discord HTTP Interactions API v10.

**Spec:** `docs/superpowers/specs/2026-09-02-discord-attendance-commands-design.md`

## Global Constraints

- **Mọi comment và tên file bằng tiếng Anh**; nội dung trong `docs/superpowers/` bằng tiếng Việt (CLAUDE.md gốc repo).
- **Mọi function phải có doc comment tiếng Anh** nêu purpose, từng param, và giá trị trả về (quy tắc global của người dùng).
- **Không `forwardRef()`.** Một cycle nghĩa là logic thuộc về một module thứ ba.
- **Ranh giới module:** chỉ được import qua `*.public.ts` hoặc `*.module.ts` của module khác (`apps/api/eslint.config.mjs`). Chạm vào file nội bộ của module khác là lint error.
- **Không viết lại luật quyền trong bot.** `AttendanceService.mark` là nơi duy nhất quyết định ai ghi được gì. Ngoại lệ duy nhất và đã được spec chấp thuận: `/diem-danh-ho` kiểm tra vai trò *trước khi hiện bảng*, vì service chỉ từ chối lúc ghi.
- **Không tin `custom_id`.** Nó là dữ liệu client gửi lại; `actor` luôn dựng từ Discord ID mà chữ ký Ed25519 bảo chứng.
- **Giới hạn cứng của Discord:** 5 action row mỗi tin nhắn, 5 nút mỗi row, `custom_id` ≤ 100 ký tự, nhãn nút ≤ 80 ký tự, phản hồi trong 3 giây.
- **Không migration, không biến môi trường mới, không đụng `apps/web` hay `packages/shared`.**
- Lệnh chạy test: `pnpm --filter api test -- <đường dẫn file spec>`. Lint: `pnpm --filter api lint`. Typecheck: `pnpm --filter api typecheck`.
- Commit message theo Conventional Commits, tiếng Anh, không có dòng attribution.

---

## Cấu trúc file

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `apps/api/src/modules/auth/actor-identity.ts` | Hai hàm thuần: `isRescueAdmin`, `resolveGuildRole`. Không DI, không I/O. |
| `apps/api/src/modules/auth/auth.public.ts` | Cửa public của module `auth` — chỉ hai hàm trên. |
| `apps/api/src/modules/attendance/attendance.public.ts` | Cửa public của module `attendance` — `AttendanceService`. |
| `apps/api/src/modules/discord-bot/custom-id.ts` | Mã hoá / giải mã `custom_id` của nút điểm danh. |
| `apps/api/src/modules/discord-bot/reply.ts` | `ephemeral` / `ephemeralText`. Một file riêng, không phải trên router: các lệnh cần chúng mà router lại import registry lệnh — để trên router là hai file import vòng nhau và không file nào nạp xong. |
| `apps/api/src/modules/discord-bot/actor-resolver.ts` | `ActorResolver`: Discord ID → `{ actor, characterId }`. |
| `apps/api/src/modules/discord-bot/attendance-board.ts` | `buildAttendanceBoard` + `handleAttendanceButton`. Nơi duy nhất dựng bảng điểm danh. |
| `apps/api/src/modules/discord-bot/commands/diem-danh.command.ts` | Lệnh `/diem-danh`. |
| `apps/api/src/modules/discord-bot/commands/diem-danh-ho.command.ts` | Lệnh `/diem-danh-ho`. |

**Sửa**

| File | Sửa gì |
|---|---|
| `apps/api/src/modules/auth/auth.service.ts` | Bỏ `isRescueAdmin` private, gọi hai hàm thuần mới. Hành vi không đổi. |
| `apps/api/src/modules/attendance/attendance.module.ts` | Thêm `exports: [AttendanceService]`. |
| `apps/api/src/modules/discord-bot/discord.constants.ts` | Thêm hằng số interaction/component/flag/giới hạn. |
| `apps/api/src/modules/discord-bot/interaction.schema.ts` | Thêm nhánh `MESSAGE_COMPONENT`, người gọi, option của lệnh. |
| `apps/api/src/modules/discord-bot/commands/command.types.ts` | `CommandDeps`, `MessagePayload`, `execute` async. |
| `apps/api/src/modules/discord-bot/commands/ping.command.ts` | Thành `async`, nhận `deps` và không dùng. |
| `apps/api/src/modules/discord-bot/commands/index.ts` | Thêm hai lệnh mới. |
| `apps/api/src/modules/discord-bot/interaction-router.ts` | Hàm module-level → `InteractionRouter` `@Injectable`, xử lý nút, bọc lỗi. |
| `apps/api/src/modules/discord-bot/discord-bot.controller.ts` | Inject router thay vì gọi hàm. |
| `apps/api/src/modules/discord-bot/discord-bot.module.ts` | `imports` ba module, `providers` thêm router và resolver. |
| `docs/architecture.md` | §3.3 mô tả module `discord-bot`. |
| `apps/api/README.md`, `apps/api/CLAUDE.md` | Nhắc chạy lại `discord:register`. |

---

## Task 1: Tách luật "Discord ID → vai trò" ra khỏi `AuthService`

Luật này hôm nay nằm nửa trong method `private isRescueAdmin`, nửa trong một biểu thức viết thẳng giữa `describeSession`. Bot cần đúng luật đó. Chép sang là cách chắc chắn nhất để hai bên lệch nhau, nên tách ra trước, và test cũ của `AuthService` phải xanh nguyên để chứng minh hành vi không đổi.

**Files:**
- Create: `apps/api/src/modules/auth/actor-identity.ts`
- Create: `apps/api/src/modules/auth/auth.public.ts`
- Create: `apps/api/src/modules/auth/__tests__/actor-identity.spec.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`

**Interfaces:**
- Consumes: `GuildRole` từ `@guild/shared/enums`.
- Produces:
  - `isRescueAdmin(discordId: string, adminIdsRaw: string): boolean`
  - `resolveGuildRole(input: { isRescue: boolean; memberRole: GuildRole | null }): GuildRole`
  - Cả hai export lại qua `apps/api/src/modules/auth/auth.public.ts`.

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/auth/__tests__/actor-identity.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { isRescueAdmin, resolveGuildRole } from '../actor-identity';

describe('isRescueAdmin', () => {
  it('nhận ra ID nằm trong danh sách', () => {
    expect(isRescueAdmin('123', '123,456')).toBe(true);
  });

  it('bỏ qua khoảng trắng quanh mỗi ID', () => {
    expect(isRescueAdmin('456', ' 123 , 456 ')).toBe(true);
  });

  it('danh sách rỗng thì không ai là admin cứu hộ', () => {
    // Chuỗi rỗng tách ra thành [''] — nếu không lọc, một discordId rỗng sẽ khớp.
    expect(isRescueAdmin('', '')).toBe(false);
    expect(isRescueAdmin('123', '')).toBe(false);
  });

  it('không khớp một phần của ID', () => {
    expect(isRescueAdmin('12', '123')).toBe(false);
  });
});

describe('resolveGuildRole', () => {
  it('danh sách cứu hộ thắng giá trị trong database', () => {
    // Một admin không được tự khoá mình ra ngoài vì role trong DB bị sửa nhầm.
    expect(
      resolveGuildRole({ isRescue: true, memberRole: GuildRole.MEMBER }),
    ).toBe(GuildRole.ADMIN);
  });

  it('không cứu hộ thì lấy role của nhân vật', () => {
    expect(
      resolveGuildRole({ isRescue: false, memberRole: GuildRole.ADMIN }),
    ).toBe(GuildRole.ADMIN);
  });

  it('không cứu hộ và không có nhân vật thì là MEMBER', () => {
    expect(resolveGuildRole({ isRescue: false, memberRole: null })).toBe(
      GuildRole.MEMBER,
    );
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/auth/__tests__/actor-identity.spec.ts`
Expected: FAIL — `Cannot find module '../actor-identity'`.

- [ ] **Step 3: Viết `actor-identity.ts`**

```ts
import { GuildRole } from '@guild/shared/enums';

/**
 * Whether this Discord ID is on the rescue list.
 *
 * A pure function rather than a method on AuthService: the Discord bot resolves the same identity
 * without going through a login, and a copy of this rule in two places is a copy that drifts.
 *
 * @param discordId - Discord ID to test
 * @param adminIdsRaw - Raw DISCORD_ADMIN_IDS value: comma-separated, possibly empty
 * @returns true when the ID is listed
 */
export function isRescueAdmin(discordId: string, adminIdsRaw: string): boolean {
  return adminIdsRaw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '')
    .includes(discordId);
}

/**
 * The guild role an identity acts with.
 * @param input.isRescue - Whether the Discord ID is on the rescue list
 * @param input.memberRole - Role stored on the matching Character, null when there is none
 * @returns The effective role
 */
export function resolveGuildRole(input: {
  isRescue: boolean;
  memberRole: GuildRole | null;
}): GuildRole {
  // The rescue list beats the database value: an admin must not lock themselves out.
  if (input.isRescue) return GuildRole.ADMIN;

  return input.memberRole ?? GuildRole.MEMBER;
}
```

- [ ] **Step 4: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/auth/__tests__/actor-identity.spec.ts`
Expected: PASS, 7 test.

- [ ] **Step 5: Sửa `AuthService` để dùng hai hàm này**

Trong `apps/api/src/modules/auth/auth.service.ts`:

1. Thêm import: `import { isRescueAdmin, resolveGuildRole } from './actor-identity';`
2. Xoá hoàn toàn method `private isRescueAdmin(discordId: string): boolean` cùng doc comment của nó.
3. Trong `describeSession`, thay:

```ts
    const isRescue = this.isRescueAdmin(discordId);
```

bằng:

```ts
    const isRescue = isRescueAdmin(
      discordId,
      this.config.get('DISCORD_ADMIN_IDS', { infer: true }),
    );
```

4. Trong cùng method, thay dòng `role:` trong object `verifyResponse(...)`:

```ts
      // The rescue list beats the database value: an admin must not lock themselves out.
      role: isRescue ? GuildRole.ADMIN : (member?.role ?? GuildRole.MEMBER),
```

bằng:

```ts
      role: resolveGuildRole({ isRescue, memberRole: member?.role ?? null }),
```

5. Có **call site thứ hai** trong `handleCallback` (khoảng dòng 108). Thay:

```ts
    if (!member && !this.isRescueAdmin(profile.id)) {
```

bằng:

```ts
    const adminIds = this.config.get('DISCORD_ADMIN_IDS', { infer: true });

    if (!member && !isRescueAdmin(profile.id, adminIds)) {
```

6. `GuildRole` không còn được dùng chỗ nào khác trong file — xoá import của nó.

- [ ] **Step 6: Tạo `auth.public.ts`**

```ts
/**
 * Public API of the auth module.
 *
 * This is the only file other modules may import code from; every other file in this directory is
 * internal (the module boundary rule in `eslint.config.mjs`).
 *
 * Only the two pure identity rules are exposed. `AuthService` stays internal: nobody outside owns
 * a login, and the Discord bot needs the *rules*, not the OAuth flow.
 */
export { isRescueAdmin, resolveGuildRole } from './actor-identity';
```

- [ ] **Step 7: Chạy toàn bộ test của module auth + lint + typecheck**

Run: `pnpm --filter api test -- src/modules/auth`
Expected: PASS — mọi test cũ của `AuthService` xanh nguyên. Nếu có test nào đỏ thì hành vi đã đổi, phải sửa lại refactor chứ không sửa test.

Run: `pnpm --filter api lint && pnpm --filter api typecheck`
Expected: sạch.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "refactor(api): extract the discord identity rules out of auth service"
```

---

## Task 2: Mở cửa public cho `attendance` và nối dây module

Bot phải import `AttendanceService`, mà module `attendance` hôm nay không export gì và không có `*.public.ts` — hai thứ đều bắt buộc theo luật ranh giới trong `eslint.config.mjs`.

**Files:**
- Create: `apps/api/src/modules/attendance/attendance.public.ts`
- Modify: `apps/api/src/modules/attendance/attendance.module.ts`
- Modify: `apps/api/src/modules/discord-bot/discord-bot.module.ts`

**Interfaces:**
- Produces: `AttendanceService` import được từ `../attendance/attendance.public`; `DiscordBotModule` inject được `AttendanceService`, `BattleSessionsService`, `CharactersService`.

- [ ] **Step 1: Tạo `attendance.public.ts`**

```ts
/**
 * Public API of the attendance module.
 *
 * This is the only file other modules may import code from; every other file in this directory is
 * internal (the module boundary rule in `eslint.config.mjs`). The neighbouring `.module.ts` is left
 * with only its Nest DI declaration role.
 *
 * Re-exports only, never importing back from another module — if two `.public.ts` files need each
 * other that is a real domain cycle, and the answer is a third module, not `forwardRef()`.
 */
export { AttendanceService } from './attendance.service';
```

- [ ] **Step 2: Export service khỏi `AttendanceModule`**

Trong `apps/api/src/modules/attendance/attendance.module.ts`, thêm dòng `exports` vào decorator:

```ts
@Module({
  imports: [BattleSessionsModule, CharactersModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  // The Discord bot writes attendance through this same service, so the rule about who may mark
  // whom lives in exactly one place.
  exports: [AttendanceService],
})
```

- [ ] **Step 3: Nối dây `DiscordBotModule`**

Thay toàn bộ `apps/api/src/modules/discord-bot/discord-bot.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { AttendanceModule } from '../attendance/attendance.module';
import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { DiscordBotController } from './discord-bot.controller';
import { DiscordSignatureGuard } from './discord-bot.guard';

/**
 * Wires the Discord interaction endpoint.
 *
 * It imports three domain modules because the attendance commands read the schedule and write
 * attendance through the very same services the web API uses — the bot is another way in, not a
 * second set of rules.
 */
@Module({
  imports: [AttendanceModule, BattleSessionsModule, CharactersModule],
  controllers: [DiscordBotController],
  providers: [DiscordSignatureGuard],
})
export class DiscordBotModule {}
```

- [ ] **Step 4: Chứng minh app vẫn boot và ranh giới vẫn sạch**

Run: `pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test`
Expected: tất cả PASS. Lint là phép thử thật ở đây: nếu import sai cửa, luật boundary sẽ báo.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/attendance apps/api/src/modules/discord-bot/discord-bot.module.ts
git commit -m "chore(api): open the attendance module to the discord bot"
```

---

## Task 3: Hằng số Discord và schema interaction mở rộng

**Files:**
- Modify: `apps/api/src/modules/discord-bot/discord.constants.ts`
- Modify: `apps/api/src/modules/discord-bot/interaction.schema.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts`

**Interfaces:**
- Produces:
  - `INTERACTION_TYPE.messageComponent = 3`, `INTERACTION_RESPONSE_TYPE.updateMessage = 7`
  - `MESSAGE_FLAG.ephemeral`, `COMPONENT_TYPE`, `BUTTON_STYLE`, `COMMAND_OPTION_TYPE`, `MAX_ACTION_ROWS`, `MAX_CUSTOM_ID_LENGTH`
  - `MessageComponentInteraction`, `ApplicationCommandInteraction` (thêm `member`/`user`/`data.options`)
  - `callerDiscordId(interaction): string`
  - `commandOptionValue(interaction, name): string | null`

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts`:

```ts
describe('MESSAGE_COMPONENT', () => {
  it('nhận một lượt bấm nút', () => {
    const parsed = interactionSchema.parse({
      type: 3,
      data: { custom_id: 'dd:gw-2026-08-31:meo-beo-k7ma3x:1' },
      member: { user: { id: '111' } },
    });

    expect(parsed.type).toBe(3);
  });
});

describe('callerDiscordId', () => {
  it('đọc id từ member khi lệnh chạy trong server', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      data: { name: 'diem-danh' },
      member: { user: { id: '111' } },
    });

    expect(callerDiscordId(parsed as ApplicationCommandInteraction)).toBe('111');
  });

  it('đọc id từ user khi lệnh chạy trong DM', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      data: { name: 'diem-danh' },
      user: { id: '222' },
    });

    expect(callerDiscordId(parsed as ApplicationCommandInteraction)).toBe('222');
  });

  it('ném lỗi khi interaction không mang người gọi nào', () => {
    // Discord luôn gửi một trong hai. Không có nghĩa là ta hiểu sai payload, không phải lỗi người dùng.
    const parsed = interactionSchema.parse({
      type: 2,
      data: { name: 'diem-danh' },
    });

    expect(() =>
      callerDiscordId(parsed as ApplicationCommandInteraction),
    ).toThrow();
  });
});

describe('commandOptionValue', () => {
  it('đọc giá trị của option theo tên', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      data: {
        name: 'diem-danh-ho',
        options: [{ name: 'nguoi', type: 6, value: '999' }],
      },
      member: { user: { id: '111' } },
    });

    expect(
      commandOptionValue(parsed as ApplicationCommandInteraction, 'nguoi'),
    ).toBe('999');
  });

  it('trả null khi option không có mặt', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      data: { name: 'diem-danh' },
      member: { user: { id: '111' } },
    });

    expect(
      commandOptionValue(parsed as ApplicationCommandInteraction, 'nguoi'),
    ).toBeNull();
  });
});
```

Sửa dòng import ở đầu file đó thành:

```ts
import {
  callerDiscordId,
  commandOptionValue,
  interactionSchema,
  type ApplicationCommandInteraction,
} from '../interaction.schema';
```

(giữ nguyên mọi import khác đang có trong file)

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/interaction.schema.spec.ts`
Expected: FAIL — `callerDiscordId is not a function` / interaction type 3 bị schema từ chối.

- [ ] **Step 3: Thêm hằng số vào `discord.constants.ts`**

Sửa hai object đã có và thêm phần dưới:

```ts
export const INTERACTION_TYPE = {
  /** Discord's own health check, sent when the endpoint URL is saved and periodically after */
  ping: 1,
  /** Someone ran a slash command */
  applicationCommand: 2,
  /** Someone pressed a button or used a select menu on one of the bot's messages */
  messageComponent: 3,
} as const;

export const INTERACTION_RESPONSE_TYPE = {
  /** The only valid answer to a PING */
  pong: 1,
  /** A message visible in the channel the command was used in */
  channelMessageWithSource: 4,
  /**
   * Rewrite the message the component sits on, instead of sending a new one.
   * Pressing three buttons then leaves one message showing the latest state, not three.
   */
  updateMessage: 7,
} as const;

/** Message flags. Bit field, so values are OR-ed if more are ever needed. */
export const MESSAGE_FLAG = {
  /** Only the person who triggered the interaction can see the message */
  ephemeral: 64,
} as const;

/** Component types. A button may only live inside an action row. */
export const COMPONENT_TYPE = {
  actionRow: 1,
  button: 2,
} as const;

/** Button styles. Only the two the attendance board uses are listed. */
export const BUTTON_STYLE = {
  /** Green */
  success: 3,
  /** Red */
  danger: 4,
} as const;

/** Slash command option types. Only the one the bot declares is listed. */
export const COMMAND_OPTION_TYPE = {
  /** A guild member picker — the value arrives as a Discord ID string */
  user: 6,
} as const;

/**
 * Discord accepts at most 5 action rows per message. The attendance board spends one row per
 * battle day, so this is the number of days it can offer buttons for.
 */
export const MAX_ACTION_ROWS = 5;

/** Discord rejects the whole message when a component's custom_id exceeds this. */
export const MAX_CUSTOM_ID_LENGTH = 100;
```

Giữ nguyên `DISCORD_SIGNATURE_HEADER` và `DISCORD_TIMESTAMP_HEADER` ở cuối file.

- [ ] **Step 4: Mở rộng `interaction.schema.ts`**

Thay toàn bộ nội dung từ sau khối comment đầu file (giữ nguyên khối comment giải thích vì sao shape này không nằm ở `packages/shared`):

```ts
import { z } from 'zod';

import { INTERACTION_TYPE } from './discord.constants';

/**
 * These shapes stay in this module instead of `packages/shared`.
 *
 * The shared package owns the api ↔ web contract; this payload is defined by Discord and the web
 * app never touches it. Putting it there would claim ownership of a shape we only read.
 */
const discordUserSchema = z.object({ id: z.string().min(1) });

/**
 * Who triggered the interaction. Discord puts them under `member` in a server and under `user` in a
 * DM, and never sends both — so both are optional here and `callerDiscordId` reads out the one
 * that came.
 */
const invokerFields = {
  member: z.object({ user: discordUserSchema }).optional(),
  user: discordUserSchema.optional(),
};

/**
 * One filled-in option of a slash command. `value` is typed as a string because the only option the
 * bot declares is a USER, whose value is a Discord ID.
 */
const commandOptionSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

const pingInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.ping),
});

const applicationCommandInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.applicationCommand),
  data: z.object({
    name: z.string().min(1),
    options: z.array(commandOptionSchema).optional(),
  }),
  ...invokerFields,
});

const messageComponentInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.messageComponent),
  // snake_case because this is Discord's payload, read verbatim.
  data: z.object({ custom_id: z.string().min(1) }),
  ...invokerFields,
});

/**
 * Every interaction the bot accepts. An unlisted `type` fails here, at the edge.
 *
 * That failure is a raw `ZodError`, not an `HttpException`, so `AllExceptionsFilter` answers 500 and
 * logs it as if it were a bug. An autocomplete or modal-submit interaction would land there — the
 * bot declares neither — and whoever reads that log later needs to know the 500 is this rejection
 * working, not a crash.
 */
export const interactionSchema = z.discriminatedUnion('type', [
  pingInteractionSchema,
  applicationCommandInteractionSchema,
  messageComponentInteractionSchema,
]);

/** A validated interaction, narrowed by `type`. */
export type Interaction = z.infer<typeof interactionSchema>;

/** A validated slash command invocation. */
export type ApplicationCommandInteraction = z.infer<
  typeof applicationCommandInteractionSchema
>;

/** A validated button press. */
export type MessageComponentInteraction = z.infer<
  typeof messageComponentInteractionSchema
>;

/**
 * Discord ID of whoever triggered the interaction.
 *
 * This is the bot's only trustworthy identity: it arrived inside a payload the Ed25519 signature
 * covers. Anything carried in a `custom_id` is client data and is never used in its place.
 *
 * @param interaction - A command invocation or a button press
 * @returns The caller's Discord ID
 * @throws Error when neither `member.user` nor `user` is present — Discord always sends one, so
 *   this is a payload we misread, not something a user can cause
 */
export function callerDiscordId(
  interaction: ApplicationCommandInteraction | MessageComponentInteraction,
): string {
  const id = interaction.member?.user.id ?? interaction.user?.id;

  if (!id) {
    throw new Error('Interaction không mang định danh người gọi.');
  }

  return id;
}

/**
 * Value of one slash command option.
 * @param interaction - The command invocation
 * @param name - Option name as declared in the command definition
 * @returns The value, or null when the option was not filled in
 */
export function commandOptionValue(
  interaction: ApplicationCommandInteraction,
  name: string,
): string | null {
  const option = interaction.data.options?.find(
    (candidate) => candidate.name === name,
  );

  return option?.value ?? null;
}
```

- [ ] **Step 5: Vá `routeInteraction` cho khỏi vỡ**

Mở rộng union làm `assertNever` trong `interaction-router.ts` thành lỗi biên dịch — đó chính là nó
làm đúng việc. Thêm một nhánh tạm ngay trên `default:`; Task 6 thay nó bằng handler thật:

```ts
    case INTERACTION_TYPE.messageComponent:
      // The real handler arrives with the attendance board; until then this is a registration
      // mismatch, exactly like an unknown command name.
      throw new Error(
        `Component Discord chưa được xử lý: ${interaction.data.custom_id}`,
      );
```

- [ ] **Step 6: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot && pnpm --filter api lint && pnpm --filter api typecheck`
Expected: PASS. Test cũ của `interaction-router` và `commands` vẫn xanh vì chưa đụng tới chữ ký của chúng.

**Đừng nối lệnh kiểm tra qua `| tail`** — exit code khi đó là của `tail`, nên một bước đỏ vẫn trông như xanh.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/discord-bot/discord.constants.ts apps/api/src/modules/discord-bot/interaction.schema.ts apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts
git commit -m "feat(api): accept button presses and command options from discord"
```

---

## Task 4: `custom_id` của nút điểm danh

Discord không giữ hộ trạng thái gì giữa hai lượt bấm: mọi ngữ cảnh phải nằm trong `custom_id`, mà `custom_id` lại giới hạn 100 ký tự. Một tên nhân vật rất dài có thể chạm trần, và khi chạm thì Discord từ chối **cả tin nhắn** chứ không phải một nút — nên phải phát hiện lúc dựng, không phải lúc gửi.

**Files:**
- Create: `apps/api/src/modules/discord-bot/custom-id.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/custom-id.spec.ts`

**Interfaces:**
- Consumes: `MAX_CUSTOM_ID_LENGTH` từ `./discord.constants`.
- Produces:
  - `interface AttendanceButtonId { sessionId: string; characterId: string; isPresent: boolean }`
  - `encodeAttendanceButtonId(value: AttendanceButtonId): string`
  - `decodeAttendanceButtonId(customId: string): AttendanceButtonId | null`

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/custom-id.spec.ts`:

```ts
import {
  decodeAttendanceButtonId,
  encodeAttendanceButtonId,
} from '../custom-id';

describe('custom_id của nút điểm danh', () => {
  it('mã hoá rồi giải mã ra đúng ba mảnh', () => {
    const value = {
      sessionId: 'gw-2026-08-31',
      characterId: 'meo-beo-k7ma3x',
      isPresent: true,
    };

    expect(decodeAttendanceButtonId(encodeAttendanceButtonId(value))).toEqual(
      value,
    );
  });

  it('phân biệt Có với Không', () => {
    const no = encodeAttendanceButtonId({
      sessionId: 'gw-2026-08-31',
      characterId: 'meo-beo-k7ma3x',
      isPresent: false,
    });

    expect(decodeAttendanceButtonId(no)?.isPresent).toBe(false);
  });

  it('giải mã ra null khi custom_id không phải của nút điểm danh', () => {
    // Tin nhắn khác của bot sau này cũng gửi custom_id qua cùng một endpoint.
    expect(decodeAttendanceButtonId('something-else')).toBeNull();
    expect(decodeAttendanceButtonId('dd:chi-co-hai-manh')).toBeNull();
    expect(decodeAttendanceButtonId('dd:a:b:9')).toBeNull();
  });

  it('ném lỗi thay vì dựng một custom_id quá dài', () => {
    // Discord từ chối cả tin nhắn chứ không riêng cái nút, nên phải nổ ngay lúc dựng.
    expect(() =>
      encodeAttendanceButtonId({
        sessionId: 'x'.repeat(60),
        characterId: 'y'.repeat(60),
        isPresent: true,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/custom-id.spec.ts`
Expected: FAIL — `Cannot find module '../custom-id'`.

- [ ] **Step 3: Viết `custom-id.ts`**

```ts
import { MAX_CUSTOM_ID_LENGTH } from './discord.constants';

/** Marks a custom_id as belonging to the attendance board, so other components can share the route. */
const PREFIX = 'dd';

/** Safe because ids are cuids, `gw-<date>` markers, or name slugs — none of them contain a colon. */
const SEPARATOR = ':';

/** How many parts a well-formed attendance custom_id has, prefix included. */
const PART_COUNT = 4;

/** What one attendance button carries, since Discord keeps no state between presses. */
export interface AttendanceButtonId {
  sessionId: string;
  characterId: string;
  isPresent: boolean;
}

/**
 * Build the custom_id for one attendance button.
 *
 * The value is client data on the way back — `decodeAttendanceButtonId` returns it, and the write
 * path still re-checks who may mark whom. It is a convenience, never a proof.
 *
 * @param value - Session, character and the answer the button records
 * @returns The custom_id string
 * @throws Error when the result exceeds Discord's 100-character limit — Discord rejects the entire
 *   message in that case, so it must surface here rather than as a failed reply
 */
export function encodeAttendanceButtonId(value: AttendanceButtonId): string {
  const customId = [
    PREFIX,
    value.sessionId,
    value.characterId,
    value.isPresent ? '1' : '0',
  ].join(SEPARATOR);

  if (customId.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(
      `custom_id dài ${customId.length} ký tự, vượt giới hạn ${MAX_CUSTOM_ID_LENGTH} của Discord: ${customId}`,
    );
  }

  return customId;
}

/**
 * Read an attendance button's custom_id back.
 * @param customId - Raw custom_id from the interaction
 * @returns The three parts, or null when this component is not an attendance button
 */
export function decodeAttendanceButtonId(
  customId: string,
): AttendanceButtonId | null {
  const parts = customId.split(SEPARATOR);

  if (parts.length !== PART_COUNT) return null;

  const [prefix, sessionId, characterId, answer] = parts;

  if (prefix !== PREFIX) return null;
  if (answer !== '1' && answer !== '0') return null;

  return { sessionId, characterId, isPresent: answer === '1' };
}
```

- [ ] **Step 4: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/custom-id.spec.ts`
Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/discord-bot/custom-id.ts apps/api/src/modules/discord-bot/__tests__/custom-id.spec.ts
git commit -m "feat(api): encode attendance context into the discord button id"
```

---

## Task 5: `ActorResolver` — Discord ID ra `JwtPayload`

`AttendanceService.mark(input, actor)` chờ một `JwtPayload`. Bot không có JWT, nó có một Discord ID mà chữ ký Ed25519 bảo chứng. Không token nào được ký, không token nào rời khỏi process — `JwtPayload` ở đây chỉ là hình dạng mà service đã nhận.

**Files:**
- Create: `apps/api/src/modules/discord-bot/actor-resolver.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/actor-resolver.spec.ts`

**Interfaces:**
- Consumes: `isRescueAdmin`, `resolveGuildRole` (Task 1); `CharactersService` từ `../characters/characters.public`; `TOKEN_TYPE`, `JwtPayload` từ `../../common`; `Env` từ `../../config`.
- Produces:
  - `interface ResolvedActor { actor: JwtPayload; characterId: string | null }`
  - `class ActorResolver { resolve(discordId: string): Promise<ResolvedActor | null> }`

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/actor-resolver.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { ActorResolver } from '../actor-resolver';

/**
 * Build a resolver over stubbed collaborators.
 * @param options.member - What CharactersService.findByDiscordId returns
 * @param options.adminIds - Raw DISCORD_ADMIN_IDS value
 * @returns The resolver under test
 */
function makeResolver(options: {
  member: { id: string; role: GuildRole } | null;
  adminIds: string;
}): ActorResolver {
  const characters = {
    findByDiscordId: jest.fn().mockResolvedValue(options.member),
  };
  const config = { get: jest.fn().mockReturnValue(options.adminIds) };

  return new ActorResolver(
    characters as never,
    config as never,
  );
}

describe('ActorResolver', () => {
  it('dựng actor từ nhân vật đã được gán', async () => {
    const resolver = makeResolver({
      member: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      adminIds: '',
    });

    await expect(resolver.resolve('111')).resolves.toEqual({
      actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
      characterId: 'meo-beo-k7ma3x',
    });
  });

  it('danh sách cứu hộ thắng role trong database', async () => {
    const resolver = makeResolver({
      member: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      adminIds: '111',
    });

    const resolved = await resolver.resolve('111');

    expect(resolved?.actor.role).toBe(GuildRole.ADMIN);
  });

  it('admin cứu hộ không có nhân vật vẫn dùng bot được', async () => {
    const resolver = makeResolver({ member: null, adminIds: '111' });

    await expect(resolver.resolve('111')).resolves.toEqual({
      actor: { sub: '111', role: GuildRole.ADMIN, type: TOKEN_TYPE.access },
      characterId: null,
    });
  });

  it('trả null khi không có nhân vật và cũng không cứu hộ', async () => {
    // Người này chưa được admin gán discordId — bot phải nói đúng câu đó, không phải im lặng.
    const resolver = makeResolver({ member: null, adminIds: '999' });

    await expect(resolver.resolve('111')).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/actor-resolver.spec.ts`
Expected: FAIL — `Cannot find module '../actor-resolver'`.

- [ ] **Step 3: Viết `actor-resolver.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TOKEN_TYPE, type JwtPayload } from '../../common';
import type { Env } from '../../config';
import { isRescueAdmin, resolveGuildRole } from '../auth/auth.public';
import { CharactersService } from '../characters/characters.public';

/** An identity the bot may act as, plus the character it belongs to. */
export interface ResolvedActor {
  /**
   * The shape `AttendanceService` already takes. Nothing is signed and nothing leaves the process:
   * it is a value object here, not a token.
   */
  actor: JwtPayload;
  /** The caller's own character, null for a rescue admin who was never assigned one. */
  characterId: string | null;
}

/**
 * Turns the Discord ID inside a signed interaction into the identity the domain services expect.
 *
 * The role rules are the login's, imported from `auth`, so a member cannot end up with one set of
 * permissions on the website and another in Discord.
 */
@Injectable()
export class ActorResolver {
  constructor(
    private readonly characters: CharactersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Resolve who is acting.
   * @param discordId - Discord ID read out of the signed interaction
   * @returns The actor and their character, or null when this Discord ID has no access at all
   */
  async resolve(discordId: string): Promise<ResolvedActor | null> {
    const member = await this.characters.findByDiscordId(discordId);
    const isRescue = isRescueAdmin(
      discordId,
      this.config.get('DISCORD_ADMIN_IDS', { infer: true }),
    );

    if (!member && !isRescue) return null;

    return {
      actor: {
        sub: discordId,
        role: resolveGuildRole({ isRescue, memberRole: member?.role ?? null }),
        type: TOKEN_TYPE.access,
      },
      characterId: member?.id ?? null,
    };
  }
}
```

- [ ] **Step 4: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/actor-resolver.spec.ts`
Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/discord-bot/actor-resolver.ts apps/api/src/modules/discord-bot/__tests__/actor-resolver.spec.ts
git commit -m "feat(api): resolve a discord id into the actor the services expect"
```

---

## Task 6: Lệnh nhận dependency qua tham số; router thành provider

Đây là task duy nhất phải sửa nhiều file cùng lúc: đổi chữ ký `execute` thì `/ping`, registry, router và controller đều phải theo, nếu không thì không compile. Kết thúc task, hành vi của bot **không đổi gì** — `/ping` vẫn trả đúng câu cũ. Đó là điều test phải chứng minh.

**Files:**
- Modify: `apps/api/src/modules/discord-bot/commands/command.types.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/ping.command.ts`
- Modify: `apps/api/src/modules/discord-bot/interaction-router.ts`
- Modify: `apps/api/src/modules/discord-bot/discord-bot.controller.ts`
- Modify: `apps/api/src/modules/discord-bot/discord-bot.module.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/commands.spec.ts`
- Modify: `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`

**Interfaces:**
- Consumes: `ActorResolver` (Task 5); `AttendanceService` từ `../attendance/attendance.public` (Task 2); `BattleSessionsService`, `CharactersService`.
- Produces:
  - `interface MessagePayload { content: string; components?: ActionRow[]; flags?: number }`
  - `interface ActionRow { type: 1; components: ButtonComponent[] }`
  - `interface ButtonComponent { type: 2; style: number; label: string; custom_id: string; disabled?: boolean }`
  - `interface CommandDeps { attendance; battleSessions; characters; actors }`
  - `SlashCommand.execute(interaction, deps): Promise<CommandReply>`
  - `class InteractionRouter { route(interaction): Promise<InteractionReply> }`
  - `ephemeral(payload: MessagePayload): CommandReply`, `ephemeralText(content: string): CommandReply` — **trong `reply.ts`**, không phải trong router (xem bảng cấu trúc file: đặt trên router tạo cycle `commands/index → diem-danh.command → interaction-router → commands/index`)

- [ ] **Step 1: Sửa test trước cho khớp chữ ký mới**

Trong `apps/api/src/modules/discord-bot/__tests__/commands.spec.ts`, thay đúng khối `describe('/ping', ...)`:

```ts
describe('/ping', () => {
  it('trả một tin nhắn thấy được trong kênh', async () => {
    const reply = await pingCommand.execute(
      { type: 2, data: { name: 'ping' } },
      {} as never,
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.content).toContain('Pong');
  });
});
```

Giữ nguyên khối `describe('registry lệnh', ...)`.

Trong `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`, thay toàn bộ file:

```ts
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

/**
 * Build a router over stubbed collaborators. The /ping path touches none of them.
 * @returns The router under test
 */
function makeRouter(): InteractionRouter {
  return new InteractionRouter(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
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

  it('ném lỗi nêu tên lệnh khi lệnh chưa có trong registry', async () => {
    // Trả 200 rỗng thì Discord hiện "ứng dụng không phản hồi" và không ai biết vì sao. Ném lỗi để
    // nó vào log kèm request id.
    await expect(
      makeRouter().route({ type: 2, data: { name: 'khong-ton-tai' } }),
    ).rejects.toThrow('khong-ton-tai');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/interaction-router.spec.ts`
Expected: FAIL — `InteractionRouter is not a constructor`.

- [ ] **Step 3: Viết lại `commands/command.types.ts`**

```ts
import type { AttendanceService } from '../../attendance/attendance.public';
import type { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import type { CharactersService } from '../../characters/characters.public';
import type { ActorResolver } from '../actor-resolver';
import type { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import type { ApplicationCommandInteraction } from '../interaction.schema';

/** What gets sent to Discord so the command appears in the chat box. */
export interface SlashCommandDefinition {
  /** Name typed after the slash, lowercase, no spaces */
  name: string;
  /** One line Discord shows next to the name while typing */
  description: string;
  /** Arguments Discord collects before sending the command. Omitted when there are none. */
  options?: SlashCommandOption[];
}

/** One argument of a slash command, in the shape Discord's registration route expects. */
export interface SlashCommandOption {
  name: string;
  description: string;
  /** A value from `COMMAND_OPTION_TYPE` */
  type: number;
  required: boolean;
}

/** One button. `custom_id` is snake_case because Discord's payload is read and written verbatim. */
export interface ButtonComponent {
  type: (typeof COMPONENT_TYPE)['button'];
  /** A value from `BUTTON_STYLE` */
  style: number;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

/** A horizontal strip of components. Discord allows at most 5 of these per message. */
export interface ActionRow {
  type: (typeof COMPONENT_TYPE)['actionRow'];
  components: ButtonComponent[];
}

/** The body of a message the bot sends or rewrites. */
export interface MessagePayload {
  content: string;
  components?: ActionRow[];
  /** A bit field from `MESSAGE_FLAG` */
  flags?: number;
}

/** A reply that sends a new message. */
export interface CommandReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['channelMessageWithSource'];
  data: MessagePayload;
}

/** A reply that rewrites the message the button sits on. */
export interface UpdateMessageReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['updateMessage'];
  data: MessagePayload;
}

/**
 * What a command is allowed to reach.
 *
 * Passed as an argument rather than injected: `src/scripts/register-discord-commands.ts` imports
 * `commandDefinitions` without booting Nest, so a command must stay a plain object. It also keeps a
 * command testable with a hand-written stub instead of a Nest testing module.
 */
export interface CommandDeps {
  attendance: AttendanceService;
  battleSessions: BattleSessionsService;
  characters: CharactersService;
  actors: ActorResolver;
}

/**
 * One command, whole. Keeping the Discord-facing definition next to the handler is what makes
 * adding a command a one-file change.
 */
export interface SlashCommand {
  definition: SlashCommandDefinition;
  /**
   * Answer one invocation.
   * @param interaction - The validated command invocation
   * @param deps - The services this command may use
   * @returns The reply Discord shows
   */
  execute(
    interaction: ApplicationCommandInteraction,
    deps: CommandDeps,
  ): Promise<CommandReply>;
}
```

Khối import ở đầu file đó, đầy đủ:

```ts
import type { AttendanceService } from '../../attendance/attendance.public';
import type { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import type { CharactersService } from '../../characters/characters.public';
import type { ActorResolver } from '../actor-resolver';
import type {
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
} from '../discord.constants';
import type { ApplicationCommandInteraction } from '../interaction.schema';
```

- [ ] **Step 4: Sửa `commands/ping.command.ts`**

```ts
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Proves the whole path end to end: Discord → signature check → router → reply. It answers from
 * memory, so a failure can only be the plumbing, never the data — which is why it takes no
 * dependencies even though the signature offers them.
 */
export const pingCommand: SlashCommand = {
  definition: {
    name: 'ping',
    description: 'Kiểm tra bot còn sống',
  },

  execute: (): Promise<CommandReply> =>
    Promise.resolve({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: 'Pong! Bot đang chạy.' },
    }),
};
```

- [ ] **Step 5: Viết `reply.ts`**

```ts
import type { CommandReply, MessagePayload } from './commands/command.types';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from './discord.constants';

/**
 * How a reply is shaped, kept out of both the router and the commands.
 *
 * It lives in its own file because the commands need it and the router imports the commands: with
 * these helpers on the router, the registry and the router would import each other and neither
 * would finish loading.
 */

/**
 * Wrap a message body as a new, private reply.
 *
 * Every reply the bot sends is ephemeral: attendance is answered by one person, and a channel full
 * of bot messages helps nobody.
 *
 * @param payload - The message body
 * @returns The reply Discord shows only to the caller
 */
export function ephemeral(payload: MessagePayload): CommandReply {
  return {
    type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
    data: { ...payload, flags: MESSAGE_FLAG.ephemeral },
  };
}

/**
 * A private reply that is only a sentence.
 * @param content - The sentence, already in Vietnamese and safe to show verbatim
 * @returns The reply
 */
export function ephemeralText(content: string): CommandReply {
  return ephemeral({ content });
}
```

- [ ] **Step 6: Viết lại `interaction-router.ts`**

Router **không** import `commands/command.types`'s `MessagePayload` và **không** dùng `MESSAGE_FLAG` nữa; nó import `ephemeralText` từ `./reply` khi Task 10 cần.

```ts
import { Injectable } from '@nestjs/common';

import { assertNever } from '../../common';
import { AttendanceService } from '../attendance/attendance.public';
import { BattleSessionsService } from '../battle-sessions/battle-sessions.public';
import { CharactersService } from '../characters/characters.public';
import { ActorResolver } from './actor-resolver';
import { commands } from './commands';
import type {
  CommandDeps,
  CommandReply,
  MessagePayload,
  UpdateMessageReply,
} from './commands/command.types';
import {
  INTERACTION_RESPONSE_TYPE,
  INTERACTION_TYPE,
  MESSAGE_FLAG,
} from './discord.constants';
import type { Interaction } from './interaction.schema';

/** The only valid answer to Discord's health check. */
interface PongReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['pong'];
}

/** Everything the bot may answer an interaction with. */
export type InteractionReply = PongReply | CommandReply | UpdateMessageReply;

/** Built once: the registry never changes after the module is loaded. */
const commandsByName = new Map(
  commands.map((command) => [command.definition.name, command]),
);

/**
 * Turns a validated interaction into the reply Discord expects.
 *
 * A provider rather than a free function because commands now read the database; it owns both
 * levels of the switch — by `type`, then by command name — so the whole of the bot's Discord-facing
 * behaviour stays testable without an HTTP layer.
 */
@Injectable()
export class InteractionRouter {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly battleSessions: BattleSessionsService,
    private readonly characters: CharactersService,
    private readonly actors: ActorResolver,
  ) {}

  /**
   * Answer one interaction.
   * @param interaction - The interaction, already validated by `interactionSchema`
   * @returns The reply to send back in the HTTP response body
   * @throws Error when the command name is not in the registry — Discord was told about a command
   *   this build does not have, which is a deploy/registration mismatch, not a user error
   */
  async route(interaction: Interaction): Promise<InteractionReply> {
    switch (interaction.type) {
      case INTERACTION_TYPE.ping:
        return { type: INTERACTION_RESPONSE_TYPE.pong };

      case INTERACTION_TYPE.applicationCommand: {
        const command = commandsByName.get(interaction.data.name);

        if (!command) {
          throw new Error(
            `Lệnh Discord chưa có trong registry: ${interaction.data.name}`,
          );
        }

        return command.execute(interaction, this.deps);
      }

      case INTERACTION_TYPE.messageComponent:
        // Task 10 replaces this with the real button handler.
        throw new Error(
          `Component Discord chưa được xử lý: ${interaction.data.custom_id}`,
        );

      default:
        return assertNever(interaction, 'Interaction type ngoài dự kiến');
    }
  }

  /** The services a command may reach, bundled once. */
  private get deps(): CommandDeps {
    return {
      attendance: this.attendance,
      battleSessions: this.battleSessions,
      characters: this.characters,
      actors: this.actors,
    };
  }
}
```

- [ ] **Step 7: Sửa controller để inject router**

Trong `apps/api/src/modules/discord-bot/discord-bot.controller.ts`, thay import và thân class (giữ nguyên các decorator và khối comment của class):

```ts
import { InteractionRouter, type InteractionReply } from './interaction-router';
import { interactionSchema } from './interaction.schema';
```

```ts
export class DiscordBotController {
  constructor(private readonly router: InteractionRouter) {}

  /**
   * Answer one Discord interaction.
   *
   * The body is parsed here rather than through a DTO because the reply must not be wrapped in
   * `{ data }` and the shape belongs to Discord, not to this API's own contract.
   *
   * @param body - The raw JSON body, already proven to come from Discord by the guard
   * @returns The interaction reply, sent verbatim
   */
  @Post('interactions')
  @HttpCode(HttpStatus.OK)
  @RawResponse()
  handleInteraction(@Body() body: unknown): Promise<InteractionReply> {
    return this.router.route(interactionSchema.parse(body));
  }
}
```

- [ ] **Step 8: Đăng ký hai provider mới**

Trong `apps/api/src/modules/discord-bot/discord-bot.module.ts`, đổi dòng `providers`:

```ts
  providers: [DiscordSignatureGuard, InteractionRouter, ActorResolver],
```

kèm hai import tương ứng.

- [ ] **Step 9: Chạy test + lint + typecheck**

Run: `pnpm --filter api test -- src/modules/discord-bot`
Expected: PASS — `/ping` trả đúng câu cũ; hành vi bot không đổi.

Run: `pnpm --filter api lint && pnpm --filter api typecheck`
Expected: sạch.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "refactor(api): give discord commands their dependencies and make the router a provider"
```

---

## Task 7: Dựng bảng điểm danh

Nơi duy nhất bảng được dựng. Cả ba đường vào — `/diem-danh`, `/diem-danh-ho`, và một lượt bấm nút — đều kết thúc ở đây, nên tin nhắn không bao giờ lệch với database, kể cả khi ai đó vừa sửa trên website.

**Files:**
- Create: `apps/api/src/modules/discord-bot/attendance-board.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/attendance-board.spec.ts`

**Interfaces:**
- Consumes: `CommandDeps`, `MessagePayload`, `ActionRow` (Task 6); `encodeAttendanceButtonId` (Task 4); `MAX_ACTION_ROWS`, `COMPONENT_TYPE`, `BUTTON_STYLE` (Task 3); `JwtPayload` từ `../../common`; `canManageGuild` từ `@guild/shared/lib`.
- Produces:
  - `interface BoardTarget { characterId: string; characterName: string }`
  - `buildAttendanceBoard(target: BoardTarget, actor: JwtPayload, deps: CommandDeps): Promise<MessagePayload>`

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/attendance-board.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../../common';
import { buildAttendanceBoard } from '../attendance-board';
import type { CommandDeps } from '../commands/command.types';

const TARGET = { characterId: 'meo-beo-k7ma3x', characterName: 'Mèo Béo' };

/**
 * A battle session as `listByWeek` returns it, with only the fields the board reads.
 * @param overrides - Fields to change
 * @returns The session stub
 */
function session(overrides: Partial<Record<string, unknown>>): unknown {
  return {
    id: 'session-1',
    label: 'Thứ 5 · 20:30',
    dateTime: '2026-09-03T13:30:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: null,
    ...overrides,
  };
}

/**
 * Build deps whose schedule and records are fixed.
 * @param options.sessions - What listByWeek returns
 * @param options.records - What getRecords returns
 * @returns Stubbed deps
 */
function makeDeps(options: {
  sessions: unknown[];
  records: unknown[];
}): CommandDeps {
  return {
    battleSessions: { listByWeek: jest.fn().mockResolvedValue(options.sessions) },
    attendance: { getRecords: jest.fn().mockResolvedValue(options.records) },
    characters: {},
    actors: {},
  } as never;
}

/**
 * An actor of the given role.
 * @param role - Role to act with
 * @returns The payload
 */
function actorOf(role: GuildRole): JwtPayload {
  return { sub: '111', role, type: TOKEN_TYPE.access };
}

describe('buildAttendanceBoard', () => {
  it('liệt kê mọi ngày đánh kèm trạng thái', async () => {
    const deps = makeDeps({
      sessions: [
        session({ id: 'a', label: 'Thứ 5 · 20:30' }),
        session({ id: 'b', label: 'Thứ 7 · Bang Chiến', isGuildWar: true }),
      ],
      records: [
        { characterId: TARGET.characterId, sessionId: 'b', isPresent: true },
      ],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('Mèo Béo');
    expect(board.content).toContain('Thứ 5 · 20:30');
    expect(board.content).toContain('chưa trả lời');
    expect(board.content).toContain('Thứ 7 · Bang Chiến');
    expect(board.content).toContain('Có');
  });

  it('bỏ qua bản ghi của nhân vật khác', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a' })],
      records: [
        { characterId: 'ai-do-khac', sessionId: 'a', isPresent: true },
      ],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('chưa trả lời');
  });

  it('member không có nút ở ngày đã quá hạn', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a', isDeadlinePassed: true })],
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components ?? []).toHaveLength(0);
    expect(board.content).toContain('đã quá hạn');
  });

  it('admin vẫn có nút ở ngày đã quá hạn', async () => {
    // Admin bypass deadline — luật của AttendanceService, bảng phải phản ánh đúng.
    const deps = makeDeps({
      sessions: [session({ id: 'a', isDeadlinePassed: true })],
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.ADMIN),
      deps,
    );

    expect(board.components).toHaveLength(1);
  });

  it('mỗi ngày một hàng, hai nút Có và Không', async () => {
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    const row = board.components?.[0];

    expect(row?.components).toHaveLength(2);
    expect(row?.components[0].label).toBe('Thứ 5 · 20:30 · Có');
    expect(row?.components[1].label).toBe('Thứ 5 · 20:30 · Không');
    expect(row?.components[0].custom_id).toBe(
      'dd:a:meo-beo-k7ma3x:1',
    );
  });

  it('khoá nút ứng với câu trả lời đang có hiệu lực', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a' })],
      records: [
        { characterId: TARGET.characterId, sessionId: 'a', isPresent: true },
      ],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components?.[0].components[0].disabled).toBe(true);
    expect(board.components?.[0].components[1].disabled).toBeUndefined();
  });

  it('quá 5 ngày thì cắt còn 5 và nói ra', async () => {
    // Discord chỉ cho 5 action row. Im lặng cắt mất một ngày thì không chấp nhận được.
    const deps = makeDeps({
      sessions: Array.from({ length: 6 }, (_, index) =>
        session({ id: `s${index}`, label: `Ngày ${index}` }),
      ),
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components).toHaveLength(5);
    expect(board.content).toContain('Ngày 5');
    expect(board.content).toContain('trên web');
  });

  it('cảnh báo rằng bấm Không sẽ xoá lý do đã ghi trên web', async () => {
    // Bot không gửi reason, mà AttendanceService quyết reason từ request — nên lượt ghi này ghi đè
    // null lên câu lý do cũ. Người dùng phải biết trước khi bấm.
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('xoá lý do');
  });

  it('tuần không có ngày đánh nào', async () => {
    const deps = makeDeps({ sessions: [], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('chưa có ngày đánh');
    expect(board.components ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/attendance-board.spec.ts`
Expected: FAIL — `Cannot find module '../attendance-board'`.

- [ ] **Step 3: Viết `attendance-board.ts`**

```ts
import { canManageGuild } from '@guild/shared/lib';
import type { AttendanceRecord, BattleSession } from '@guild/shared/schemas';

import type { JwtPayload } from '../../common';
import type {
  ActionRow,
  ButtonComponent,
  CommandDeps,
  MessagePayload,
} from './commands/command.types';
import { encodeAttendanceButtonId } from './custom-id';
import {
  BUTTON_STYLE,
  COMPONENT_TYPE,
  MAX_ACTION_ROWS,
} from './discord.constants';

/** Shown when the open week holds no battle day at all. */
const NO_SESSIONS = 'Tuần này chưa có ngày đánh nào.';

/**
 * `AttendanceService` derives `reason` from the request, and the bot never sends one — so pressing
 * "Không" here clears a reason typed on the website. Said out loud rather than let someone lose it
 * silently.
 */
const REASON_NOTE = 'Bấm "Không" ở đây sẽ xoá lý do vắng đã ghi trên web.';

/** Who the board is about. The name is shown so an admin marking for others cannot mistake them. */
export interface BoardTarget {
  characterId: string;
  characterName: string;
}

/**
 * Whether this actor may still record an answer for this session.
 * The rule is `AttendanceService`'s, mirrored here only to decide which buttons are worth showing —
 * every press is re-checked by the service.
 * @param session - The session under consideration
 * @param isAdmin - Whether the actor manages the guild
 * @returns true when a button should be offered
 */
function canAct(session: BattleSession, isAdmin: boolean): boolean {
  return isAdmin || !session.isDeadlinePassed;
}

/**
 * The line describing one session's current answer.
 * @param session - The session
 * @param record - The target's record for it, or undefined when they never answered
 * @returns One line of the message body
 */
function describeSession(
  session: BattleSession,
  record: AttendanceRecord | undefined,
): string {
  const opponent = session.opponent ? ` · gặp ${session.opponent}` : '';
  const answer = record ? (record.isPresent ? 'Có' : 'Không') : 'chưa trả lời';
  const overdue = session.isDeadlinePassed ? ' · đã quá hạn' : '';

  return `${session.label}${opponent} — ${answer}${overdue}`;
}

/**
 * The pair of buttons for one session.
 * The button matching the answer already on record is disabled: pressing it changes nothing, and a
 * disabled button is how the board shows what is currently chosen.
 * @param session - The session the buttons record against
 * @param characterId - Who the answer is recorded for
 * @param record - The current record, or undefined
 * @returns One action row
 */
function buildRow(
  session: BattleSession,
  characterId: string,
  record: AttendanceRecord | undefined,
): ActionRow {
  /**
   * One button of the pair.
   * @param isPresent - The answer this button records
   * @returns The button component
   */
  const button = (isPresent: boolean): ButtonComponent => ({
    type: COMPONENT_TYPE.button,
    style: isPresent ? BUTTON_STYLE.success : BUTTON_STYLE.danger,
    label: `${session.label} · ${isPresent ? 'Có' : 'Không'}`,
    custom_id: encodeAttendanceButtonId({
      sessionId: session.id,
      characterId,
      isPresent,
    }),
    ...(record?.isPresent === isPresent ? { disabled: true } : {}),
  });

  return {
    type: COMPONENT_TYPE.actionRow,
    components: [button(true), button(false)],
  };
}

/**
 * Build the attendance board for one character.
 *
 * Read fresh on every call — a press records, then rebuilds from the database — so the message can
 * never drift from what the website shows.
 *
 * @param target - The character being marked, and the name to show
 * @param actor - Who is acting; decides which days still get buttons
 * @param deps - Services the board reads through
 * @returns The message body, ready to be wrapped as a reply or an update
 */
export async function buildAttendanceBoard(
  target: BoardTarget,
  actor: JwtPayload,
  deps: CommandDeps,
): Promise<MessagePayload> {
  const [sessions, allRecords] = await Promise.all([
    deps.battleSessions.listByWeek(),
    deps.attendance.getRecords(),
  ]);

  if (sessions.length === 0) {
    return { content: `Điểm danh · ${target.characterName}\n\n${NO_SESSIONS}` };
  }

  const records = new Map(
    allRecords
      .filter((record) => record.characterId === target.characterId)
      .map((record) => [record.sessionId, record]),
  );

  const isAdmin = canManageGuild(actor.role);
  const actionable = sessions.filter((session) => canAct(session, isAdmin));
  const shown = actionable.slice(0, MAX_ACTION_ROWS);
  const dropped = actionable.slice(MAX_ACTION_ROWS);

  const lines = sessions.map((session) =>
    describeSession(session, records.get(session.id)),
  );

  // Discord allows 5 action rows per message and a day costs one. Say which days lost their
  // buttons rather than let them disappear from an otherwise complete list.
  const note =
    dropped.length > 0
      ? `\n\nCòn ${dropped.length} ngày nữa (${dropped
          .map((session) => session.label)
          .join(', ')}) — điểm danh trên web.`
      : '';

  return {
    content: `Điểm danh · ${target.characterName}\n\n${lines.join('\n')}${note}\n\n${REASON_NOTE}`,
    components: shown.map((session) =>
      buildRow(session, target.characterId, records.get(session.id)),
    ),
  };
}
```

- [ ] **Step 4: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/attendance-board.spec.ts`
Expected: PASS, 9 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/discord-bot/attendance-board.ts apps/api/src/modules/discord-bot/__tests__/attendance-board.spec.ts
git commit -m "feat(api): build the discord attendance board from the open week"
```

---

## Task 8: Lệnh `/diem-danh`

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/diem-danh.command.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/diem-danh.command.spec.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/index.ts`

**Interfaces:**
- Consumes: `buildAttendanceBoard`, `BoardTarget` (Task 7); `ephemeral`, `ephemeralText` (Task 6); `callerDiscordId` (Task 3); `ActorResolver` (Task 5).
- Produces: `diemDanhCommand: SlashCommand`; hàm dùng chung `resolveOwnTarget(deps, actor, characterId)` **không** export — mỗi lệnh tự lo phần của mình.

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/diem-danh.command.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { diemDanhCommand } from '../commands/diem-danh.command';
import type { CommandDeps } from '../commands/command.types';
import { MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  data: { name: 'diem-danh' },
  member: { user: { id: '111' } },
};

/**
 * Build deps around one resolved actor and one character row.
 * @param options.resolved - What ActorResolver.resolve returns
 * @param options.characterRow - What CharactersService.findById returns
 * @returns Stubbed deps
 */
function makeDeps(options: {
  resolved: unknown;
  characterRow?: unknown;
}): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(options.resolved) },
    characters: {
      findById: jest.fn().mockResolvedValue(options.characterRow ?? null),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: { getRecords: jest.fn().mockResolvedValue([]) },
  } as never;
}

describe('/diem-danh', () => {
  it('trả bảng riêng tư cho nhân vật của người gọi', async () => {
    const deps = makeDeps({
      resolved: {
        actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
        characterId: 'meo-beo-k7ma3x',
      },
      characterRow: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo' },
    });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('Mèo Béo');
  });

  it('nói rõ khi người gọi chưa được gán nhân vật', async () => {
    const deps = makeDeps({ resolved: null });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('chỉ admin cứu hộ không có nhân vật thì hướng sang /diem-danh-ho', async () => {
    const deps = makeDeps({
      resolved: {
        actor: { sub: '111', role: GuildRole.ADMIN, type: TOKEN_TYPE.access },
        characterId: null,
      },
    });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('/diem-danh-ho');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/diem-danh.command.spec.ts`
Expected: FAIL — `Cannot find module '../commands/diem-danh.command'`.

- [ ] **Step 3: Viết `commands/diem-danh.command.ts`**

```ts
import { buildAttendanceBoard } from '../attendance-board';
import { ephemeral, ephemeralText } from '../reply';
import { callerDiscordId } from '../interaction.schema';
import type { CommandReply, SlashCommand } from './command.types';

/** Shown when nobody assigned this Discord ID to a character yet. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/** Shown to a rescue admin who has no character of their own to mark. */
const NO_OWN_CHARACTER =
  'Tài khoản admin này không gắn với nhân vật nào — dùng /diem-danh-ho.';

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

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!resolved.characterId) return ephemeralText(NO_OWN_CHARACTER);

    const row = await deps.characters.findById(resolved.characterId);

    if (!row) return ephemeralText(NOT_LINKED);

    const board = await buildAttendanceBoard(
      { characterId: row.id, characterName: row.name },
      resolved.actor,
      deps,
    );

    return ephemeral(board);
  },
};
```

- [ ] **Step 4: Đăng ký lệnh**

Trong `apps/api/src/modules/discord-bot/commands/index.ts`:

```ts
import type { SlashCommand, SlashCommandDefinition } from './command.types';
import { diemDanhCommand } from './diem-danh.command';
import { pingCommand } from './ping.command';

/**
 * Every command the bot answers.
 *
 * Adding a command is: one new file next to this one, one line here. Nothing else in the module
 * changes.
 */
export const commands: readonly SlashCommand[] = [pingCommand, diemDanhCommand];

/** Exactly what `discord:register` sends to Discord. */
export const commandDefinitions: readonly SlashCommandDefinition[] =
  commands.map((command) => command.definition);
```

- [ ] **Step 5: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot`
Expected: PASS — gồm cả test registry cũ ("không có hai lệnh trùng tên", "mọi lệnh đều có mô tả").

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the /diem-danh slash command"
```

---

## Task 9: Lệnh `/diem-danh-ho`

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/diem-danh-ho.command.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/diem-danh-ho.command.spec.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/index.ts`

**Interfaces:**
- Consumes: như Task 8, thêm `commandOptionValue` (Task 3), `COMMAND_OPTION_TYPE` (Task 3), `canManageGuild` từ `@guild/shared/lib`.
- Produces: `diemDanhHoCommand: SlashCommand` với một option `nguoi` kiểu USER, bắt buộc.

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/diem-danh-ho.command.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { diemDanhHoCommand } from '../commands/diem-danh-ho.command';

const INTERACTION = {
  type: 2 as const,
  data: {
    name: 'diem-danh-ho',
    options: [{ name: 'nguoi', value: '999' }],
  },
  member: { user: { id: '111' } },
};

/**
 * Build deps for a caller of the given role pointing at a target.
 * @param options.callerRole - Role the caller acts with
 * @param options.target - What findByDiscordId returns for the mentioned user
 * @param options.targetRow - What findById returns for that character
 * @returns Stubbed deps
 */
function makeDeps(options: {
  callerRole: GuildRole;
  target: unknown;
  targetRow?: unknown;
}): CommandDeps {
  return {
    actors: {
      resolve: jest.fn().mockResolvedValue({
        actor: {
          sub: '111',
          role: options.callerRole,
          type: TOKEN_TYPE.access,
        },
        characterId: 'admin-abc123',
      }),
    },
    characters: {
      findByDiscordId: jest.fn().mockResolvedValue(options.target),
      findById: jest.fn().mockResolvedValue(options.targetRow ?? null),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: { getRecords: jest.fn().mockResolvedValue([]) },
  } as never;
}

describe('/diem-danh-ho', () => {
  it('khai báo một option USER bắt buộc tên nguoi', () => {
    // Sai tên option thì Discord gửi lên một mảng bot không đọc được, và lệnh im lặng hỏng.
    expect(diemDanhHoCommand.definition.options).toEqual([
      expect.objectContaining({ name: 'nguoi', type: 6, required: true }),
    ]);
  });

  it('admin thấy bảng của người được mention', async () => {
    const deps = makeDeps({
      callerRole: GuildRole.ADMIN,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      targetRow: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo' },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('Mèo Béo');
  });

  it('member bị từ chối trước khi thấy bảng', async () => {
    // AttendanceService chỉ từ chối lúc GHI. Bảng thì hiện ra trước đó, nên chỗ này phải chặn sớm.
    const deps = makeDeps({
      callerRole: GuildRole.MEMBER,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('Chỉ admin');
    expect(reply.data.components).toBeUndefined();
  });

  it('nói rõ khi người được mention chưa được gán nhân vật', async () => {
    const deps = makeDeps({ callerRole: GuildRole.ADMIN, target: null });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('<@999>');
    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/diem-danh-ho.command.spec.ts`
Expected: FAIL — `Cannot find module '../commands/diem-danh-ho.command'`.

- [ ] **Step 3: Viết `commands/diem-danh-ho.command.ts`**

```ts
import { canManageGuild } from '@guild/shared/lib';

import { buildAttendanceBoard } from '../attendance-board';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { ephemeral, ephemeralText } from '../reply';
import { callerDiscordId, commandOptionValue } from '../interaction.schema';
import type { CommandReply, SlashCommand } from './command.types';

/** Name of the option, used both when registering and when reading the invocation. */
const TARGET_OPTION = 'nguoi';

/** Shown when nobody assigned the caller's Discord ID to a character yet. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/** Shown to a member who tried to mark on someone else's behalf. */
const ADMIN_ONLY = 'Chỉ admin mới điểm danh hộ được.';

/**
 * Attendance on behalf of somebody else — admins only.
 *
 * The role is checked here rather than left to `AttendanceService`, which only refuses at write
 * time: the board appears before anyone presses anything, and showing a board whose every button
 * is guaranteed to be rejected is worse than saying so. The write rule itself is untouched and runs
 * again on every press.
 */
export const diemDanhHoCommand: SlashCommand = {
  definition: {
    name: 'diem-danh-ho',
    description: 'Điểm danh hộ một thành viên khác (chỉ admin)',
    options: [
      {
        name: TARGET_OPTION,
        description: 'Người cần điểm danh hộ',
        type: COMMAND_OPTION_TYPE.user,
        required: true,
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const targetDiscordId = commandOptionValue(interaction, TARGET_OPTION);

    if (!targetDiscordId) {
      // Discord enforces `required: true`, so an empty value means the registered definition and
      // this build disagree — say which option, the fix is `pnpm --filter api discord:register`.
      throw new Error(`Thiếu option ${TARGET_OPTION} của /diem-danh-ho.`);
    }

    const target = await deps.characters.findByDiscordId(targetDiscordId);
    const row = target ? await deps.characters.findById(target.id) : null;

    if (!row) {
      return ephemeralText(`<@${targetDiscordId}> chưa được gán nhân vật nào.`);
    }

    const board = await buildAttendanceBoard(
      { characterId: row.id, characterName: row.name },
      resolved.actor,
      deps,
    );

    return ephemeral(board);
  },
};
```

- [ ] **Step 4: Đăng ký lệnh**

Trong `apps/api/src/modules/discord-bot/commands/index.ts`, thêm import và một phần tử:

```ts
import { diemDanhHoCommand } from './diem-danh-ho.command';
```

```ts
export const commands: readonly SlashCommand[] = [
  pingCommand,
  diemDanhCommand,
  diemDanhHoCommand,
];
```

- [ ] **Step 5: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the /diem-danh-ho slash command for admins"
```

---

## Task 10: Bấm nút thì ghi, rồi vẽ lại bảng

Đóng vòng lặp. Cũng là chỗ duy nhất `HttpException` từ `AttendanceService` được đổi thành một câu tiếng Việt trong Discord — mọi mã khác 200 đều làm Discord hiện "ứng dụng không phản hồi" và vứt mất câu giải thích đã viết sẵn trong exception.

**Files:**
- Modify: `apps/api/src/modules/discord-bot/attendance-board.ts`
- Modify: `apps/api/src/modules/discord-bot/interaction-router.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/attendance-button.spec.ts`

**Interfaces:**
- Consumes: `decodeAttendanceButtonId` (Task 4), `buildAttendanceBoard` (Task 7), `MessageComponentInteraction` + `callerDiscordId` (Task 3).
- Produces: `handleAttendanceButton(interaction: MessageComponentInteraction, deps: CommandDeps): Promise<MessagePayload>` trong `attendance-board.ts`.

- [ ] **Step 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/attendance-button.spec.ts`:

```ts
import { ConflictException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { handleAttendanceButton } from '../attendance-board';
import type { CommandDeps } from '../commands/command.types';
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

const PRESS = {
  type: 3 as const,
  data: { custom_id: 'dd:session-1:meo-beo-k7ma3x:1' },
  member: { user: { id: '111' } },
};

/**
 * Build deps whose `mark` is observable.
 * @param options.mark - The stub standing in for AttendanceService.mark
 * @returns Stubbed deps
 */
function makeDeps(options: { mark: jest.Mock }): CommandDeps {
  return {
    actors: {
      resolve: jest.fn().mockResolvedValue({
        actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
        characterId: 'meo-beo-k7ma3x',
      }),
    },
    characters: {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'meo-beo-k7ma3x', name: 'Mèo Béo' }),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: { getRecords: jest.fn().mockResolvedValue([]), mark: options.mark },
  } as never;
}

describe('bấm nút điểm danh', () => {
  it('ghi đúng nhân vật, ngày và câu trả lời trong custom_id', async () => {
    const mark = jest.fn().mockResolvedValue(undefined);

    await handleAttendanceButton(PRESS, makeDeps({ mark }));

    expect(mark).toHaveBeenCalledWith(
      {
        characterId: 'meo-beo-k7ma3x',
        sessionId: 'session-1',
        isPresent: true,
      },
      expect.objectContaining({ sub: '111' }),
    );
  });

  it('ghi xong thì vẽ lại bảng', async () => {
    const board = await handleAttendanceButton(
      PRESS,
      makeDeps({ mark: jest.fn().mockResolvedValue(undefined) }),
    );

    expect(board.content).toContain('Mèo Béo');
  });

  it('custom_id lạ thì nói ra thay vì im lặng', async () => {
    const press = { ...PRESS, data: { custom_id: 'khong-phai-cua-toi' } };

    const board = await handleAttendanceButton(
      press,
      makeDeps({ mark: jest.fn() }),
    );

    expect(board.content).toContain('không còn dùng được');
  });
});

describe('lỗi từ AttendanceService', () => {
  it('thành một câu tiếng Việt trong Discord, không phải mã lỗi', async () => {
    // Mọi mã khác 200 đều làm Discord hiện "ứng dụng không phản hồi".
    const deps = makeDeps({
      mark: jest.fn().mockRejectedValue(
        new ConflictException('Đã quá hạn điểm danh ngày này.'),
      ),
    });
    const router = new InteractionRouter(
      deps.attendance,
      deps.battleSessions,
      deps.characters,
      deps.actors,
    );

    const reply = await router.route(PRESS);

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: {
        content: 'Đã quá hạn điểm danh ngày này.',
        flags: 64,
      },
    });
  });
});
```

- [ ] **Step 2: Chạy test cho chắc nó fail**

Run: `pnpm --filter api test -- src/modules/discord-bot/__tests__/attendance-button.spec.ts`
Expected: FAIL — `handleAttendanceButton is not a function`.

- [ ] **Step 3: Thêm `handleAttendanceButton` vào `attendance-board.ts`**

Thêm import ở đầu file:

```ts
import { decodeAttendanceButtonId } from './custom-id';
import {
  callerDiscordId,
  type MessageComponentInteraction,
} from './interaction.schema';
```

(gộp với dòng import `encodeAttendanceButtonId` đã có thành một dòng từ `./custom-id`)

Thêm hằng số cạnh `NO_SESSIONS`:

```ts
/** Shown when a button's custom_id is not one this build knows how to read. */
const STALE_BUTTON =
  'Nút này không còn dùng được. Gõ lại /diem-danh để lấy bảng mới.';

/** Shown when the caller lost access between opening the board and pressing a button. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';
```

Thêm hàm ở cuối file:

```ts
/**
 * Record one press, then rebuild the board from what the database now holds.
 *
 * The `characterId` in the custom_id is client data. It is passed to `AttendanceService.mark`
 * exactly as a request body would be, and that service — not this function — decides whether this
 * actor may mark that character. Nothing here re-implements the rule.
 *
 * @param interaction - The validated button press
 * @param deps - Services the handler reads and writes through
 * @returns The rebuilt board, or a sentence explaining why nothing was recorded
 * @throws HttpException raised by `AttendanceService.mark`, turned into a message by the router
 */
export async function handleAttendanceButton(
  interaction: MessageComponentInteraction,
  deps: CommandDeps,
): Promise<MessagePayload> {
  const pressed = decodeAttendanceButtonId(interaction.data.custom_id);

  if (!pressed) return { content: STALE_BUTTON };

  const resolved = await deps.actors.resolve(callerDiscordId(interaction));

  if (!resolved) return { content: NOT_LINKED };

  await deps.attendance.mark(
    {
      characterId: pressed.characterId,
      sessionId: pressed.sessionId,
      isPresent: pressed.isPresent,
    },
    resolved.actor,
  );

  const row = await deps.characters.findById(pressed.characterId);

  if (!row) return { content: STALE_BUTTON };

  return buildAttendanceBoard(
    { characterId: row.id, characterName: row.name },
    resolved.actor,
    deps,
  );
}
```

- [ ] **Step 4: Nối nút vào router và bọc lỗi**

Trong `apps/api/src/modules/discord-bot/interaction-router.ts`:

1. Thêm import:

```ts
import { HttpException, Injectable, Logger } from '@nestjs/common';

import { handleAttendanceButton } from './attendance-board';
```

2. Thêm hằng số cạnh các khai báo đầu file:

```ts
/** Shown when something failed that the user can do nothing about. */
const UNEXPECTED = 'Có lỗi xảy ra. Thử lại sau hoặc điểm danh trên web.';
```

3. Trong class, thêm logger và đổi `route` thành lớp bọc lỗi quanh một `dispatch` nội bộ:

```ts
  private readonly logger = new Logger(InteractionRouter.name);

  /**
   * Answer one interaction, turning any failure into something Discord can show.
   *
   * Discord treats every non-200 as "the application did not respond", which would throw away the
   * Vietnamese sentence a domain exception already carries. So the reply, not the status code, is
   * where a refusal is expressed.
   *
   * @param interaction - The interaction, already validated by `interactionSchema`
   * @returns The reply to send back in the HTTP response body
   */
  async route(interaction: Interaction): Promise<InteractionReply> {
    try {
      return await this.dispatch(interaction);
    } catch (error) {
      // A domain refusal already reads as a sentence meant for the user (architecture.md §3.4).
      if (error instanceof HttpException) {
        return ephemeralText(error.message);
      }

      // Anything else is ours: keep the detail in the log, keep it out of a chat channel.
      this.logger.error('Interaction Discord thất bại', error as Error);

      return ephemeralText(UNEXPECTED);
    }
  }
```

4. Đổi phần switch cũ thành một method private với đúng thân cũ, chỉ đổi dòng khai báo và doc comment (`@throws Error` về registry đi theo nó):

```ts
  /**
   * Route one interaction to whatever answers it.
   * @param interaction - The validated interaction
   * @returns The reply
   * @throws Error when the command name is not in the registry — Discord was told about a command
   *   this build does not have, which is a deploy/registration mismatch, not a user error
   */
  private async dispatch(interaction: Interaction): Promise<InteractionReply> {
```

và thay nhánh `messageComponent` trong đó:

```ts
      case INTERACTION_TYPE.messageComponent:
        return {
          type: INTERACTION_RESPONSE_TYPE.updateMessage,
          data: await handleAttendanceButton(interaction, this.deps),
        };
```

Lưu ý: doc comment `@throws Error` về registry vẫn thuộc `dispatch`, còn `route` mang doc comment mới ở trên.

- [ ] **Step 5: Chạy test, phải xanh**

Run: `pnpm --filter api test -- src/modules/discord-bot`
Expected: PASS.

Test "ném lỗi nêu tên lệnh khi lệnh chưa có trong registry" ở `interaction-router.spec.ts` sẽ **đỏ** sau bước này, vì lỗi giờ bị bọc thành tin nhắn. Đó là hành vi đổi có chủ đích, nên sửa test cho khớp:

```ts
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
        flags: 64,
      },
    });
  });
```

- [ ] **Step 6: Chạy toàn bộ kiểm tra**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api typecheck`
Expected: tất cả PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): record attendance when a discord button is pressed"
```

---

## Task 11: Tài liệu

Không có endpoint mới, không có biến môi trường, không có migration — nên phần tài liệu nhỏ, nhưng bảng module trong architecture.md hiện đang mô tả thiếu, và **`discord:register` phải chạy lại** vì danh sách lệnh đổi. Bỏ bước đó thì hai lệnh mới không bao giờ xuất hiện trong Discord, mà mọi test vẫn xanh.

**Files:**
- Modify: `docs/architecture.md`
- Modify: `apps/api/README.md`
- Modify: `apps/api/CLAUDE.md`

- [ ] **Step 1: Sửa bảng module trong `docs/architecture.md` §3.3**

Thay dòng `discord-bot`:

```
| `discord-bot` | The Discord interactions endpoint, the slash command registry, and attendance recorded from Discord (`/diem-danh`, `/diem-danh-ho`) | Discord's Ed25519 signature — no JWT, no session; the identity comes from the signed payload and the write rules stay `AttendanceService`'s |
```

Bảng endpoint **không đổi**: cả hai lệnh dùng `POST /discord/interactions` đã có.

- [ ] **Step 2: Sửa hai câu giờ đã sai sự thật**

Lời nhắc chạy `discord:register` **đã có sẵn** ở `apps/api/README.md`, `apps/api/CLAUDE.md` và
`README.md` gốc — đừng thêm lần nữa. Nhưng hai câu này giờ nói sai:

1. `apps/api/CLAUDE.md`: "a command that touches the database will need a deferred reply (`type: 5`)
   — the router has no branch for that yet." Spec §9 quyết định **không** dùng deferred. Thay bằng
   một câu nói rõ hai lệnh mới trả lời thẳng trong ngân sách 3 giây, kèm link spec, và thêm một
   gạch đầu dòng về `deps` + vì sao `ephemeral` nằm ở `reply.ts`.
2. `README.md` gốc: "Today it answers one command, `/ping`." Thay bằng danh sách ba lệnh, nói rõ
   lý do vắng mặt chỉ nhập được trên web.

- [ ] **Step 3: Kiểm tra lần cuối**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api typecheck`
Expected: tất cả PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md apps/api/README.md apps/api/CLAUDE.md
git commit -m "docs: describe the discord attendance commands"
```

---

## Sau khi xong plan

1. Chạy `pnpm --filter api discord:register` (đọc `.env` — application local). Kiểm tra output liệt kê đủ ba lệnh: `ping, diem-danh, diem-danh-ho`.
2. Thử trong Discord: `/diem-danh` phải ra bảng ephemeral; bấm một nút phải thấy chính tin nhắn đó đổi trạng thái; mở website kiểm tra bản ghi đúng.
3. `/diem-danh-ho` bằng một tài khoản member phải bị từ chối; bằng admin phải ra bảng của người được mention.
4. Mở PR theo `.github/pull_request_template.md`. Đăng ký lệnh cho application production (`DISCORD_ENV_FILE=.env.production pnpm --filter api discord:register`) **sau khi** PR đã merge và deploy xong — đăng ký trước thì người dùng gõ được một lệnh mà bản đang chạy chưa biết.
