# `/chao-mung` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một lệnh Discord `/chao-mung` chỉ admin dùng được, nhận người mới + channel lưu
phái, đăng công khai đoạn hướng dẫn bốn dòng với cả bốn channel là mention bấm được.

**Architecture:** Ba channel cố định là hằng số vận hành → biến môi trường bắt buộc, đọc
một lần trong `InteractionRouter.deps` và đi vào `CommandLinks.channelIds`. Channel lưu
phái đổi theo từng người mới → option CHANNEL của lệnh. Lệnh là một file trong
`commands/` cộng một dòng trong `commands/index.ts`, không chạm database, không chạm
web app.

**Tech Stack:** NestJS 11, Zod (`env.validation.ts`), Jest. Không thư viện mới, không
migration, không thay đổi `packages/shared`.

**Spec:** [`docs/superpowers/specs/2026-09-03-chao-mung-command-design.md`](../specs/2026-09-03-chao-mung-command-design.md)

## Global Constraints

- Tên lệnh, đúng từng ký tự: `chao-mung`. Tên hai option: `nguoi`, `luu-phai`.
- Tên ba biến môi trường mới, đúng từng ký tự: `DISCORD_BANG_CHIEN_CHANNEL_ID`,
  `DISCORD_NGHICH_THUY_HAN_CHANNEL_ID`, `DISCORD_KHAM_ACC_CHANNEL_ID`. Cả ba **bắt buộc**
  (`z.string().min(1)`).
- Nội dung tin nhắn, đúng từng ký tự (kể cả dấu cách trước dấu phẩy ở dòng 3):

  ```
  Chào mừng <@{nguoi}> gia nhập bang!
  - Chat bang ở đây nha
  - Các thông báo thì ở <#{bangChien}> , <#{nghichThuyHan}>
  - Chat lưu phái <#{luuPhai}>
  - Bây giờ ông vào <#{khamAcc}> để up gear nhé
  ```

- Comment và tên file bằng **tiếng Anh**; câu hiển thị cho người dùng Discord bằng
  **tiếng Việt**; tên `it(...)` trong test bằng tiếng Việt, theo đúng các spec đang có.
- Mọi hàm exported phải có doc comment tiếng Anh nêu purpose, từng param và giá trị trả về.
- Không dùng `new Date()`, không chạm Prisma, không thêm `forwardRef`.
- Lệnh chạy test: `pnpm --filter api test`. Typecheck: `pnpm --filter api typecheck`.
- Commit message theo Conventional Commits, tiếng Anh, không dòng attribution ở cuối.
  Nhánh làm việc: `feat/chao-mung-command` (đã tồn tại, spec đã commit trên đó).

---

### Task 1: Ba biến môi trường của channel cố định

**Files:**
- Modify: `apps/api/src/config/env.validation.ts` (thêm ngay sau `DISCORD_GUILD_ROLE_ID`)
- Modify: `apps/api/.env.example`
- Modify: `docs/development.md` §3 (bảng biến môi trường)
- Modify: `docs/production.md` §3 (bảng biến môi trường)
- Test: `apps/api/src/config/__tests__/env.validation.spec.ts`

**Interfaces:**
- Consumes: không có — task đầu tiên.
- Produces: `Env['DISCORD_BANG_CHIEN_CHANNEL_ID']`,
  `Env['DISCORD_NGHICH_THUY_HAN_CHANNEL_ID']`, `Env['DISCORD_KHAM_ACC_CHANNEL_ID']`, cả ba
  kiểu `string`, đọc bằng `config.get('<TÊN>', { infer: true })` ở Task 2.

- [ ] **Step 1: Write the failing test**

Trong `apps/api/src/config/__tests__/env.validation.spec.ts`, thêm ba dòng vào object
`base` (ngay sau `DISCORD_GUILD_ROLE_ID`) — không có chúng thì mọi test cũ sẽ đỏ khi
schema siết lại:

```ts
  DISCORD_BANG_CHIEN_CHANNEL_ID: '111222333444555666',
  DISCORD_NGHICH_THUY_HAN_CHANNEL_ID: '222333444555666777',
  DISCORD_KHAM_ACC_CHANNEL_ID: '333444555666777888',
```

Rồi thêm một `it` mới vào cuối `describe('validateEnv', ...)`:

```ts
  it('chết khi thiếu một trong ba channel id của /chao-mung', () => {
    // Thiếu biến thì lời chào sẽ trỏ vào <#undefined>. Chết lúc boot rẻ hơn nhiều.
    for (const key of [
      'DISCORD_BANG_CHIEN_CHANNEL_ID',
      'DISCORD_NGHICH_THUY_HAN_CHANNEL_ID',
      'DISCORD_KHAM_ACC_CHANNEL_ID',
    ] as const) {
      const incomplete: Partial<typeof base> = { ...base };
      delete incomplete[key];

      expect(() => validateEnv(incomplete)).toThrow(
        /Biến môi trường không hợp lệ/,
      );
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- env.validation`
Expected: FAIL — test mới không throw, vì schema chưa biết ba biến này nên thiếu chúng vẫn
parse thành công.

- [ ] **Step 3: Write minimal implementation**

Trong `apps/api/src/config/env.validation.ts`, chèn ngay sau khối
`DISCORD_GUILD_ROLE_ID: z.string().min(1),`:

```ts
  /**
   * Discord channel ids the `/chao-mung` welcome message points a new member at.
   * Enable Developer Mode, then right-click the channel → Copy Channel ID.
   * Required: a welcome pointing at `<#undefined>` is worse than a boot that fails.
   */
  DISCORD_BANG_CHIEN_CHANNEL_ID: z.string().min(1),
  DISCORD_NGHICH_THUY_HAN_CHANNEL_ID: z.string().min(1),
  DISCORD_KHAM_ACC_CHANNEL_ID: z.string().min(1),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- env.validation`
Expected: PASS, toàn bộ file.

- [ ] **Step 5: Ghi biến vào `.env.example`**

Trong `apps/api/.env.example`, chèn ngay sau dòng `DISCORD_GUILD_ROLE_ID=`:

```
# Channels the /chao-mung welcome message points a new member at. Enable Developer Mode, then
# right-click the channel → Copy Channel ID. All three required: a missing value kills the API at
# boot, which beats posting a welcome that links to <#undefined>.
DISCORD_BANG_CHIEN_CHANNEL_ID=
DISCORD_NGHICH_THUY_HAN_CHANNEL_ID=
DISCORD_KHAM_ACC_CHANNEL_ID=
```

- [ ] **Step 6: Ghi biến vào hai bảng tài liệu**

Trong `docs/development.md` §3, chèn ba dòng ngay dưới dòng `DISCORD_GUILD_ROLE_ID`, giữ
đúng số cột:

```
| `DISCORD_BANG_CHIEN_CHANNEL_ID` | ✅ | — | Channel `#⚔️│bang-chiến`, linked by `/chao-mung` (Developer Mode → right-click the channel → Copy Channel ID) — **the API refuses to boot without it** |
| `DISCORD_NGHICH_THUY_HAN_CHANNEL_ID` | ✅ | — | Channel `#🌊│nghich-thuy-han`, linked by `/chao-mung` — **the API refuses to boot without it** |
| `DISCORD_KHAM_ACC_CHANNEL_ID` | ✅ | — | Channel `#khám-acc`, where a new member posts their gear — **the API refuses to boot without it** |
```

Trong `docs/production.md` §3, chèn ba dòng tương ứng ngay dưới dòng
`DISCORD_GUILD_ROLE_ID` (bảng này chỉ có hai cột):

```
| `DISCORD_BANG_CHIEN_CHANNEL_ID` | Channel `#⚔️│bang-chiến` (Developer Mode → right-click the channel → Copy Channel ID). **Set it before merging the PR that ships `/chao-mung`**: it is required, so a missing value kills the API at boot, and the web app has no other backend |
| `DISCORD_NGHICH_THUY_HAN_CHANNEL_ID` | Channel `#🌊│nghich-thuy-han`. Same rule: set it before merging, a missing value kills the API at boot |
| `DISCORD_KHAM_ACC_CHANNEL_ID` | Channel `#khám-acc`. Same rule: set it before merging, a missing value kills the API at boot |
```

- [ ] **Step 7: Đặt giá trị thật vào `.env` local**

Thêm vào `apps/api/.env` (file này git-ignore, **không** commit) ba channel id thật của
server. Không có bước này thì `pnpm --filter api dev` sẽ không boot được nữa.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/config/env.validation.ts apps/api/src/config/__tests__/env.validation.spec.ts apps/api/.env.example docs/development.md docs/production.md
git commit -m "feat(api): require the three channel ids /chao-mung links to"
```

---

### Task 2: Đưa ba channel id tới tay command

