# Discord Bot — Khung lệnh và `/ping` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một lệnh `/ping` gõ trong Discord đi tới `apps/api`, được xác thực chữ ký Ed25519, và trả
lời về kênh chat — kèm chỗ đặt sẵn cho mọi lệnh sau.

**Architecture:** Bot là module `src/modules/discord-bot/` trong `apps/api`, không phải app riêng.
Discord `POST` vào `/api/discord/interactions`; một guard verify chữ ký Ed25519 trên **raw body**;
Zod parse payload thành union theo `type`; `interaction-router.ts` switch theo `type` rồi theo tên
lệnh, kết thúc bằng `assertNever`. Mỗi lệnh là một file trong `commands/`, tự chứa cả phần khai báo
gửi lên Discord lẫn phần xử lý.

**Tech Stack:** NestJS 11 · Zod 4 · `node:crypto` (Ed25519, không thêm dependency) · Jest ·
ts-node cho script đăng ký lệnh.

**Spec:** [`docs/superpowers/specs/2026-09-01-discord-bot-design.md`](../specs/2026-09-01-discord-bot-design.md)

## Global Constraints

- Comment và tên file bằng **tiếng Anh**; nội dung trong `docs/superpowers/` bằng **tiếng Việt**.
- **Doc comment (JSDoc) cho mọi hàm export**: mục đích, từng tham số, giá trị trả về.
- Thông điệp lỗi trả ra ngoài bằng **tiếng Việt** (luật `AllExceptionsFilter` của repo).
- **Không thêm dependency mới.** Ed25519 dùng `node:crypto`.
- **Không `forwardRef()`**, không import file nội bộ của module khác — chỉ qua `*.public.ts` hoặc
  `*.module.ts` (ESLint `boundaries` bắt lỗi thật).
- `common/` và `config/` **không được** import từ `modules/`.
- Switch trên discriminant tag phải kết thúc bằng `assertNever`.
- Commit message tiếng Anh, Conventional Commits, **không** dòng attribution.
- Branch hiện tại: `feat/init-discord-bot`. Không commit lên `main`.
- Lệnh chạy test: `pnpm --filter api test <pattern>` (chạy từ thư mục gốc repo).
- Lệnh lint/typecheck: `pnpm --filter api lint` · `pnpm --filter api typecheck`.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/common/assert-never.ts` | **Tạo.** Hàm ép switch phủ hết union. Repo chưa có, dù `CLAUDE.md` coi là quy ước. |
| `src/common/decorators/raw-response.decorator.ts` | **Tạo.** Đánh dấu route không được bọc `{ data }`. |
| `src/common/interceptors/transform.interceptor.ts` | **Sửa.** Bỏ qua route có metadata trên. |
| `src/common/index.ts` | **Sửa.** Export hai file mới. |
| `src/config/env.validation.ts` | **Sửa.** Thêm `DISCORD_PUBLIC_KEY`. |
| `src/modules/discord-bot/discord.constants.ts` | **Tạo.** Mã `type` của Discord + tên header. |
| `src/modules/discord-bot/interaction.schema.ts` | **Tạo.** Zod cho payload Discord gửi tới. |
| `src/modules/discord-bot/verify-signature.ts` | **Tạo.** Hàm pure verify Ed25519. Không biết gì về Nest. |
| `src/modules/discord-bot/commands/command.types.ts` | **Tạo.** `SlashCommand`, `SlashCommandDefinition`, `CommandReply`. |
| `src/modules/discord-bot/commands/ping.command.ts` | **Tạo.** Lệnh `/ping`. |
| `src/modules/discord-bot/commands/index.ts` | **Tạo.** Registry — điểm duy nhất phải sửa khi thêm lệnh. |
| `src/modules/discord-bot/interaction-router.ts` | **Tạo.** Switch theo `type` rồi theo tên lệnh. |
| `src/modules/discord-bot/discord-bot.guard.ts` | **Tạo.** `DiscordSignatureGuard` — biên tin cậy duy nhất. |
| `src/modules/discord-bot/discord-bot.controller.ts` | **Tạo.** `POST /discord/interactions`, mỏng. |
| `src/modules/discord-bot/discord-bot.module.ts` | **Tạo.** Đăng ký DI. |
| `src/modules/discord-bot/discord-bot.public.ts` | **Tạo.** Export `commandDefinitions` cho script. |
| `src/main.ts` | **Sửa.** `{ rawBody: true }`. |
| `src/app.module.ts` | **Sửa.** Thêm `DiscordBotModule`. |
| `src/scripts/register-discord-commands.ts` | **Tạo.** `PUT` registry lên Discord. |
| `package.json` | **Sửa.** Script `discord:register`. |
| `.env.example` | **Sửa.** Ba biến Discord mới. |

---

## Task 0: Chuẩn bị Discord Application (KHÔNG PHẢI CODE — làm trước Task 6)

**Bắt buộc làm trước khi merge.** `DISCORD_PUBLIC_KEY` là biến **required**: thiếu nó thì
`validateEnv` giết process lúc boot, và vì `apps/api` phục vụ cả web app, **toàn bộ hệ thống sập**
chứ không riêng bot. Đặt biến lên Vercel **trước** khi merge PR, không phải sau.

- [x] **Bước 1: Tạo application**

Vào https://discord.com/developers/applications → **New Application** → đặt tên (ví dụ
`MMGH Guild Bot`).

- [x] **Bước 2: Lấy ba giá trị**

| Giá trị | Lấy ở đâu |
|---|---|
| **Public Key** | General Information → Public Key (64 ký tự hex) |
| **Bot Token** | Bot → Reset Token. **Chỉ hiện một lần**, copy ngay |
| **Guild ID** | Trong Discord: Settings → Advanced → bật Developer Mode, rồi chuột phải tên server → Copy Server ID |

`DISCORD_CLIENT_ID` đã có sẵn trong `.env` (dùng cho OAuth) và **chính là Application ID** — không
tạo biến mới.

- [x] **Bước 3: Mời bot vào server**

OAuth2 → URL Generator → tick scope `bot` và `applications.commands` → mở URL sinh ra → chọn server
của bang.

- [x] **Bước 4: Điền vào `apps/api/.env` local**

```
DISCORD_PUBLIC_KEY=<64 ký tự hex>
DISCORD_BOT_TOKEN=<token>
DISCORD_GUILD_ID=<id server>
```

- [x] **Bước 5: Đặt `DISCORD_PUBLIC_KEY` lên Vercel project `guild-manager-api`**

Settings → Environment Variables → Production. **Chỉ biến này**; hai biến kia runtime không đọc.

Không có gì để commit ở task này.

---

## Task 1: `assertNever` và `@RawResponse()` ở `common/`

**Files:**
- Create: `apps/api/src/common/assert-never.ts`
- Create: `apps/api/src/common/__tests__/assert-never.spec.ts`
- Create: `apps/api/src/common/decorators/raw-response.decorator.ts`
- Modify: `apps/api/src/common/interceptors/transform.interceptor.ts`
- Modify: `apps/api/src/common/interceptors/__tests__/transform.interceptor.spec.ts`
- Modify: `apps/api/src/common/index.ts`

**Interfaces:**
- Consumes: không gì.
- Produces:
  - `assertNever(value: never, message: string): never`
  - `RAW_RESPONSE_METADATA: 'rawResponse'`
  - `RawResponse(): CustomDecorator`
  - Cả ba export qua `src/common/index.ts`.

- [x] **Bước 1: Viết test thất bại cho `assertNever`**

Tạo `apps/api/src/common/__tests__/assert-never.spec.ts`:

```ts
import { assertNever } from '../assert-never';

