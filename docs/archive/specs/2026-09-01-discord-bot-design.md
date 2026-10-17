# Discord Bot — Khung lệnh và lệnh `/ping` — Design

Ngày: 2026-09-01 · Phạm vi: `apps/api` (module mới `discord-bot`, ba sửa đổi nhỏ ở `common/`,
`config/`, `main.ts`, một script), xoá `apps/bot/`. Không đụng `apps/web`, `packages/shared`,
database.

Đợt này dựng **đường ống**: một lệnh Discord đi được từ ô chat tới `apps/api` và trả lời về, có chữ
ký được xác thực và có chỗ đặt lệnh tiếp theo. Lệnh `/ping` tồn tại để chứng minh đường ống chạy
thật, không phải để hữu ích.

## Bối cảnh

- [architecture.md](../../architecture.md) §3.2 (tầng), §3.3 (module + endpoint), §3.4 (hình dạng
  response, env), §7 (thêm hành vi mới ở đâu) — spec này thêm một dòng vào §3.3 và một dòng vào bảng
  endpoint.
- [production.md](../../production.md) §4 — Vercel build thẳng `src/main.ts`, nên thay đổi ở
  `main.ts` có hiệu lực trên production y như local.
- `apps/bot/README.md` và `apps/bot/CLAUDE.md` (chưa commit) mô tả bot là một app riêng nói chuyện
  với API qua HTTP. **Spec này thay thế cả hai file đó**; xem §8.

## 1. Hai kiểu bot, và vì sao chọn kiểu HTTP Interactions

Discord cho hai cách viết bot:

- **Gateway bot** — giữ một kết nối WebSocket thường trực, nghe mọi sự kiện của server (tin nhắn,
  reaction, ra vào voice). Cần một process chạy 24/7.
- **HTTP Interactions bot** — khai báo trước danh sách slash command; khi ai đó gõ lệnh, Discord gửi
  một `POST` tới endpoint của ta. Không cần process thường trực. Đổi lại chỉ nhận được slash
  command, button và select menu — **không** nghe được tin nhắn thường hay reaction — và phải trả
  lời trong 3 giây.

**Chọn HTTP Interactions.** Ba nhu cầu trong tầm nhìn của bot (điểm danh, nhắc team, nhắc cá nhân)
không cái nào cần nghe tin nhắn thường; phần nhắc theo lịch là cron gọi Discord REST API, cũng không
cần gateway. Đổi lại ta không phải dựng và trả tiền cho một chỗ host thứ hai — cả hệ thống vẫn nằm
trọn trên Vercel.

## 2. Bot là một module trong `apps/api`, không phải app riêng

Bề mặt thật của một HTTP Interactions bot là **một endpoint**. Dựng `apps/bot` cho nó có nghĩa là:
một project Vercel thứ ba phải deploy và theo dõi, một lượt xác thực máy-với-máy phải thiết kế và
bảo mật (bot chỉ biết Discord ID, trong khi mọi endpoint của API đứng sau `JwtAuthGuard` và role nằm
ở `Character.discordId` trong database), và một bản sao của config/lint/test convention phải bảo
trì.

Đặt nó thành `src/modules/discord-bot/` xoá sạch cả ba chi phí đó. Module gọi các module khác qua
`<domain>.public.ts` đúng như mọi module hiện có — không HTTP, không JWT, không token dịch vụ, không
guard thứ hai chạy song song với `JwtAuthGuard` (hai đường phân quyền là hai chỗ để lệch luật).

**Hệ quả phải chấp nhận:** một lệnh Discord chậm hoặc lỗi giờ chiếm tài nguyên của cùng Vercel
Function phục vụ web app. Chấp nhận được ở quy mô một bang hội; nếu sau này bot đủ nặng để cần tách,
ranh giới `discord-bot.public.ts` chính là đường cắt sẵn.