**Files:**
- Modify: `apps/api/src/modules/discord-bot/discord.constants.ts` (khối `COMMAND_OPTION_TYPE`)
- Modify: `apps/api/src/modules/discord-bot/commands/command.types.ts` (interface `CommandLinks`)
- Modify: `apps/api/src/modules/discord-bot/interaction-router.ts` (getter `deps`)
- Test: `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`

**Interfaces:**
- Consumes: `Env['DISCORD_BANG_CHIEN_CHANNEL_ID']`,
  `Env['DISCORD_NGHICH_THUY_HAN_CHANNEL_ID']`, `Env['DISCORD_KHAM_ACC_CHANNEL_ID']` (Task 1).
- Produces:
  - `COMMAND_OPTION_TYPE.channel` — số `7`, dùng trong definition ở Task 3.
  - `CommandLinks.channelIds: { bangChien: string; nghichThuyHan: string; khamAcc: string }`
    — đọc trong `execute` ở Task 3 bằng `deps.links.channelIds`.

- [ ] **Step 1: Write the failing test**

Thêm vào cuối `describe('InteractionRouter', ...)` trong
`apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`:

```ts
  it('đọc ba channel id của /chao-mung từ env đúng tên biến', async () => {
    // Sai tên biến ở đây không làm gãy build; nó chỉ hiện ra thành <#undefined> trong lời chào
    // đã đăng công khai — nên tên biến được ghim bằng test.
    const get = jest.fn().mockImplementation((key: string) => `giá-trị:${key}`);
    const router = new InteractionRouter(
      {} as never,
      {} as never,
      {} as never,
      { resolve: jest.fn().mockResolvedValue(null) } as never,
      { get } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await router.route({ type: 2, channel_id: '424242', data: { name: 'ping' } });

    for (const key of [
      'DISCORD_BANG_CHIEN_CHANNEL_ID',
      'DISCORD_NGHICH_THUY_HAN_CHANNEL_ID',
      'DISCORD_KHAM_ACC_CHANNEL_ID',
    ]) {
      expect(get).toHaveBeenCalledWith(key, { infer: true });
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- interaction-router`
Expected: FAIL — `get` chưa từng được gọi với ba khoá đó.

- [ ] **Step 3: Thêm option type CHANNEL**

Trong `apps/api/src/modules/discord-bot/discord.constants.ts`, thay khối
`COMMAND_OPTION_TYPE` bằng:

```ts
/** Slash command option types. Only the ones the bot declares are listed. */
export const COMMAND_OPTION_TYPE = {
  /** A guild member picker — the value arrives as a Discord ID string */
  user: 6,
  /** A channel picker — the value arrives as a channel id string */
  channel: 7,
} as const;
```

- [ ] **Step 4: Mở rộng `CommandLinks`**

Trong `apps/api/src/modules/discord-bot/commands/command.types.ts`, thay interface
`CommandLinks` bằng:

```ts
/**
 * Configuration a command may read, resolved from env once by `InteractionRouter`.
 *
 * A flat value object rather than `ConfigService`: a command needs exactly these strings, and a
 * test builds them as a literal instead of stubbing a Nest provider.
 */
export interface CommandLinks {
  /** Origin of the web app, linked from the announcement */
  webOrigin: string;
  /** Discord ID of the guild role `/thong-bao` mentions */
  guildRoleId: string;
  /** Channels `/chao-mung` points a new member at. The sect channel is not here — it is an option */
  channelIds: {
    /** `#⚔️│bang-chiến` */
    bangChien: string;
    /** `#🌊│nghich-thuy-han` */
    nghichThuyHan: string;
    /** `#khám-acc` */
    khamAcc: string;
  };
}
```

- [ ] **Step 5: Dựng `channelIds` trong router**

Trong `apps/api/src/modules/discord-bot/interaction-router.ts`, trong getter `deps`, thay
khối `links: { … }` bằng:

```ts
      links: {
        webOrigin: this.config.get('WEB_ORIGIN', { infer: true }),
        guildRoleId: this.config.get('DISCORD_GUILD_ROLE_ID', { infer: true }),
        channelIds: {
          bangChien: this.config.get('DISCORD_BANG_CHIEN_CHANNEL_ID', {
            infer: true,
          }),
          nghichThuyHan: this.config.get(
            'DISCORD_NGHICH_THUY_HAN_CHANNEL_ID',
            { infer: true },
          ),
          khamAcc: this.config.get('DISCORD_KHAM_ACC_CHANNEL_ID', {
            infer: true,
          }),
        },
      },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter api test -- interaction-router`
Expected: PASS.

- [ ] **Step 7: Sửa stub `links` trong test của `/thong-bao`**

`CommandLinks` giờ có trường bắt buộc mới. Trong
`apps/api/src/modules/discord-bot/__tests__/thong-bao.command.spec.ts`, hàm `makeDeps`
đang cast `as never` nên **có thể** vẫn xanh; chạy typecheck để biết chắc:

Run: `pnpm --filter api typecheck`
Expected: PASS. Nếu báo lỗi ở `makeDeps`, thêm vào object `links` của nó:

```ts
      channelIds: {
        bangChien: '111222333444555666',
        nghichThuyHan: '222333444555666777',
        khamAcc: '333444555666777888',
      },