describe('assertNever', () => {
  it('ném lỗi kèm chính giá trị không xử lý được', () => {
    // Cast qua unknown: đây đúng là tình huống dữ liệu ngoài process mang tag mà kiểu hứa là không
    // thể có — thứ duy nhất assertNever còn tác dụng lúc chạy.
    const unhandled = { type: 99 } as unknown as never;

    expect(() => assertNever(unhandled, 'Interaction type ngoài dự kiến')).toThrow(
      'Interaction type ngoài dự kiến: {"type":99}',
    );
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test assert-never
```
Kỳ vọng: FAIL — `Cannot find module '../assert-never'`.

- [x] **Bước 3: Viết `assert-never.ts`**

Tạo `apps/api/src/common/assert-never.ts`:

```ts
/**
 * Ends a switch over a discriminated union.
 *
 * A new variant nobody handled becomes a compile error here, because only an exhausted union
 * narrows to `never`. At runtime it still throws — data that entered the process from outside can
 * carry a tag the type says is impossible.
 *
 * @param value - The value TypeScript has narrowed to `never`
 * @param message - What was being switched on, used as the error prefix
 * @returns Never returns
 * @throws Error always
 */
export function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test assert-never
```
Kỳ vọng: PASS.

- [x] **Bước 5: Viết test thất bại cho `@RawResponse()`**

Thêm vào cuối `describe` trong
`apps/api/src/common/interceptors/__tests__/transform.interceptor.spec.ts`:

```ts
  it('để nguyên body của route @RawResponse()', async () => {
    function discordRoute(): void {}
    Reflect.defineMetadata(RAW_RESPONSE_METADATA, true, discordRoute);

    // Discord đọc `type` ở top level; `{ data: { type: 1 } }` nó bỏ qua không một tiếng động.
    await expect(intercept(discordRoute, { type: 1 })).resolves.toEqual({
      type: 1,
    });
  });
```

Và thêm import ở đầu file, ngay dưới dòng `import { TransformInterceptor } ...`:

```ts
import { RAW_RESPONSE_METADATA } from '../../decorators/raw-response.decorator';
```

- [x] **Bước 6: Chạy test, xác nhận FAIL**

```
pnpm --filter api test transform.interceptor
```
Kỳ vọng: FAIL — không tìm thấy module `raw-response.decorator`.

- [x] **Bước 7: Viết decorator**

Tạo `apps/api/src/common/decorators/raw-response.decorator.ts`:

```ts
import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/** Metadata key marking a route whose return value must reach the caller untouched. */
export const RAW_RESPONSE_METADATA = 'rawResponse';

/**
 * Marks a route whose response body is owned by a third party, so `TransformInterceptor` leaves it
 * alone instead of wrapping it in `{ data }`.
 *
 * @returns The decorator that sets the raw-response metadata on the route
 */
export const RawResponse = (): CustomDecorator =>
  SetMetadata(RAW_RESPONSE_METADATA, true);
```

- [x] **Bước 8: Sửa `TransformInterceptor`**

Trong `apps/api/src/common/interceptors/transform.interceptor.ts`:

Thêm import:

```ts
import { RAW_RESPONSE_METADATA } from '../decorators/raw-response.decorator';
```

Thay thân `intercept` (giữ nguyên chữ ký và JSDoc, chỉ đổi phần thân):

```ts
    const isRedirect =
      this.reflector.get(REDIRECT_METADATA, context.getHandler()) !== undefined;
    const isRaw =
      this.reflector.get(RAW_RESPONSE_METADATA, context.getHandler()) === true;

    if (isRedirect || isRaw) return next.handle();

    return next.handle().pipe(map((data) => ({ data })));
```

Và nối thêm vào JSDoc của class, ngay sau đoạn giải thích `@Redirect()`:

```
 * Same for `@RawResponse()`: Discord reads `type` off the top level of an interaction reply, so a
 * wrapped body is ignored silently — no error, no log, just a slash command that never answers.
```

- [x] **Bước 9: Chạy cả hai test, xác nhận PASS**

```
pnpm --filter api test transform.interceptor assert-never
```
Kỳ vọng: PASS, 4 test (2 cũ + 2 mới).

- [x] **Bước 10: Export ra `common/index.ts`**

Trong `apps/api/src/common/index.ts`, thêm hai dòng giữ đúng thứ tự alphabet của đường dẫn:

```ts
export * from './assert-never';
```
(đặt trên dòng `export * from './auth/read-bearer-token';`)

```ts
export * from './decorators/raw-response.decorator';
```
(đặt ngay dưới dòng `export * from './decorators/current-user.decorator';`)

- [x] **Bước 11: Lint + typecheck**

```
pnpm --filter api lint && pnpm --filter api typecheck
```
Kỳ vọng: không lỗi.

- [x] **Bước 12: Commit**

```bash
git add apps/api/src/common
git commit -m "feat(api): add assertNever and a raw-response escape from the transform interceptor"
```

---

## Task 2: Verify chữ ký Ed25519

**Files:**
- Create: `apps/api/src/modules/discord-bot/verify-signature.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/verify-signature.spec.ts`

**Interfaces:**
- Consumes: không gì (hàm pure, chỉ dùng `node:crypto`).
- Produces:
  - `interface DiscordSignatureInput { publicKey: string; signature: string; timestamp: string; rawBody: string }`
  - `isValidDiscordSignature(input: DiscordSignatureInput): boolean`

- [x] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/verify-signature.spec.ts`:

```ts
import { generateKeyPairSync, sign } from 'node:crypto';

import { isValidDiscordSignature } from '../verify-signature';

/** Bytes of DER/SPKI before the raw 32-byte Ed25519 key. */
const SPKI_HEADER_LENGTH = 12;

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

/** The raw key as 64 hex characters — the form the Discord portal shows. */
const publicKeyHex = publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(SPKI_HEADER_LENGTH)
  .toString('hex');

const timestamp = '1756700000';
const rawBody = '{"type":1}';

/**
 * Sign a payload the way Discord does: over `timestamp + rawBody`.
 * @param signedTimestamp - Timestamp that goes into the signed bytes
 * @param signedBody - Raw request body that goes into the signed bytes
 * @returns The signature as hex
 */
function signPayload(signedTimestamp: string, signedBody: string): string {
  return sign(
    null,
    Buffer.from(signedTimestamp + signedBody),
    privateKey,
  ).toString('hex');
}

describe('isValidDiscordSignature', () => {
  it('chấp nhận chữ ký thật của đúng payload', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: signPayload(timestamp, rawBody),
        timestamp,
        rawBody,
      }),
    ).toBe(true);
  });

  it('từ chối khi body bị đổi dù chỉ một ký tự', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: signPayload(timestamp, rawBody),
        timestamp,
        rawBody: '{"type":2}',
      }),
    ).toBe(false);
  });

  it('từ chối khi timestamp bị đổi — timestamp cũng nằm trong phần được ký', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: signPayload(timestamp, rawBody),
        timestamp: '1756700001',
        rawBody,
      }),
    ).toBe(false);
  });

  it('trả false chứ không ném khi chữ ký không phải hex', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: 'không-phải-hex',
        timestamp,
        rawBody,
      }),
    ).toBe(false);
  });

  it('trả false chứ không ném khi public key sai độ dài', () => {
    expect(
      isValidDiscordSignature({
        publicKey: 'abcd',
        signature: signPayload(timestamp, rawBody),
        timestamp,
        rawBody,
      }),
    ).toBe(false);
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test verify-signature
```
Kỳ vọng: FAIL — `Cannot find module '../verify-signature'`.

- [x] **Bước 3: Viết implementation**

Tạo `apps/api/src/modules/discord-bot/verify-signature.ts`:

```ts
import { createPublicKey, verify } from 'node:crypto';

/**
 * DER/SPKI header for an Ed25519 public key.
 *
 * Discord publishes the bare 32 key bytes as hex, but `createPublicKey` only imports a structured
 * key, so the header is prepended to rebuild the SPKI encoding it does accept.
 */
const ED25519_SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');

/** A public key is exactly 32 bytes as hex. */
const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/i;

/** An Ed25519 signature is exactly 64 bytes as hex. */
const SIGNATURE_PATTERN = /^[0-9a-f]{128}$/i;

/** Everything needed to check one interaction request. */
export interface DiscordSignatureInput {
  /** Application public key, 64 hex characters (`DISCORD_PUBLIC_KEY`) */
  publicKey: string;
  /** Value of the `X-Signature-Ed25519` header */
  signature: string;
  /** Value of the `X-Signature-Timestamp` header */
  timestamp: string;
  /** The request body exactly as it arrived, before any JSON parsing */
  rawBody: string;
}

/**
 * Check that Discord, and only Discord, sent this request.
 *
 * The signed bytes are `timestamp + rawBody`. It must be the *raw* body: parsing to JSON and
 * serialising again produces different bytes (key order, whitespace, escaping) and the signature
 * then never matches.
 *
 * Both hex inputs are shape-checked first, so a malformed header returns false instead of throwing
 * from inside the crypto layer — a prober must not be able to turn a bad header into a 500.
 *
 * @param input - Public key, signature, timestamp and raw body of the request
 * @returns true when the signature is valid for this exact payload
 */
export function isValidDiscordSignature({
  publicKey,
  signature,
  timestamp,
  rawBody,
}: DiscordSignatureInput): boolean {
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) return false;
  if (!SIGNATURE_PATTERN.test(signature)) return false;

  const key = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_HEADER, Buffer.from(publicKey, 'hex')]),
    format: 'der',
    type: 'spki',
  });

  return verify(
    null,
    Buffer.from(timestamp + rawBody),
    key,
    Buffer.from(signature, 'hex'),
  );
}
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test verify-signature
```
Kỳ vọng: PASS, 5 test.

- [x] **Bước 5: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): verify discord ed25519 interaction signatures"
```

---

## Task 3: Hằng số và schema của payload Discord

**Files:**
- Create: `apps/api/src/modules/discord-bot/discord.constants.ts`
- Create: `apps/api/src/modules/discord-bot/interaction.schema.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts`

**Interfaces:**
- Consumes: không gì.
- Produces:
  - `INTERACTION_TYPE = { ping: 1, applicationCommand: 2 }` (as const)
  - `INTERACTION_RESPONSE_TYPE = { pong: 1, channelMessageWithSource: 4 }` (as const)
  - `DISCORD_SIGNATURE_HEADER = 'x-signature-ed25519'`
  - `DISCORD_TIMESTAMP_HEADER = 'x-signature-timestamp'`
  - `interactionSchema` (Zod discriminated union)
  - `type Interaction`, `type ApplicationCommandInteraction`

- [x] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/interaction.schema.spec.ts`:

```ts
import { interactionSchema } from '../interaction.schema';

describe('interactionSchema', () => {
  it('đọc được gói PING Discord dùng để kiểm tra endpoint', () => {
    const parsed = interactionSchema.parse({ type: 1 });

    expect(parsed).toEqual({ type: 1 });
  });

  it('đọc được một lệnh và giữ lại tên lệnh', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      data: { name: 'ping', id: '123' },
    });

    expect(parsed).toEqual({ type: 2, data: { name: 'ping' } });
  });

  it('từ chối type không nằm trong hai loại đang xử lý', () => {
    // 3 = MESSAGE_COMPONENT (bấm nút). Chưa hỗ trợ, và im lặng nhận vào là tệ hơn từ chối.
    expect(() => interactionSchema.parse({ type: 3 })).toThrow();
  });

  it('từ chối một lệnh không có tên', () => {
    expect(() => interactionSchema.parse({ type: 2, data: {} })).toThrow();
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test interaction.schema
```
Kỳ vọng: FAIL — `Cannot find module '../interaction.schema'`.

- [x] **Bước 3: Viết `discord.constants.ts`**

Tạo `apps/api/src/modules/discord-bot/discord.constants.ts`:

```ts
/**
 * Interaction types Discord sends. Only the two the bot answers are listed; an unlisted value is
 * rejected by `interactionSchema` rather than passed on.
 *
 * https://discord.com/developers/docs/interactions/receiving-and-responding
 */
export const INTERACTION_TYPE = {
  /** Discord's own health check, sent when the endpoint URL is saved and periodically after */
  ping: 1,
  /** Someone ran a slash command */
  applicationCommand: 2,
} as const;

/** Response types the bot may answer with. */
export const INTERACTION_RESPONSE_TYPE = {
  /** The only valid answer to a PING */
  pong: 1,
  /** A message visible in the channel the command was used in */
  channelMessageWithSource: 4,
} as const;

/** Header carrying the Ed25519 signature — lowercase, the form Express normalises headers to. */
export const DISCORD_SIGNATURE_HEADER = 'x-signature-ed25519';

/** Header carrying the timestamp that is signed together with the body. */
export const DISCORD_TIMESTAMP_HEADER = 'x-signature-timestamp';
```

- [x] **Bước 4: Viết `interaction.schema.ts`**

Tạo `apps/api/src/modules/discord-bot/interaction.schema.ts`:

```ts
import { z } from 'zod';

import { INTERACTION_TYPE } from './discord.constants';

/**
 * These shapes stay in this module instead of `packages/shared`.
 *
 * The shared package owns the api ↔ web contract; this payload is defined by Discord and the web
 * app never touches it. Putting it there would claim ownership of a shape we only read.
 */
const pingInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.ping),
});

const applicationCommandInteractionSchema = z.object({
  type: z.literal(INTERACTION_TYPE.applicationCommand),
  data: z.object({ name: z.string().min(1) }),
});

/** Every interaction the bot accepts. An unlisted `type` fails here, at the edge. */
export const interactionSchema = z.discriminatedUnion('type', [
  pingInteractionSchema,
  applicationCommandInteractionSchema,
]);

/** A validated interaction, narrowed by `type`. */
export type Interaction = z.infer<typeof interactionSchema>;

/** A validated slash command invocation. */
export type ApplicationCommandInteraction = z.infer<
  typeof applicationCommandInteractionSchema
>;
```

- [x] **Bước 5: Chạy test, xác nhận PASS**

```
pnpm --filter api test interaction.schema
```
Kỳ vọng: PASS, 4 test.

- [x] **Bước 6: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): validate discord interaction payloads at the edge"
```

---

## Task 4: Registry lệnh và `/ping`

**Files:**
- Create: `apps/api/src/modules/discord-bot/commands/command.types.ts`
- Create: `apps/api/src/modules/discord-bot/commands/ping.command.ts`
- Create: `apps/api/src/modules/discord-bot/commands/index.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/commands.spec.ts`

**Interfaces:**
- Consumes: `INTERACTION_RESPONSE_TYPE` và `ApplicationCommandInteraction` (Task 3).
- Produces:
  - `interface SlashCommandDefinition { name: string; description: string }`
  - `interface CommandReply { type: 4; data: { content: string } }`
  - `interface SlashCommand { definition: SlashCommandDefinition; execute(interaction: ApplicationCommandInteraction): CommandReply }`
  - `pingCommand: SlashCommand`
  - `commands: readonly SlashCommand[]`
  - `commandDefinitions: readonly SlashCommandDefinition[]`

- [x] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/commands.spec.ts`:

```ts
import { commandDefinitions, commands } from '../commands';
import { pingCommand } from '../commands/ping.command';
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';

describe('/ping', () => {
  it('trả một tin nhắn thấy được trong kênh', () => {
    const reply = pingCommand.execute({ type: 2, data: { name: 'ping' } });

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.content).toContain('Pong');
  });
});

describe('registry lệnh', () => {
  it('chứa /ping', () => {
    expect(commands).toContain(pingCommand);
  });

  it('không có hai lệnh trùng tên', () => {
    // Discord nhận cả hai và chỉ giữ lại một; router thì tra Map nên giữ lại cái kia. Trùng tên là
    // một lệnh biến mất mà không ai báo.
    const names = commandDefinitions.map((definition) => definition.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('mọi lệnh đều có mô tả để Discord hiện trong ô chat', () => {
    for (const definition of commandDefinitions) {
      expect(definition.description.length).toBeGreaterThan(0);
    }
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test commands
```
Kỳ vọng: FAIL — `Cannot find module '../commands'`.

- [x] **Bước 3: Viết `command.types.ts`**

Tạo `apps/api/src/modules/discord-bot/commands/command.types.ts`:

```ts
import type { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import type { ApplicationCommandInteraction } from '../interaction.schema';

/** What gets sent to Discord so the command appears in the chat box. */
export interface SlashCommandDefinition {
  /** Name typed after the slash, lowercase, no spaces */
  name: string;
  /** One line Discord shows next to the name while typing */
  description: string;
}

/** A reply visible in the channel the command was used in. */
export interface CommandReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['channelMessageWithSource'];
  data: { content: string };
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
   * @returns The reply Discord shows in the channel
   */
  execute(interaction: ApplicationCommandInteraction): CommandReply;
}
```

- [x] **Bước 4: Viết `ping.command.ts`**

Tạo `apps/api/src/modules/discord-bot/commands/ping.command.ts`:

```ts
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import type { CommandReply, SlashCommand } from './command.types';

/**
 * Proves the whole path end to end: Discord → signature check → router → reply. It answers from
 * memory, so a failure can only be the plumbing, never the data.
 */
export const pingCommand: SlashCommand = {
  definition: {
    name: 'ping',
    description: 'Kiểm tra bot còn sống',
  },

  execute: (): CommandReply => ({
    type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
    data: { content: 'Pong! Bot đang chạy.' },
  }),
};
```

- [x] **Bước 5: Viết `commands/index.ts`**

Tạo `apps/api/src/modules/discord-bot/commands/index.ts`:

```ts
import type { SlashCommand, SlashCommandDefinition } from './command.types';
import { pingCommand } from './ping.command';

/**
 * Every command the bot answers.
 *
 * Adding a command is: one new file next to this one, one line here. Nothing else in the module
 * changes.
 */
export const commands: readonly SlashCommand[] = [pingCommand];

/** Exactly what `discord:register` sends to Discord. */
export const commandDefinitions: readonly SlashCommandDefinition[] =
  commands.map((command) => command.definition);
```

- [x] **Bước 6: Chạy test, xác nhận PASS**

```
pnpm --filter api test commands
```
Kỳ vọng: PASS, 4 test.

- [x] **Bước 7: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): add the discord slash command registry and /ping"
```

---

## Task 5: Router

**Files:**
- Create: `apps/api/src/modules/discord-bot/interaction-router.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`

**Interfaces:**
- Consumes: `assertNever` (Task 1), `INTERACTION_TYPE` / `INTERACTION_RESPONSE_TYPE` và
  `Interaction` (Task 3), `commands` và `CommandReply` (Task 4).
- Produces:
  - `type InteractionReply = { type: 1 } | CommandReply`
  - `routeInteraction(interaction: Interaction): InteractionReply`

- [x] **Bước 1: Viết test thất bại**

Tạo `apps/api/src/modules/discord-bot/__tests__/interaction-router.spec.ts`:

```ts
import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import { routeInteraction } from '../interaction-router';

describe('routeInteraction', () => {
  it('trả PONG cho gói PING', () => {
    expect(routeInteraction({ type: 1 })).toEqual({
      type: INTERACTION_RESPONSE_TYPE.pong,
    });
  });

  it('gọi đúng lệnh theo tên', () => {
    const reply = routeInteraction({ type: 2, data: { name: 'ping' } });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: 'Pong! Bot đang chạy.' },
    });
  });

  it('ném lỗi nêu tên lệnh khi lệnh chưa có trong registry', () => {
    // Trả 200 rỗng thì Discord hiện "ứng dụng không phản hồi" và không ai biết vì sao. Ném lỗi để
    // nó vào log kèm request id.
    expect(() =>
      routeInteraction({ type: 2, data: { name: 'diem-danh' } }),
    ).toThrow('diem-danh');
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test interaction-router
```
Kỳ vọng: FAIL — `Cannot find module '../interaction-router'`.

- [x] **Bước 3: Viết implementation**

Tạo `apps/api/src/modules/discord-bot/interaction-router.ts`:

```ts
import { assertNever } from '../../common';
import { commands } from './commands';
import type { CommandReply } from './commands/command.types';
import {
  INTERACTION_RESPONSE_TYPE,
  INTERACTION_TYPE,
} from './discord.constants';
import type { Interaction } from './interaction.schema';

/** The only valid answer to Discord's health check. */
interface PongReply {
  type: (typeof INTERACTION_RESPONSE_TYPE)['pong'];
}

/** Everything the bot may answer an interaction with. */
export type InteractionReply = PongReply | CommandReply;

/** Built once: the registry never changes after the module is loaded. */
const commandsByName = new Map(
  commands.map((command) => [command.definition.name, command]),
);

/**
 * Turn a validated interaction into the reply Discord expects.
 *
 * This function owns both levels of the switch — by `type`, then by command name — so the whole of
 * the bot's Discord-facing behaviour is testable without an HTTP layer.
 *
 * @param interaction - The interaction, already validated by `interactionSchema`
 * @returns The reply to send back in the HTTP response body
 * @throws Error when the command name is not in the registry — Discord was told about a command
 *   this build does not have, which is a deploy/registration mismatch, not a user error
 */
export function routeInteraction(interaction: Interaction): InteractionReply {
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

      return command.execute(interaction);
    }

    default:
      return assertNever(interaction, 'Interaction type ngoài dự kiến');
  }
}
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test interaction-router
```
Kỳ vọng: PASS, 3 test.

- [x] **Bước 5: Commit**

```bash
git add apps/api/src/modules/discord-bot
git commit -m "feat(api): route discord interactions to their command handler"
```

---

## Task 6: Biến môi trường `DISCORD_PUBLIC_KEY`

**Files:**
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/config/__tests__/env.validation.spec.ts`
- Modify: `apps/api/.env.example`