## 3. Biên tin cậy: chữ ký Ed25519 trên **bytes gốc**

Endpoint `POST /api/discord/interactions` là công khai trên Internet. Thứ duy nhất phân biệt Discord
với người lạ là chữ ký Ed25519 mà Discord đặt trong header:

| Header | Nội dung |
|---|---|
| `X-Signature-Ed25519` | Chữ ký, hex |
| `X-Signature-Timestamp` | Timestamp, cũng là một phần của thứ được ký |

`DiscordSignatureGuard` verify chữ ký của chuỗi `timestamp + rawBody` bằng `DISCORD_PUBLIC_KEY`.

- **Phải là raw body.** Body đã `JSON.parse` rồi `JSON.stringify` lại là một chuỗi bytes khác (thứ
  tự khoá, khoảng trắng, escape) → chữ ký luôn sai. Vì vậy `main.ts` đổi thành
  `NestFactory.create(AppModule, { rawBody: true })`.
- **Chữ ký sai trả đúng `401`.** Không phải 400, không phải 403. Discord dùng chính mã này khi kiểm
  tra endpoint lúc đăng ký URL; trả mã khác thì nó từ chối lưu URL.
- **Dùng `crypto.verify` của Node, không thêm dependency.** Việc này đúng khoảng mười dòng và test
  được bằng cặp khoá sinh tại chỗ. Một package chỉ để gói mười dòng đó là một dependency phải theo
  dõi advisory mà không đổi lại được gì.

Sau khi qua guard, body được Zod parse thành một union phân biệt theo `type`. Đây là dữ liệu bên thứ
ba đi vào, nên nó được validate tại chỗ nhận, đúng luật "Validate at boundaries".

`interaction-router.ts` là chủ của **cả hai** tầng switch: theo `type` trước (`1` PING → PONG, `2`
APPLICATION_COMMAND → tra registry), rồi theo tên lệnh. Controller không chứa nhánh nào — nó nhận
body đã parse và gọi router. Đặt nhánh PING ở controller thì logic Discord bị chia làm hai chỗ và
tầng duy nhất test được không còn phủ hết.

## 4. Response không được bọc `{ data }`

`TransformInterceptor` bọc mọi response thành `{ data: … }`. Discord đọc `type` ở **top level**; nhận
`{ data: { type: 1 } }` nó không hiểu, không báo lỗi, chỉ im lặng bỏ qua.

Thêm decorator `common/decorators/raw-response.decorator.ts`; `TransformInterceptor` bỏ qua route
gắn nó, y hệt cách interceptor đã bỏ qua route `@Redirect()` và vì cùng một lý do (Nest, ở đó, và
Discord, ở đây, đều đọc một khoá ở top level).

`AllExceptionsFilter` giữ nguyên — Discord chỉ nhìn status code.

## 5. Cấu trúc: mỗi lệnh là một file

```
apps/api/src/modules/discord-bot/
├── discord-bot.module.ts
├── discord-bot.controller.ts     # POST /discord/interactions — mỏng, chỉ gọi router
├── discord-bot.public.ts         # cửa duy nhất cho module khác — export commandDefinitions
├── discord-bot.guard.ts          # DiscordSignatureGuard
├── verify-signature.ts           # hàm pure, không biết gì về Nest
├── interaction-router.ts         # switch theo type, rồi theo tên lệnh; kết thúc assertNever
├── discord.constants.ts          # InteractionType / InteractionResponseType
├── interaction.schema.ts         # Zod cho payload Discord gửi tới
├── commands/
│   ├── command.types.ts          # interface SlashCommand { definition, execute }
│   ├── index.ts                  # registry — mảng command
│   └── ping.command.ts
└── __tests__/
    ├── verify-signature.spec.ts
    ├── interaction-router.spec.ts
    └── ping.command.spec.ts

apps/api/src/scripts/register-discord-commands.ts
```