```

- [ ] **Step 8: Chạy cả bộ test**

Run: `pnpm --filter api test`
Expected: PASS toàn bộ.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): carry the welcome channel ids into the command deps"
```

---

### Task 3: Lệnh `/chao-mung`

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/chao-mung.command.ts`
- Modify: `apps/api/src/modules/discord-bot/commands/index.ts`
- Test: `apps/api/src/modules/discord-bot/__tests__/chao-mung.command.spec.ts` (tạo mới)
- Test: `apps/api/src/modules/discord-bot/__tests__/commands.spec.ts` (bổ sung)

**Interfaces:**
- Consumes: `COMMAND_OPTION_TYPE.user`, `COMMAND_OPTION_TYPE.channel`,
  `CommandLinks.channelIds` (Task 2); `commandOptionValue(interaction, name)` và
  `callerDiscordId(interaction)` từ `../interaction.schema`; `NOT_LINKED` từ
  `../attendance-board`; `ephemeralText`, `publicMessage` từ `../reply`;
  `canManageGuild` từ `@guild/shared/lib`.
- Produces: `chaoMungCommand: SlashCommand` — đăng ký trong `commands/index.ts`.

- [ ] **Step 1: Write the failing test**

Tạo `apps/api/src/modules/discord-bot/__tests__/chao-mung.command.spec.ts`:

```ts
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { chaoMungCommand } from '../commands/chao-mung.command';
import type { CommandDeps } from '../commands/command.types';
import { COMMAND_OPTION_TYPE, INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';

const NEW_MEMBER_ID = '555666777';
const SECT_CHANNEL_ID = '444555666777888999';
const BANG_CHIEN_ID = '111222333444555666';
const NGHICH_THUY_HAN_ID = '222333444555666777';
const KHAM_ACC_ID = '333444555666777888';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: {
    name: 'chao-mung',
    options: [
      { name: 'nguoi', value: NEW_MEMBER_ID },
      { name: 'luu-phai', value: SECT_CHANNEL_ID },
    ],
  },
  member: { user: { id: '111' } },
};

/**
 * Build deps around one resolved actor.
 * @param resolved - What ActorResolver.resolve returns
 * @returns Stubbed deps carrying the three configured channel ids
 */
function makeDeps(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    links: {
      webOrigin: 'https://mmgh-nth.vercel.app',
      guildRoleId: '999888777',
      channelIds: {
        bangChien: BANG_CHIEN_ID,
        nghichThuyHan: NGHICH_THUY_HAN_ID,
        khamAcc: KHAM_ACC_ID,
      },
    },
  } as never;
}

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