**Interfaces:**
- Consumes: không gì.
- Produces: `Env['DISCORD_PUBLIC_KEY']: string` — đọc bằng
  `config.get('DISCORD_PUBLIC_KEY', { infer: true })`.

> **Cảnh báo blast radius:** đây là biến **required**. Task 0 bước 4 và 5 phải xong trước, nếu không
> `pnpm --filter api dev` chết ngay và bản deploy tiếp theo kéo sập cả web app.

- [x] **Bước 1: Viết test thất bại**

Trong `apps/api/src/config/__tests__/env.validation.spec.ts`, thêm `DISCORD_PUBLIC_KEY` vào `base`:

```ts
const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/guild',
  AUTH_SECRET: 'x'.repeat(32),
  DISCORD_CLIENT_ID: '1234567890',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'http://localhost:3001/api/auth/discord/callback',
  DISCORD_PUBLIC_KEY: 'a'.repeat(64),
};
```

Và thêm hai test vào cuối `describe`:

```ts
  it('chết khi DISCORD_PUBLIC_KEY không phải 64 ký tự hex', () => {
    expect(() =>
      validateEnv({ ...base, DISCORD_PUBLIC_KEY: 'khoá-sai' }),
    ).toThrow(/Biến môi trường không hợp lệ/);
  });

  it('chết khi thiếu hẳn DISCORD_PUBLIC_KEY', () => {
    const withoutKey: Partial<typeof base> = { ...base };
    delete withoutKey.DISCORD_PUBLIC_KEY;

    expect(() => validateEnv(withoutKey)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test env.validation
```
Kỳ vọng: FAIL — hai test mới không ném lỗi, vì schema chưa biết biến này.