**Một lệnh = một file**, chứa cả phần khai báo gửi lên Discord (`definition`) lẫn phần xử lý
(`execute`). Thêm lệnh mới là tạo một file và thêm một dòng vào `commands/index.ts`; không file nào
khác phải sửa. Router kết thúc bằng `assertNever`, nên quên đăng ký một lệnh là **lỗi biên dịch**
chứ không phải một request trả 200 rỗng lúc chạy.

**`interaction.schema.ts` nằm trong module, không vào `packages/shared`** — cố ý đi ngược thói quen
của repo. Luật "mọi shape qua mạng thuộc `packages/shared`" là cho hợp đồng **api ↔ web**. Payload
này do **Discord** định nghĩa và `apps/web` không bao giờ chạm tới; đưa vào shared là giả vờ ta sở
hữu một hình dạng mà ta chỉ đang đọc.

## 6. Biến môi trường

| Biến | Ai đọc | Ghi chú |
|---|---|---|
| `DISCORD_PUBLIC_KEY` | Runtime (guard) | Developer Portal → General Information → Public Key. 64 ký tự hex; Zod kiểm đúng dạng đó. **Vào `env.validation.ts`.** |
| `DISCORD_BOT_TOKEN` | Chỉ script §7 | Portal → Bot → Reset Token, chỉ hiện một lần. **Không** vào `env.validation.ts`. |
| `DISCORD_GUILD_ID` | Chỉ script §7 | ID server Discord của bang. |
| `DISCORD_ENV_FILE` | Chỉ script §7 | File env script đọc, mặc định `.env`. Xem §7.1. |

Hai biến sau **cố ý nằm ngoài schema env**, đúng tiền lệ `DIRECT_DATABASE_URL`: runtime không bao
giờ đọc chúng, nên bắt chúng có mặt là chặn boot vô cớ. Script tự validate và tự báo lỗi rõ ràng khi
thiếu.

`DISCORD_CLIENT_ID` đã có sẵn cho OAuth và **chính là Application ID** mà script cần — không thêm
biến trùng nghĩa.

Cả ba vào `.env.example`, và vào bảng env của [development.md](../../development.md) §3 và
[production.md](../../production.md) §3.

## 7. Đăng ký lệnh lên Discord

Discord không tự biết bot có lệnh gì. Phải `PUT` danh sách lên trước thì `/ping` mới hiện trong ô
chat.

`pnpm --filter api discord:register` chạy `src/scripts/register-discord-commands.ts`, gửi registry
trong `commands/index.ts` tới
`PUT /applications/{DISCORD_CLIENT_ID}/guilds/{DISCORD_GUILD_ID}/commands` với header
`Authorization: Bot <DISCORD_BOT_TOKEN>`.

- **Đăng ký theo guild, không global.** Lệnh guild có hiệu lực tức thì; lệnh global mất tới một giờ
  để lan. Bot phục vụ đúng một bang nên phạm vi guild không mất gì.
- **Chạy tay, không đưa vào CI.** Việc này chỉ cần khi thêm hoặc đổi tên lệnh, và Discord rate-limit
  nặng — chạy mỗi lần deploy là tự chuốc `429`.

### 7.1 Hai Discord Application, chọn bằng `DISCORD_ENV_FILE`

Phát hiện trong lúc triển khai: `.env` và `.env.production` đang trỏ tới **hai application khác
nhau**. Bản đầu của spec này coi bot là một application duy nhất, và điều đó sai.

Hệ quả là mỗi môi trường có public key riêng, bot token riêng, lời mời bot riêng, và — chỗ đau nhất
— **một Interactions Endpoint URL riêng**. Một application chỉ giữ được đúng một URL, nên nếu dùng
chung thì lúc cắm tunnel để dev là toàn bộ lệnh thật của bang bị đẩy về máy cá nhân.

Script vì vậy chọn file theo đúng khuôn `PRISMA_ENV_FILE` đã có:

```
pnpm --filter api discord:register                          → .env
DISCORD_ENV_FILE=.env.production pnpm --filter api discord:register → .env.production
```

**Đúng một file được nạp, không bao giờ trộn.** File được chỉ định mà không tồn tại là lỗi, không
phải cái cớ để rơi về `.env` — rơi về `.env` nghĩa là đăng ký lệnh của production lên application
dev, thành công, và không báo cho ai. Script in ra application id và guild id nó vừa nhắm tới, vì
với hai application thì nhắm nhầm trông y hệt nhắm đúng.

## 8. Xoá `apps/bot/`

Thư mục chưa commit và nội dung của nó (`README.md`, `CLAUDE.md`) mâu thuẫn trực tiếp với §2. Xoá
hẳn, không giữ lại vỏ: `pnpm-workspace.yaml` quét `apps/*`, nên một thư mục ở đó mà không phải
package là một cái bẫy cho người đọc sau. Nội dung còn giá trị chuyển về đúng chỗ — mô tả kiến trúc
vào `docs/architecture.md`, luật viết lệnh vào `apps/api/CLAUDE.md`.

## 9. Chạy thử ở local

Discord gọi **vào** máy, nên `localhost` không đủ; cần một URL công khai:

```
cloudflared tunnel --url http://localhost:3001
```

Dán `https://<tunnel>/api/discord/interactions` vào Portal → General Information → **Interactions
Endpoint URL**. Discord gửi ngay một PING để kiểm tra, và **từ chối lưu URL nếu chữ ký xử lý sai** —
đó là bài kiểm tra tích hợp đầu tiên, không phải viết gì thêm.

## 10. Test

Jest, `__tests__/` cạnh module:

| File | Kiểm gì |
|---|---|
| `verify-signature.spec.ts` | Sinh cặp khoá Ed25519 thật bằng `crypto.generateKeyPairSync`, ký payload thật → pass. Đổi một byte trong body → fail. Đổi timestamp → fail. Chữ ký không phải hex → fail chứ không ném. Không mock gì. |
| `interaction-router.spec.ts` | `type: 1` (PING) → trả `type: 1` (PONG). Tên lệnh lạ → ném lỗi có thông điệp rõ, không trả 200 im lặng. |
| `ping.command.spec.ts` | `execute` trả `type: 4` và đúng nội dung. |

Không test controller qua HTTP: repo không còn harness e2e (architecture.md §7).

## 11. Thứ tự đưa lên production

Có ràng buộc thứ tự không đảo được, vì trước lần deploy đầu chưa tồn tại URL để dán:

```
merge PR → CI deploy apps/api → dán Interactions Endpoint URL vào Portal → pnpm --filter api discord:register
```

Không có migration nào trong đợt này, nên bước `migrate` của pipeline chạy rỗng.

## 12. Docs phải sửa cùng commit

- `docs/architecture.md` — §3.3 thêm dòng module `discord-bot` và dòng endpoint
  `POST /discord/interactions` (Access: chữ ký Discord).
- `docs/development.md` §3 và `docs/production.md` §3 — bảng env.
- `apps/api/CLAUDE.md` — luật viết một lệnh mới.
- Xoá `apps/bot/`.

## 13. Cố ý không làm đợt này

Cron nhắc nhở · gọi `attendance` / `characters` · xử lý button và select menu · deferred response
(`type: 5`) · rate limit riêng cho endpoint interactions.

Ghi chú cho đợt sau, không phải bây giờ: Discord bắt trả lời trong **3 giây**. `/ping` thuần thì dư
sức, nhưng lệnh nào chạm database sẽ phải trả `type: 5` (deferred) trước rồi cập nhật nội dung sau
qua REST — lúc đó router cần thêm một nhánh và bot cần `DISCORD_BOT_TOKEN` ở runtime, tức biến đó
mới phải chuyển vào `env.validation.ts`.