describe('/chao-mung', () => {
  it('admin đăng được lời chào công khai đủ bốn channel', async () => {
    const reply = await chaoMungCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.ADMIN)),
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBeUndefined();
    expect(reply.data.content).toBe(
      `Chào mừng <@${NEW_MEMBER_ID}> gia nhập bang!\n` +
        '- Chat bang ở đây nha\n' +
        `- Các thông báo thì ở <#${BANG_CHIEN_ID}> , <#${NGHICH_THUY_HAN_ID}>\n` +
        `- Chat lưu phái <#${SECT_CHANNEL_ID}>\n` +
        `- Bây giờ ông vào <#${KHAM_ACC_ID}> để up gear nhé`,
    );
  });

  it('chỉ cho phép ping đúng người mới', async () => {
    // Lời chào là tin công khai; khai báo trắng danh sách khiến một @everyone lọt vào là bất khả.
    const reply = await chaoMungCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.ADMIN)),
    );

    expect(reply.data.allowed_mentions).toEqual({ users: [NEW_MEMBER_ID] });
  });

  it('bang chúng bị từ chối riêng tư, không đăng gì vào kênh', async () => {
    const reply = await chaoMungCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.MEMBER)),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toBe('Chỉ admin mới chào thành viên mới được.');
  });

  it('người gọi chưa được gán nhân vật thì nhận NOT_LINKED', async () => {
    const reply = await chaoMungCommand.execute(INTERACTION, makeDeps(null));

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('thiếu option thì báo lỗi nêu đúng tên option', async () => {
    // Discord ép required:true, nên giá trị rỗng nghĩa là definition đã đăng ký và bản build này
    // lệch nhau — thông điệp phải chỉ ra option nào để biết chạy lại discord:register.
    for (const missing of ['nguoi', 'luu-phai']) {
      const interaction = {
        ...INTERACTION,
        data: {
          ...INTERACTION.data,
          options: INTERACTION.data.options.filter(
            (option) => option.name !== missing,
          ),
        },
      };

      await expect(
        chaoMungCommand.execute(interaction, makeDeps(actor(GuildRole.ADMIN))),
      ).rejects.toThrow(missing);
    }
  });

  it('khai báo hai option bắt buộc, đúng kiểu Discord', () => {
    expect(chaoMungCommand.definition.options).toEqual([
      {
        name: 'nguoi',
        description: expect.any(String),
        type: COMMAND_OPTION_TYPE.user,
        required: true,
      },
      {
        name: 'luu-phai',
        description: expect.any(String),
        type: COMMAND_OPTION_TYPE.channel,
        required: true,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- chao-mung`
Expected: FAIL — `Cannot find module '../commands/chao-mung.command'`.

- [ ] **Step 3: Write minimal implementation**

Tạo `apps/api/src/modules/discord-bot/commands/chao-mung.command.ts`:

```ts
import { canManageGuild } from '@guild/shared/lib';

import { NOT_LINKED } from '../attendance-board';
import { COMMAND_OPTION_TYPE } from '../discord.constants';
import { callerDiscordId, commandOptionValue } from '../interaction.schema';
import { ephemeralText, publicMessage } from '../reply';
import type { CommandLinks, CommandReply, SlashCommand } from './command.types';

/** Option names, used both when registering and when reading the invocation. */
const MEMBER_OPTION = 'nguoi';
const SECT_OPTION = 'luu-phai';

/**
 * Shown to a member who tried to welcome somebody.
 * The refusal stays ephemeral even though the welcome itself is public: a channel does not need to
 * watch someone be told no.
 */
const ADMIN_ONLY = 'Chỉ admin mới chào thành viên mới được.';

/**
 * The welcome itself.
 *
 * "Chat bang ở đây nha" carries no channel mention on purpose: the message is posted in that very
 * channel, so "ở đây" already points at it — see the spec §3.2.
 *
 * @param newMemberId - Discord ID of the member being welcomed
 * @param sectChannelId - Channel of the member's sect, picked when the command was typed
 * @param channelIds - The three channels configured once in the environment
 * @returns The message body, ready to post
 */
function buildWelcome(
  newMemberId: string,
  sectChannelId: string,
  channelIds: CommandLinks['channelIds'],
): string {
  return [
    `Chào mừng <@${newMemberId}> gia nhập bang!`,
    '- Chat bang ở đây nha',
    `- Các thông báo thì ở <#${channelIds.bangChien}> , <#${channelIds.nghichThuyHan}>`,
    `- Chat lưu phái <#${sectChannelId}>`,
    `- Bây giờ ông vào <#${channelIds.khamAcc}> để up gear nhé`,
  ].join('\n');
}

/**
 * Welcome a new member and point them at the channels they need — admins only.
 *
 * The role is checked here rather than left to a service, because the reply *is* the effect — by
 * the time anything downstream could refuse, the message would already be in the channel. The same
 * reason it is public rather than ephemeral: an ephemeral message reaches only whoever typed the
 * command, and the whole point is that the new member is mentioned, and so notified.
 */
export const chaoMungCommand: SlashCommand = {
  definition: {
    name: 'chao-mung',
    description: 'Chào một thành viên mới và chỉ họ các channel cần biết (chỉ admin)',
    options: [
      {
        name: MEMBER_OPTION,
        description: 'Thành viên mới cần chào',
        type: COMMAND_OPTION_TYPE.user,
        required: true,
      },
      {
        name: SECT_OPTION,
        description: 'Channel chat lưu phái của thành viên đó',
        type: COMMAND_OPTION_TYPE.channel,
        required: true,
      },
    ],
  },

  execute: async (interaction, deps): Promise<CommandReply> => {
    const resolved = await deps.actors.resolve(callerDiscordId(interaction));

    if (!resolved) return ephemeralText(NOT_LINKED);
    if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);

    const newMemberId = commandOptionValue(interaction, MEMBER_OPTION);
    const sectChannelId = commandOptionValue(interaction, SECT_OPTION);

    if (!newMemberId) {
      // Discord enforces `required: true`, so an empty value means the registered definition and
      // this build disagree — say which option, the fix is `pnpm --filter api discord:register`.
      throw new Error(`Thiếu option ${MEMBER_OPTION} của /chao-mung.`);
    }

    if (!sectChannelId) {
      throw new Error(`Thiếu option ${SECT_OPTION} của /chao-mung.`);
    }

    return publicMessage({
      content: buildWelcome(newMemberId, sectChannelId, deps.links.channelIds),
      allowed_mentions: { users: [newMemberId] },
    });
  },
};
```

Hai guard clause riêng thay vì một vòng lặp: vòng lặp không hẹp được kiểu, và mỗi lần
`buildWelcome` nhận `string | null` là một dấu `!` phải viết thêm.

- [ ] **Step 4: Đăng ký lệnh**

Trong `apps/api/src/modules/discord-bot/commands/index.ts`, thêm import (giữ thứ tự
alphabet của các import hiện có) và một phần tử vào mảng `commands`:

```ts
import { chaoMungCommand } from './chao-mung.command';
```

```ts
export const commands: readonly SlashCommand[] = [
  pingCommand,
  diemDanhCommand,
  diemDanhHoCommand,
  thongBaoCommand,
  cauHinhKenhCommand,
  nhacDiemDanhCommand,
  chaoMungCommand,
];
```

- [ ] **Step 5: Ghim lệnh vào test registry**

Trong `apps/api/src/modules/discord-bot/__tests__/commands.spec.ts`, thêm import và một
`it` vào `describe('registry lệnh', ...)`:

```ts
import { chaoMungCommand } from '../commands/chao-mung.command';
```

```ts
  it('chứa /chao-mung', () => {
    expect(commands).toContain(chaoMungCommand);
  });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter api test -- chao-mung commands`
Expected: PASS.

- [ ] **Step 7: Chạy cả bộ test, lint và typecheck**

Run: `pnpm --filter api test && pnpm --filter api lint && pnpm --filter api typecheck`
Expected: PASS cả ba.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the /chao-mung welcome command"
```

---

### Task 4: Tài liệu kiến trúc

**Files:**
- Modify: `docs/architecture.md` §3.3 (ô "Owns" của dòng `discord-bot`)

**Interfaces:**
- Consumes: lệnh `/chao-mung` đã tồn tại (Task 3).
- Produces: không có — task cuối.

- [ ] **Step 1: Bổ sung lệnh vào bảng module**

Trong `docs/architecture.md` §3.3, ô "Owns" của dòng `discord-bot` hiện kết thúc bằng
"… và daily attendance reminder — run by Vercel Cron, or by hand with `/nhac-diem-danh`.
The last three are admin only". Thêm `/chao-mung` vào trước câu cuối và sửa số đếm:

```
… the weekly schedule announcement (`/thong-bao`), the announcement channel (`/cau-hinh-kenh`), the daily attendance reminder — run by Vercel Cron, or by hand with `/nhac-diem-danh` — and the welcome for a new member (`/chao-mung`), which links three channels configured in the environment plus the sect channel picked when the command is typed. The last four are admin only
```

- [ ] **Step 2: Kiểm tra định dạng bảng còn nguyên**

Run: `grep -n 'discord-bot' docs/architecture.md`
Expected: dòng vẫn có đúng 3 dấu `|` phân cột như các dòng khác trong bảng.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: record /chao-mung in the discord-bot module row"
```

---

## Sau khi merge

1. Set ba biến `DISCORD_*_CHANNEL_ID` trên host **trước** khi merge PR. Chúng bắt buộc;
   thiếu là API không boot và web app mất backend.
2. Sau deploy: `pnpm --filter api discord:register`, và bản production với
   `DISCORD_ENV_FILE=.env.production`, để `/chao-mung` xuất hiện trong ô chat.
3. Thử trong Discord: `/chao-mung nguoi:@ai-đó luu-phai:#toái-mộng` — bốn mention phải bấm
   được, và chỉ người mới nhận thông báo.