- [x] **Bước 3: Thêm vào schema**

Trong `apps/api/src/config/env.validation.ts`, chèn ngay sau block `DISCORD_ADMIN_IDS`:

```ts
  /**
   * Discord Application public key (Developer Portal → General Information).
   * Verifies the Ed25519 signature on every interaction webhook — 64 hex characters.
   */
  DISCORD_PUBLIC_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'DISCORD_PUBLIC_KEY phải là 64 ký tự hex.'),
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test env.validation
```
Kỳ vọng: PASS, 4 test.

- [x] **Bước 5: Cập nhật `.env.example`**

Trong `apps/api/.env.example`, thay block Discord hiện có bằng:

```
# Discord OAuth2 — from https://discord.com/developers/applications
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback
# Rescue Discord IDs (comma-separated) — always granted ADMIN access
DISCORD_ADMIN_IDS=

# Discord bot — General Information → Public Key. 64 hex characters. Verifies that an interaction
# webhook really came from Discord; the API refuses to boot without it.
DISCORD_PUBLIC_KEY=

# Read only by `pnpm --filter api discord:register`, never by the running app — which is why
# neither is in env.validation.ts.
# Bot → Reset Token. Shown exactly once.
DISCORD_BOT_TOKEN=
# Discord server id. Enable Developer Mode, then right-click the server name → Copy Server ID.
DISCORD_GUILD_ID=
```

- [x] **Bước 6: Xác nhận app vẫn boot được**

```
pnpm --filter api dev
```
Kỳ vọng: log `API đang chạy tại http://localhost:3001/api`. Nếu chết vì thiếu biến → Task 0 bước 4
chưa làm. Dừng server sau khi xác nhận.

- [x] **Bước 7: Commit**

```bash
git add apps/api/src/config apps/api/.env.example
git commit -m "feat(api): require DISCORD_PUBLIC_KEY for interaction signature checks"
```

---

## Task 7: Guard, controller, module, raw body

**Files:**
- Create: `apps/api/src/modules/discord-bot/discord-bot.guard.ts`
- Create: `apps/api/src/modules/discord-bot/discord-bot.controller.ts`
- Create: `apps/api/src/modules/discord-bot/discord-bot.module.ts`
- Create: `apps/api/src/modules/discord-bot/discord-bot.public.ts`
- Create: `apps/api/src/modules/discord-bot/__tests__/discord-bot.guard.spec.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `isValidDiscordSignature` (Task 2), hằng số header (Task 3), `interactionSchema` (Task
  3), `routeInteraction` (Task 5), `RawResponse` (Task 1), `Env` (Task 6).
- Produces:
  - `DiscordSignatureGuard` (Injectable)
  - `DiscordBotController` — `POST /api/discord/interactions`
  - `DiscordBotModule`
  - `discord-bot.public.ts` re-export `commandDefinitions` cho Task 8

- [x] **Bước 1: Viết test thất bại cho guard**

Tạo `apps/api/src/modules/discord-bot/__tests__/discord-bot.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'node:crypto';

import type { Env } from '../../../config';
import { DiscordSignatureGuard } from '../discord-bot.guard';

/** Bytes of DER/SPKI before the raw 32-byte Ed25519 key. */
const SPKI_HEADER_LENGTH = 12;

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const publicKeyHex = publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(SPKI_HEADER_LENGTH)
  .toString('hex');

const timestamp = '1756700000';
const rawBody = '{"type":1}';

const signature = sign(
  null,
  Buffer.from(timestamp + rawBody),
  privateKey,
).toString('hex');

/**
 * Build a guard wired to the generated key pair.
 * @returns A guard reading `publicKeyHex` as DISCORD_PUBLIC_KEY
 */
function guard(): DiscordSignatureGuard {
  const config = {
    get: () => publicKeyHex,
  } as unknown as ConfigService<Env, true>;

  return new DiscordSignatureGuard(config);
}

/**
 * Build a fake ExecutionContext carrying the headers and raw body of a request.
 * @param headers - Request headers
 * @param body - Raw request body, as Nest's `rawBody` option provides it
 * @returns A context sufficient for the guard
 */
function contextFor(
  headers: Record<string, string>,
  body: Buffer | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, rawBody: body }),
    }),
  } as unknown as ExecutionContext;
}

describe('DiscordSignatureGuard', () => {
  it('cho qua request Discord ký đúng', () => {
    const context = contextFor(
      {
        'x-signature-ed25519': signature,
        'x-signature-timestamp': timestamp,
      },
      Buffer.from(rawBody),
    );

    expect(guard().canActivate(context)).toBe(true);
  });

  it('chặn request chữ ký sai bằng 401 — mã Discord bắt buộc', () => {
    const context = contextFor(
      {
        'x-signature-ed25519': 'f'.repeat(128),
        'x-signature-timestamp': timestamp,
      },
      Buffer.from(rawBody),
    );

    expect(() => guard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('chặn request thiếu header chữ ký', () => {
    const context = contextFor(
      { 'x-signature-timestamp': timestamp },
      Buffer.from(rawBody),
    );

    expect(() => guard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('chặn khi không có raw body — cấu hình rawBody đã bị gỡ mất', () => {
    const context = contextFor(
      {
        'x-signature-ed25519': signature,
        'x-signature-timestamp': timestamp,
      },
      undefined,
    );

    expect(() => guard().canActivate(context)).toThrow(UnauthorizedException);
  });
});
```

- [x] **Bước 2: Chạy test, xác nhận FAIL**

```
pnpm --filter api test discord-bot.guard
```
Kỳ vọng: FAIL — `Cannot find module '../discord-bot.guard'`.

- [x] **Bước 3: Viết guard**

Tạo `apps/api/src/modules/discord-bot/discord-bot.guard.ts`:

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import type { Env } from '../../config';
import {
  DISCORD_SIGNATURE_HEADER,
  DISCORD_TIMESTAMP_HEADER,
} from './discord.constants';
import { isValidDiscordSignature } from './verify-signature';

/**
 * The bot's only trust boundary: the interaction endpoint is public on the internet, and this
 * signature is the sole thing separating Discord from anyone else who found the URL.
 *
 * Everything that fails answers `401`. Discord itself sends a deliberately bad signature while
 * saving the endpoint URL and requires exactly that status; any other code and it refuses the URL.
 */
@Injectable()
export class DiscordSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Check the Ed25519 signature Discord put on the request.
   * @param context - Execution context, used to read headers and the raw body
   * @returns true when the signature matches this exact payload
   * @throws UnauthorizedException when a header is missing, the raw body is unavailable, or the
   *   signature does not match
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const signature = request.headers[DISCORD_SIGNATURE_HEADER];
    const timestamp = request.headers[DISCORD_TIMESTAMP_HEADER];

    // The signature covers the bytes as they arrived. Re-serialising the parsed body produces
    // different bytes, so without `rawBody: true` in main.ts nothing here can ever pass — fail
    // loudly rather than let a config regression look like Discord sending bad signatures.
    const rawBody = request.rawBody;

    if (
      typeof signature !== 'string' ||
      typeof timestamp !== 'string' ||
      rawBody === undefined
    ) {
      throw new UnauthorizedException('Chữ ký Discord không hợp lệ.');
    }

    const isValid = isValidDiscordSignature({
      publicKey: this.config.get('DISCORD_PUBLIC_KEY', { infer: true }),
      signature,
      timestamp,
      rawBody: rawBody.toString('utf8'),
    });

    // One sentence for every case: to Discord the distinction is irrelevant, to a prober it is free
    // information about which half of the check failed.
    if (!isValid) {
      throw new UnauthorizedException('Chữ ký Discord không hợp lệ.');
    }

    return true;
  }
}
```

- [x] **Bước 4: Chạy test, xác nhận PASS**

```
pnpm --filter api test discord-bot.guard
```
Kỳ vọng: PASS, 4 test.

- [x] **Bước 5: Viết controller**

Tạo `apps/api/src/modules/discord-bot/discord-bot.controller.ts`:

```ts
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { RawResponse } from '../../common';
import { DiscordSignatureGuard } from './discord-bot.guard';
import { interactionSchema } from './interaction.schema';
import { routeInteraction, type InteractionReply } from './interaction-router';

/**
 * The one endpoint Discord calls. Excluded from Swagger: it is not part of the api ↔ web contract
 * and the only client that may call it is Discord.
 */
@ApiExcludeController()
@Controller('discord')
@UseGuards(DiscordSignatureGuard)
export class DiscordBotController {
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
  handleInteraction(@Body() body: unknown): InteractionReply {
    return routeInteraction(interactionSchema.parse(body));
  }
}
```

- [x] **Bước 6: Viết module và public API**

Tạo `apps/api/src/modules/discord-bot/discord-bot.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { DiscordBotController } from './discord-bot.controller';
import { DiscordSignatureGuard } from './discord-bot.guard';

/** Wires the Discord interaction endpoint. No providers of its own beyond the guard. */
@Module({
  controllers: [DiscordBotController],
  providers: [DiscordSignatureGuard],
})
export class DiscordBotModule {}
```

Tạo `apps/api/src/modules/discord-bot/discord-bot.public.ts`:

```ts
/**
 * Public API of the discord-bot module.
 *
 * This is the only file outside the directory may import code from; everything else here is
 * internal (the module boundary rule in `eslint.config.mjs`). Today its one consumer is
 * `src/scripts/register-discord-commands.ts`.
 */
export { commandDefinitions } from './commands';
export type { SlashCommandDefinition } from './commands/command.types';
```

- [x] **Bước 7: Bật raw body ở `main.ts`**

Trong `apps/api/src/main.ts`, đổi dòng tạo app:

```ts
  // Discord signs the bytes it sent, so the interaction guard needs them unparsed. Nest keeps a
  // copy on `request.rawBody` only when this is on.
  const app = await NestFactory.create(AppModule, { rawBody: true });
```

- [x] **Bước 8: Đăng ký module**

Trong `apps/api/src/app.module.ts`, thêm import (giữ thứ tự alphabet, sau `CharactersModule`):

```ts
import { DiscordBotModule } from './modules/discord-bot/discord-bot.module';
```

Và thêm vào mảng `imports`, sau `TeamBuilderModule`:

```ts
    DiscordBotModule,
```

- [x] **Bước 9: Chạy toàn bộ test suite**

```
pnpm --filter api test
```
Kỳ vọng: PASS toàn bộ, kể cả `module-boundary.spec.ts`.

- [x] **Bước 10: Lint + typecheck + build**

```
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api build
```
Kỳ vọng: không lỗi.

- [x] **Bước 11: Kiểm tra endpoint từ chối request không ký**

Chạy `pnpm --filter api dev` ở một terminal, rồi:

```
curl -i -X POST http://localhost:3001/api/discord/interactions \
  -H 'Content-Type: application/json' -d '{"type":1}'
```
Kỳ vọng: `HTTP/1.1 401` và body chứa `Chữ ký Discord không hợp lệ.` Dừng server.

- [x] **Bước 12: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): expose the discord interactions endpoint behind a signature guard"
```

---

## Task 8: Script đăng ký lệnh lên Discord

**Files:**
- Create: `apps/api/src/scripts/register-discord-commands.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: `commandDefinitions` từ `discord-bot.public.ts` (Task 7).
- Produces: script `pnpm --filter api discord:register`.

Script nằm trong `src/` chứ không phải một thư mục `scripts/` ở gốc app: `tsconfig.json` chỉ include
`src/**/*` và `prisma/**/*`, và `lint` chỉ quét `src/**/*.ts`. Ngoài `src/` thì script không được
typecheck cũng không được lint. Ở trong `src/`, luật `boundaries` còn ép nó đi qua
`discord-bot.public.ts` thay vì thò tay vào `commands/index.ts`.

> **Ghi chú sau khi triển khai:** câu cuối trên **chỉ đúng từ commit `5d3e468`**. Lúc plan này được
> viết, `fileInternalPath` là extglob một tầng nên import vào file lồng trong module khác lọt qua
> lint hoàn toàn; lỗ hổng được phát hiện đúng ở bước 4 dưới đây và vá thành một commit riêng, kèm
> fixture `nested-target-violation.ts` khoá lại.

- [x] **Bước 1: Viết script**

Tạo `apps/api/src/scripts/register-discord-commands.ts`:

```ts
import { existsSync } from 'node:fs';

import { config } from 'dotenv';

import { commandDefinitions } from '../modules/discord-bot/discord-bot.public';

/** Env files in the same order ConfigModule reads them; the first value found wins. */
const ENV_FILES = ['.env.local', '.env'];

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Read one required variable, or explain exactly what to do about it.
 * @param name - Variable name
 * @returns Its value
 * @throws Error when the variable is missing or empty
 */
function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Thiếu ${name}. Thêm vào apps/api/.env — xem .env.example, và chạy lệnh từ thư mục gốc repo.`,
    );
  }

  return value;
}

/**
 * Replace the guild's command list with what `commands/index.ts` declares.
 *
 * Guild scope, not global: guild commands take effect immediately, global ones take up to an hour
 * to propagate, and the bot serves exactly one guild.
 *
 * Run by hand, never from CI: the list only changes when a command is added or renamed, and
 * Discord rate-limits this route hard.
 *
 * @returns Nothing; logs the registered names
 * @throws Error when a variable is missing or Discord rejects the request
 */
async function main(): Promise<void> {
  for (const file of ENV_FILES) {
    if (existsSync(file)) config({ path: file });
  }

  const applicationId = required('DISCORD_CLIENT_ID');
  const guildId = required('DISCORD_GUILD_ID');
  const botToken = required('DISCORD_BOT_TOKEN');

  const response = await fetch(
    `${DISCORD_API_BASE}/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandDefinitions),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Discord từ chối (${response.status}): ${await response.text()}`,
    );
  }

  const names = commandDefinitions.map((definition) => definition.name);
  console.log(`Đã đăng ký ${names.length} lệnh: ${names.join(', ')}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
```

- [x] **Bước 2: Thêm script vào `package.json`**

Trong `apps/api/package.json`, thêm ngay sau dòng `"db:seed": …`:

```json
    "discord:register": "ts-node src/scripts/register-discord-commands.ts",
```

- [x] **Bước 3: Cho phép `console` trong `src/scripts/`**

Trong `apps/api/eslint.config.mjs`, block cuối cùng đang mở `no-console` cho `prisma/**/*.ts`. Thêm
một block ngay sau nó:

```js
  {
    // Script chạy tay ngoài app — nó nói chuyện với người qua stdout, không qua logger của Nest.
    files: ['src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
```

- [x] **Bước 4: Lint + typecheck**

```
pnpm --filter api lint && pnpm --filter api typecheck
```
Kỳ vọng: không lỗi. Nếu `boundaries` kêu, script đang import thẳng `commands/index.ts` thay vì
`discord-bot.public.ts` — sửa import, đừng tắt luật.

- [x] **Bước 5: Chạy thật, đăng ký `/ping`**

```
pnpm --filter api discord:register
```
Kỳ vọng: `Đã đăng ký 1 lệnh: ping`. Mở Discord, gõ `/` trong server của bang — `/ping` phải hiện ra
trong danh sách gợi ý.

- [x] **Bước 6: Commit**

```bash
git add apps/api/src/scripts apps/api/package.json apps/api/eslint.config.mjs
git commit -m "feat(api): add a script registering slash commands with discord"
```

---

## Task 9: Chạy thử end-to-end qua tunnel

Không có code. Đây là bước duy nhất chứng minh chữ ký thật của Discord verify được — mọi test ở trên
đều dùng khoá tự sinh.

- [x] **Bước 1: Chạy API local**

```
pnpm --filter api dev
```

- [x] **Bước 2: Mở tunnel công khai**

```
cloudflared tunnel --url http://localhost:3001
```

(hoặc `ngrok http 3001`). Copy URL `https://…` nó in ra.

- [x] **Bước 3: Khai endpoint với Discord**

Developer Portal → application của bạn → General Information → **Interactions Endpoint URL** =
`https://<tunnel>/api/discord/interactions` → Save.

Kỳ vọng: Discord lưu thành công. **Nếu nó báo lỗi**, Discord vừa gửi một PING và một request chữ ký
cố tình sai; xem log của `pnpm --filter api dev`:

| Triệu chứng | Nguyên nhân |
|---|---|
| Không thấy request nào | Tunnel chưa trỏ đúng cổng 3001 |
| 401 cho cả PING hợp lệ | `DISCORD_PUBLIC_KEY` sai, hoặc `rawBody: true` chưa vào `main.ts` |
| 200 nhưng Discord vẫn từ chối | Response bị bọc `{ data }` — `@RawResponse()` chưa gắn trên route |
| 500 | Xem stack trong log, kèm `x-request-id` của response |

- [x] **Bước 4: Gõ lệnh thật**

Trong server Discord, gõ `/ping`.

Kỳ vọng: bot trả `Pong! Bot đang chạy.` trong kênh.

- [x] **Bước 5: Dọn**

Dừng tunnel và server. Endpoint URL trong Portal sẽ được thay bằng URL production ở Task 11.

Không có gì để commit.

---

## Task 10: Docs và xoá `apps/bot/`

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/development.md`
- Modify: `docs/production.md`
- Modify: `apps/api/CLAUDE.md`
- Delete: `apps/bot/` (toàn bộ)

- [x] **Bước 1: Xoá `apps/bot/`**

```bash
rm -r apps/bot
```

Thư mục chưa từng được commit (`git status` liệt kê nó là `??`), nên không có lịch sử nào mất. Nội
dung của nó mô tả một kiến trúc đã bị spec thay thế.

- [x] **Bước 2: `docs/architecture.md` §3.3 — bảng module**

Thêm một dòng cuối bảng module:

```
| `discord-bot` | Endpoint interactions của Discord, registry slash command | Chữ ký Ed25519 của Discord (không JWT) |
```

- [x] **Bước 3: `docs/architecture.md` §3.3 — bảng endpoint**

Thêm một dòng cuối bảng endpoint:

```
| `POST` | `/discord/interactions` | Nhận slash command từ Discord và trả lời | Chữ ký Ed25519 của Discord |
```

- [x] **Bước 4: `docs/architecture.md` §7 — bảng "where new behavior goes"**

Thêm một dòng:

```
| **A new Discord slash command** | Một file trong `src/modules/discord-bot/commands/`, thêm một dòng vào `commands/index.ts`, rồi `pnpm --filter api discord:register`. Không sửa gì khác. |
```

- [x] **Bước 5: `docs/development.md` §3 — bảng env**

Thêm ba dòng vào bảng biến môi trường của `apps/api`:

```
| `DISCORD_PUBLIC_KEY` | ✅ | Public Key của Discord Application (General Information), 64 ký tự hex. Xác thực webhook interaction. API không boot nếu thiếu. |
| `DISCORD_BOT_TOKEN` | Chỉ script | Bot → Reset Token. Chỉ `discord:register` đọc, không nằm trong `env.validation.ts`. |
| `DISCORD_GUILD_ID` | Chỉ script | ID server Discord của bang. Chỉ `discord:register` đọc. |
```

(Điều chỉnh số cột cho khớp bảng đang có trong file.)

- [x] **Bước 6: `docs/production.md` §3 — bảng env**

Thêm `DISCORD_PUBLIC_KEY` vào bảng biến của project `guild-manager-api`, ghi rõ: **required, phải
đặt trước khi deploy bản đầu tiên có bot, nếu không API không boot và cả web app cũng chết theo.**

`DISCORD_BOT_TOKEN` và `DISCORD_GUILD_ID` **không** đặt trên Vercel — chúng chỉ tồn tại trên máy
người chạy `discord:register`.

- [x] **Bước 7: `apps/api/CLAUDE.md` — luật viết lệnh mới**

Thêm một mục:

```markdown
## Discord bot

- Một lệnh là **một file** trong `src/modules/discord-bot/commands/`, chứa cả `definition` (thứ gửi
  lên Discord) lẫn `execute`. Thêm lệnh = thêm file + một dòng trong `commands/index.ts`.
- Logic nghiệp vụ **không** nằm trong file lệnh: gọi service của module khác qua `*.public.ts`, y
  như mọi module khác.
- Sau khi thêm hoặc đổi tên lệnh, chạy `pnpm --filter api discord:register`. Việc này chạy tay,
  không đưa vào CI.
- Discord bắt trả lời trong **3 giây**. Lệnh nào chạm database phải trả deferred (`type: 5`) trước;
  hôm nay chưa có nhánh đó trong router.
```

- [x] **Bước 8: Kiểm tra không còn tham chiếu tới `apps/bot`**

```
grep -rn "apps/bot" --include="*.md" --include="*.json" --include="*.yaml" --include="*.yml" . | grep -v node_modules
```
Kỳ vọng: chỉ còn các dòng trong spec (`docs/superpowers/specs/2026-09-01-discord-bot-design.md` §8
nói về việc xoá) và trong chính plan này. Không có dòng nào trong config hay CI.

- [x] **Bước 9: Commit**

```bash
git add -A docs apps/api/CLAUDE.md apps/bot
git commit -m "docs: document the discord bot module and drop the apps/bot placeholder"
```

---

## Trạng thái — HOÀN THÀNH 2026-09-02

**Task 1–11 đã xong và đã kiểm chứng trên production.** Không còn việc bắt buộc nào.

### Production đang chạy

- Application production: **Mèo Thư Ký** (`1541808162859131062`), tách khỏi application dev
  `mmgh-nth` — đúng nguyên tắc một application cho mỗi env file (commit `6ac0819`)
- Bot đã ở trong server `ฅ Mèo Mập ᨐ Giang Hồ ฅ` (`1176855207943094323`)
- `DISCORD_PUBLIC_KEY` đã đặt trên Vercel project `guild-manager-api`, scope Production
- Interactions Endpoint URL = `https://guild-manager-api.vercel.app/api/discord/interactions`
- `/ping` đã đăng ký guild scope cho application production; Discord xác nhận qua
  `GET /applications/{id}/guilds/{id}/commands` → `ping — Kiểm tra bot còn sống`
- Gõ `/ping` trong kênh trả `Pong! Bot đang chạy.`

Kiểm chứng production sau deploy:

```
GET  /api/health                 → 200          (API boot được ⇒ public key hợp lệ)
POST /api/discord/interactions   → 401 "Chữ ký Discord không hợp lệ."
```

### Đã chạy thật với application dev `mmgh-nth` (lịch sử, Task 9)

- Endpoint qua tunnel cloudflared, `/ping` trả lời đúng, log `POST /api/discord/interactions 200 - 1ms`
- **Tunnel đã tắt.** URL `https://squad-visual-suite-childhood.trycloudflare.com/...` còn lưu trong
  Portal của application dev là **URL chết** — gõ `/ping` qua application dev sẽ ra "The application
  did not respond". Bình thường, không phải hỏng. Dựng tunnel mới thì phải dán lại URL mới.

### PR

**https://github.com/minhhuy1201/guild-manager/pull/48** — đã merge (`b99ad91`, 2026-09-01 20:20 UTC).
CI trên `main` xanh toàn bộ, gồm `Migrate production database` rồi `Deploy API` đúng thứ tự.
Review độc lập: 0 Blocker, 2 Nit, verdict Approve; hai Nit đã xử lý ở `82180c3` trước khi merge.

### Việc tồn đọng từ review — ĐÃ XONG (commit `82180c3`, 2026-09-02)

Mục 1 và 2 đã làm trong một commit follow-up; mục 3 vẫn để lại đúng như lý do ghi bên dưới.

1. ✅ `interaction.schema.ts` — thêm một dòng comment: một interaction **có chữ ký hợp lệ nhưng thuộc
   type chưa xử lý** (`MESSAGE_COMPONENT`, autocomplete) sẽ ném `ZodError` thô, không phải
   `HttpException`, nên `AllExceptionsFilter` trả 500 và ghi log như một bug thật. Hôm nay không với
   tới được (chưa có nút bấm, chưa lệnh nào khai autocomplete), nhưng người đọc log sau này cần biết
   đó là hành vi dự kiến.
2. ✅ `discord-bot.guard.spec.ts` — thêm test cho trường hợp Express trả header trùng thành `string[]`:
   `headers: { 'x-signature-ed25519': [sig, sig] }` phải ném `UnauthorizedException`. Code đã xử lý
   đúng nhờ `typeof === 'string'`, nhưng chưa có test nào khẳng định. Đáng làm vì đây là biên tin
   cậy duy nhất của bot.
3. *(tuỳ)* `commands/index.ts` — chặn tên lệnh sai định dạng (phải thường, không khoảng trắng) ngay
   lúc dựng registry. Giá trị thấp khi mới một lệnh; làm khi có vài lệnh.

### Việc tồn đọng khác, không phải từ review

- Commit `eac687d` mang message *"add discord bot implementation plan"* nhưng thực chất chỉ chứa vài
  dòng sửa spec — file plan bị `.gitignore` chặn im lặng. Message sai nhưng commit không rỗng. Sửa
  thì phải viết lại lịch sử 13 commit; mình để nguyên, bạn quyết.
- Request bị guard chặn không đi qua logging interceptor, nên `401` không để lại dòng log nào và
  `requestId` trong response rỗng. Chấp nhận được khi bot có một lệnh; nên vá trước khi có nhiều.

### Khi quay lại — làm tiếp local

```bash
pnpm --filter api dev                                   # terminal 1
~/.local/bin/cloudflared tunnel --url http://localhost:3001   # terminal 2
```

Lấy URL `https://….trycloudflare.com` mới, dán lại vào Portal → application **mmgh-nth** → General
Information → Interactions Endpoint URL. URL đổi mỗi lần dựng tunnel; đó là cái giá của tunnel miễn
phí, không phải lỗi.

### Trình tự lên production đã thực hiện (giữ lại làm tham chiếu)

Thứ tự **không đảo được**, và bước 1 là bước duy nhất có thể làm sập cả trang web:

1. ✅ **`DISCORD_PUBLIC_KEY` của application production lên Vercel** project `guild-manager-api`.
   Thiếu nó, bản deploy sau khi merge sẽ không boot, và `apps/web` mất backend — cả site chết, không
   riêng bot.
2. ✅ Mời bot của application production vào server, scope `bot` + `applications.commands`.
3. ✅ `DISCORD_BOT_TOKEN` + `DISCORD_GUILD_ID` của application production vào `apps/api/.env.production`
   (file này git-ignored, không commit).
4. ✅ Merge PR → đợi CI deploy xong.
5. ✅ Portal → application **production** → Interactions Endpoint URL =
   `https://guild-manager-api.vercel.app/api/discord/interactions`.
6. ✅ `DISCORD_ENV_FILE=.env.production pnpm --filter api discord:register` — kiểm dòng log nó in ra có
   đúng application id của production không.
7. ✅ Gõ `/ping` trong server.

---

## Task 11: PR và đưa lên production

- [x] **Bước 1: Chạy đủ bộ kiểm tra CI ở local**

```
pnpm --filter api test && pnpm --filter api lint && pnpm --filter api format:check && pnpm --filter api typecheck && pnpm --filter api build
```
Kỳ vọng: xanh hết. Đây đúng những gì CI chạy — hỏng ở đây là hỏng ở đó.

- [x] **Bước 2: Xác nhận biến đã có trên Vercel** — `DISCORD_PUBLIC_KEY` đã đặt 2026-09-02

Task 0 bước 5. **Kiểm tra lại lần nữa trước khi merge.** Thiếu `DISCORD_PUBLIC_KEY` thì bản deploy
kế tiếp làm API không boot, và web app mất backend.

- [x] **Bước 3: Mở PR**

Nội dung theo `.github/pull_request_template.md`, tiêu đề:

```
feat(api): add discord bot interactions endpoint and /ping
```

- [x] **Bước 4: Sau khi merge và deploy xong, trỏ Discord về production**

Developer Portal → General Information → **Interactions Endpoint URL** =
`https://guild-manager-api.vercel.app/api/discord/interactions` → Save.

Discord gửi PING kiểm tra ngay lúc bấm Save; lưu được nghĩa là production đã chạy.

- [x] **Bước 5: Gõ `/ping` trong Discord**

Kỳ vọng: `Pong! Bot đang chạy.`

Lệnh đã được đăng ký ở Task 8 bước 5 và **không** cần đăng ký lại — registry nằm ở phía Discord,
không phụ thuộc bản deploy.

---

## Kiểm tra bao phủ spec

| Mục spec | Task |
|---|---|
| §3 chữ ký Ed25519 trên raw body, 401 | Task 2, Task 7 |
| §3 router giữ cả hai tầng switch | Task 5 |
| §4 không bọc `{ data }` | Task 1, Task 7 |
| §5 mỗi lệnh một file, `assertNever` | Task 4, Task 5 |
| §5 schema nằm trong module | Task 3 |
| §6 ba biến env, hai biến ngoài schema | Task 0, Task 6 |
| §7 script đăng ký theo guild, chạy tay | Task 8 |
| §8 xoá `apps/bot` | Task 10 |
| §9 chạy thử qua tunnel | Task 9 |
| §10 ba nhóm test | Task 2, Task 4, Task 5 |
| §11 thứ tự lên production | Task 11 |
| §12 docs | Task 10 |
| §13 phần cố ý không làm | Không có task — đúng chủ ý |
