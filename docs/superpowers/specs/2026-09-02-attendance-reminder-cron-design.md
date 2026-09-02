# Nhắc điểm danh tự động — cron một ngày trước hạn

Ngày: 2026-09-02 · Nhánh: `feat/attendance-reminder-cron`

## 1. Vấn đề

Điểm danh chỉ xảy ra khi có người nhớ ra. `/thong-bao` đăng lịch một lần đầu tuần và sau
đó không ai nhắc lại; ai bỏ lỡ thì bỏ lỡ, và admin phát hiện lúc quá hạn — khi cột đã
khoá và không sửa được nữa.

Mục tiêu: mỗi sáng, bot tự tìm những ngày đánh **có hạn chót vào ngày mai**, xem ai chưa
trả lời, và nhắc đích danh những người đó trong một channel do admin cấu hình.

## 2. Phạm vi

Trong phạm vi:

- Một cron chạy 09:00 giờ VN mỗi ngày, gọi vào một endpoint của API.
- Chọn ngày đánh theo luật "hạn chót rơi vào ngày mai", tìm người chưa có câu trả lời.
- Một message công khai mention đích danh, kèm nút **Điểm danh ngay** sẵn có.
- Bảng `BotChannel` + lệnh `/cau-hinh-kenh` để chọn channel nhận thông báo.
- Lệnh `/nhac-diem-danh` chạy tay đúng luồng đó.
- **Bỏ nút "Mở website"** khỏi `/thong-bao` (§3.7).

Ngoài phạm vi — cố ý không làm:

- **Không chống gửi trùng.** Không bảng "đã gửi hôm nay", không khoá. Vercel gọi cron hai
  lần là chuyện hiếm, và hậu quả là một cái ping thừa.
- Không nhắc cho tuần chưa mở, không nhắc lại lần hai trong ngày, không nhắc riêng tư
  qua DM.
- Không cho chỉnh giờ nhắc bằng lệnh. Giờ nằm trong `vercel.json`; đổi giờ là một PR.
- Không đụng vào luật deadline. Cron chỉ *đọc* `deadline`, không tính lại nó.

## 3. Quyết định thiết kế

### 3.1 Cron nằm ngoài process, không phải `@nestjs/schedule`

`apps/api` chạy như một Vercel Function, không phải process thường trú
(production.md §4). `@nestjs/schedule` cần một tiến trình sống để tick; ở đây không có
gì bảo đảm có instance nào đang chạy lúc 9h sáng. Một scheduler trong process sẽ hoặc
không bao giờ nổ, hoặc nổ đúng vào lúc tình cờ có request khác đánh thức instance — tức
là không xác định.

Nên lịch nằm ở nơi biết chắc mình chạy: khối `crons` trong `apps/api/vercel.json`.

```json
{ "crons": [{ "path": "/api/cron/attendance-reminder", "schedule": "0 2 * * *" }] }
```

`0 2 * * *` là **UTC** — Vercel không nhận timezone — tức 09:00 giờ VN.

Vercel gọi bằng **GET** và tự gắn `Authorization: Bearer $CRON_SECRET` khi biến đó tồn
tại, nên endpoint là `GET`, không phải `POST`. `CRON_SECRET` là biến env mới, **bắt
buộc** trong `env.validation.ts`: một endpoint gửi tin nhắn cho cả bang mà mở toang thì
ai cũng spam được, và theo quy tắc "misconfiguration fails loud", thiếu secret phải là
API không boot chứ không phải guard âm thầm cho qua.

Gói Hobby chỉ bảo đảm cron nổ **trong khoảng giờ đã hẹn**, không đúng phút — thực tế là
đâu đó trong 09:00–09:59 giờ VN. Chấp nhận được: mọi thứ luật này cần chỉ là "cùng một
ngày VN", và cả khoảng đó nằm gọn trong một ngày.

### 3.2 Luật chọn ngày đánh: hạn chót rơi vào ngày mai

Cron chạy mỗi sáng và tự hỏi *hôm nay nhắc cho ngày nào*. Câu trả lời không phải "ngày
đánh nào là ngày mai" mà **"ngày đánh nào có `deadline` rơi vào ngày mai"** — hạn chót
mới là thứ khoá cột lại, và nó không trùng ngày đánh:

| Ngày đánh | Hạn chót | Nhắc lúc |
|---|---|---|
| Bang Chiến, thứ 7 20:00 | thứ 5 17:00 (hệ thống sở hữu) | **9h sáng thứ 4** |
| Scrim thứ 5 20:30 | thứ 5 10:00 (trần trên) | **9h sáng thứ 4** |
| Scrim thứ 2 20:00 | thứ 2 10:00 | 9h sáng **Chủ nhật** |

Hai dòng đầu cho thấy vì sao một message chứ không phải mỗi ngày đánh một message: hạn
Bang Chiến và hạn scrim thứ 5 rơi cùng một ngày rất thường xuyên, và hai message là hai
lần ping cho cùng một việc.

Dòng thứ ba là lý do dùng `listByWeek()` (tuần đang mở) chứ không phải "tuần chứa hôm
nay": tuần sau mở lúc 22:00 thứ 7, nên đến sáng Chủ nhật `getActiveWeek` đã trả về tuần
mới, và ngày đánh thứ 2 nằm trong đó. Không có ngày đánh nào có hạn chót nằm ngoài tuần
đang mở.

Luật này là một luật lịch, nên nó sống ở nơi architecture.md §7 chỉ định cho luật lịch —
`session-schedule.ts` — dưới dạng `isReminderDay(deadline, now)`, so ngày dương lịch VN
của `deadline` với ngày dương lịch VN của `now + 1 ngày`. Không phải trong module bot.

**Không có gì để nhắc thì không gửi gì.** Không session nào tới hạn, hoặc mọi session tới
hạn đều đã đủ người trả lời → endpoint trả về `{ sent: false }` và im lặng. Một tin
"hôm nay không có gì" mỗi sáng là cách nhanh nhất khiến người ta tắt thông báo channel.

### 3.3 Mention phải nằm trong `content`, chi tiết nằm trong embed

Discord chỉ báo cho người bị mention khi mention nằm trong **văn bản message**; mention
đặt trong embed hiển thị đúng như một cái tên và không đánh thức ai. Đây chính là lý do
`/thong-bao` để `<@&role>` ở `content`.

Nên message chia đôi:

- `content` — một dòng nhắc, rồi **hợp** các `<@id>` của mọi người còn thiếu, mỗi người
  đúng một lần dù thiếu mấy ngày. Khoảng 30 thành viên × ~22 ký tự ≈ 700, an toàn dưới
  giới hạn 2000 ký tự. Nếu đặt mention theo từng ngày đánh, ba ngày là chạm trần.
- `embeds[0]` — chi tiết: mỗi ngày đánh một khối, hạn chót, và **tên** người thiếu. Tên
  ngắn hơn mention và không cần ping lần hai.

`allowed_mentions: { users: [...] }` mang đúng danh sách đó. Không phải để bật ping —
Discord ping sẵn — mà để đóng mọi thứ khác lại: tên nhân vật do admin nhập tay đi vào
embed, và `@everyone` lọt qua đó là chuyện có thể xảy ra. Trường `allowed_mentions` hiện
chỉ khai báo `roles`; nó nhận thêm `users`.

Một ngày đánh mà **không thiếu ai** thì biến mất khỏi message, không hiện "đủ rồi". Nội
dung của một tin nhắc là những gì còn thiếu.

### 3.4 Channel lưu trong bảng, keyed theo mục đích

```prisma
model BotChannel {
  purpose   String   @id
  channelId String
  updatedAt DateTime @updatedAt
}
```

Cùng khuôn với `TeamName`: cấu hình toàn cục, không treo vào thực thể nào, keyed bằng
chính thứ phân biệt các dòng. Hôm nay đúng một dòng, `purpose = 'ATTENDANCE_REMINDER'`,
hằng số trong code.

`purpose` là `String` chứ không phải Prisma enum vì mọi enum trong `schema.prisma` phải
đồng bộ với `packages/shared/enums` (architecture.md §2) — giá trị này không bao giờ đi
qua mạng tới web, nên bắt nó gánh nghĩa vụ đó là trả giá không đổi lại gì.

Không dùng bảng key-value kiểu `BotSetting { key, value }`: một cột `value` là `String`
sẽ nuốt mọi loại cấu hình tương lai với đủ kiểu dữ liệu và không cột nào tự mô tả được
mình. Cần cấu hình thứ hai khác kiểu thì đó là bảng thứ hai.

Chưa cấu hình channel không phải lỗi cấu hình lúc boot — admin có thể chưa chạy lệnh —
nên cron gặp bảng rỗng thì **log một dòng warn và dừng**, trả `{ sent: false }`. Nó khác
`CRON_SECRET` ở chỗ giá trị này không biết được lúc khởi động.

### 3.5 `/cau-hinh-kenh` lấy channel từ chính interaction, và thử quyền trước khi lưu

Lệnh không nhận option nào. Gõ ở channel nào thì chọn channel đó: `channel_id` nằm sẵn
trong payload interaction, đã được chữ ký Ed25519 phủ. Bắt admin bật Developer Mode rồi
copy ID vào một option TEXT là thêm ba bước và một chỗ gõ sai.

`interaction.schema.ts` vì thế nhận thêm `channel_id: z.string().min(1)` trên nhánh
`applicationCommand`. Discord luôn gửi trường này cho lệnh chạy trong server.

**Trước khi lưu, lệnh gửi thử một tin xác nhận vào channel đó.** Discord từ chối (bot
không nhìn thấy channel, hoặc thiếu quyền Send Messages) → lệnh trả lỗi và **không lưu**.
Nếu không thử, sai quyền chỉ lộ ra lúc 9h sáng hôm sau, trong một job không ai ngồi xem
log — mà lúc đó cái mất là một lần nhắc, không lấy lại được. Thử ngay biến một lỗi vận
hành âm thầm thành một câu trả lời trong chat.

### 3.6 Một client REST nhỏ, không phải thư viện

Đây là lần đầu bot **chủ động gọi** Discord: tới giờ nó chỉ trả lời webhook, và mọi
response đi ra theo đúng HTTP response của interaction. Gửi tin vào channel là một request
đi ra, cần bot token.

`DiscordRestClient` là một provider mỏng bọc `fetch` toàn cục, đúng một phương thức
`postMessage(channelId, payload)`, `Authorization: Bot ${DISCORD_BOT_TOKEN}`. Không thêm
`discord.js`: dự án cần một lời gọi `POST /channels/{id}/messages`, còn `discord.js` mang
theo một gateway WebSocket mà một Vercel Function không giữ được.

`DISCORD_BOT_TOKEN` đã có trong `.env.example` cho `discord:register`, nhưng script đó
chạy tay và tự đọc file env — biến chưa bao giờ đi qua `env.validation.ts`. Giờ nó là
**biến runtime bắt buộc**, vì thiếu nó thì cron chạy nhưng không gửi được gì. Hệ quả vận
hành: phải set trên host trước khi merge (§7).

### 3.7 Bỏ nút "Mở website" ở cả hai chỗ

Hướng đi đã chốt là điểm danh diễn ra **trong Discord**; website còn lại vai trò tra cứu.
Một nút "Mở website" đặt ngay cạnh "Điểm danh ngay" mời người ta rời khỏi chỗ việc đã làm
xong được, và mỗi lần rời đi là một lần phải đăng nhập.

Nên tin nhắc **không có** nút link, và nút link cũng bị gỡ khỏi `/thong-bao`. Hàng nút của
cả hai message còn đúng một cái: **✅ Điểm danh ngay**.

Việc này chạm vào code đã ship, kéo theo:

| Thứ | Xử lý |
|---|---|
| `announcement.ts` | `buildButtons` không còn nhận `webOrigin`; hàng nút còn một phần tử |
| `CommandLinks` | `webOrigin` biến mất, còn trơ `guildRoleId` → **bỏ hẳn type**, `CommandDeps` mang `guildRoleId: string` trực tiếp. Một object tên "links" mà không còn link nào là một cái tên nói dối |
| `LinkButton`, `BUTTON_STYLE.link` | Xoá. Không còn ai dùng, và `ButtonComponent` trở lại đúng `CustomIdButton`. Cần lại thì git còn đó |
| `announcement.spec.ts` | Bỏ test khẳng định link button mang `WEB_ORIGIN` |
| `2026-09-02-thong-bao-command-design.md` | **Sửa spec cũ** — §2, §3.7, §4, §5, §8 đang mô tả hai nút. Để nguyên là spec nói một đằng, code một nẻo |

`WEB_ORIGIN` **vẫn giữ**: nó là origin cho CORS, việc dựng nút chỉ là một chỗ dùng ghé.

### 3.8 Nút "Điểm danh ngay" tái dùng nguyên trạng, không thêm route

Tin nhắc dùng lại đúng hằng số `ANNOUNCEMENT_ATTENDANCE_ID` (`'ann:diem-danh'`). Nút không
mang dữ liệu: nó luôn nghĩa là "mở bảng điểm danh của **người bấm**", và người bấm là ai
thì nằm trong payload đã ký, không phụ thuộc message nào chứa nút.

`InteractionRouter` đã phân nhánh sẵn cho `custom_id` này và trả
`channelMessageWithSource` + cờ ephemeral — một message riêng tư **mới**. Đó là ràng buộc
sống còn ở đây: nếu nhánh đó trả `updateMessage`, người bấm đầu tiên sẽ **ghi đè tin nhắc
của cả bang** bằng bảng điểm danh của riêng mình. Nên phần code phải viết cho nút này
bằng không; cái phải thêm là một test khoá hành vi đó lại, và một câu sửa doc comment
trong `custom-id.ts` (nó đang nói nút chỉ nằm trên thông báo `/thong-bao`).

Bảng mở ra là bảng của cả tuần đang mở, không riêng ngày sắp tới hạn — người ta đã bấm
vào rồi thì trả lời luôn những ngày còn lại.

### 3.9 Nhãn hạn chót do `session-schedule.ts` dựng

Tin nhắc phải in hạn chót ra chữ ("17:00 · Thứ 5 (04/09)"). `WEEKDAY_NAMES` và cách ghép
nhãn đang nằm private trong `session-schedule.ts`, và architecture.md §7 nói mọi luật
tuần/deadline sống ở đó. Nên thêm `formatDeadlineLabel(deadline: Date): string` ngay
cạnh `formatSessionLabel`, export qua `battle-sessions.public.ts`, thay vì chép mảng tên
thứ sang module bot — quy ước nhãn thứ hai là đúng thứ spec `/thong-bao` đã từ chối tạo
ra một lần rồi.

### 3.10 Endpoint cron nằm trong `discord-bot`, sau guard riêng

`DiscordBotController` gắn `DiscordSignatureGuard` ở cấp class, còn endpoint cron xác
thực bằng bearer secret — hai cách xác thực khác nhau không chung một controller được.
Nên có `reminder.controller.ts` riêng, `@Controller('cron')`, sau `CronSecretGuard`.

Nó ở trong module `discord-bot` chứ không phải một module `cron` mới: tác dụng duy nhất
của endpoint là gửi một tin Discord, và mọi thứ nó gọi đều nằm trong module này. Một
module chỉ để giữ một route là một lớp không mang logic nào.

`CronSecretGuard` nằm trong module chứ không phải `common/guards/`: `common/` là chỗ cho
mối quan tâm xuyên suốt, và guard này có đúng một người dùng. Có endpoint cron thứ hai
thì lúc đó mới chuyển ra — theo đúng "Don't create guards speculatively".

## 4. Hình dạng message

```
⏰ **Nhắc điểm danh** — mấy ngày dưới đây hết hạn vào ngày mai.
@Mèo Béo @Cún Con @Gà Rán @Bún Chả
┌──────────────────────────────────────────
│ ⏰ CHƯA ĐIỂM DANH
│ ### 🛡️ Thứ 7 · 20:00 · Bang Chiến
│ ⏳ Hạn: 17:00 · Thứ 5 (03/09) · 👥 còn 5 người
│ Mèo Béo, Cún Con, Gà Rán
│ Chưa liên kết Discord: Chim Sẻ, Cá Kho
│
│ ### ⚔️ Thứ 5 · 20:30
│ ⏳ Hạn: 10:00 · Thứ 5 (03/09) · 👥 còn 1 người
│ Bún Chả
└─ Guild Manager
[ ✅ Điểm danh ngay ]
```

- Nhãn ngày đánh là `session.label` do backend dựng sẵn, không dựng lại. Icon 🛡️ khi
  `isGuildWar`, ⚔️ còn lại — cùng quy ước với `/thong-bao`.
- `👥 còn N người` đếm **mọi** người thiếu, kể cả người chưa liên kết Discord: con số đó
  là tiến độ điểm danh, không phải số người ping được.
- Dòng "Chưa liên kết Discord" chỉ xuất hiện khi có người như vậy. Họ không mention được
  nhưng vẫn phải hiện tên, nếu không thì hệ thống nhắc coi như họ không tồn tại và admin
  không bao giờ biết mà đi gắn ID cho họ.
- Các khối cách nhau một dòng trống — Discord dính heading vào dòng ngay trên nó.
- Toàn bộ thân nằm trong `description`; `EmbedPayload` vẫn không có `fields`, vì cùng lý
  do đã ghi trong spec `/thong-bao`.

## 5. Thay đổi theo file

| File | Thay đổi |
|---|---|
| `prisma/schema.prisma` + migration | `model BotChannel` |
| `src/config/env.validation.ts` | `CRON_SECRET: z.string().min(32)`, `DISCORD_BOT_TOKEN: z.string().min(1)` |
| `apps/api/.env.example` | `CRON_SECRET`, và chuyển `DISCORD_BOT_TOKEN` lên nhóm biến runtime |
| `apps/api/vercel.json` | Khối `crons` |
| `battle-sessions/session-schedule.ts` | `isReminderDay`, `formatDeadlineLabel` (+ export ở `battle-sessions.public.ts`) |
| `discord-bot/bot-channel.service.ts` | **Mới.** `get()` / `set(channelId)` trên `BotChannel` qua Prisma |
| `discord-bot/discord-rest.ts` | **Mới.** `DiscordRestClient.postMessage(channelId, payload)` |
| `discord-bot/reminder.ts` | **Mới.** Thuần: `buildReminder(dueSessions)` → `MessagePayload` |
| `discord-bot/reminder.service.ts` | **Mới.** Chọn session tới hạn, tìm người thiếu, gửi. Trả `{ sent, sessionCount, missingCount }` |
| `discord-bot/cron.guard.ts` | **Mới.** So `Authorization: Bearer` với `CRON_SECRET` |
| `discord-bot/reminder.controller.ts` | **Mới.** `GET /cron/attendance-reminder` |
| `discord-bot/discord-bot.module.ts` | Đăng ký 4 provider mới + controller mới |
| `discord-bot/commands/cau-hinh-kenh.command.ts` | **Mới** |
| `discord-bot/commands/nhac-diem-danh.command.ts` | **Mới** |
| `discord-bot/commands/index.ts` | Hai dòng |
| `discord-bot/commands/command.types.ts` | `CommandDeps` bỏ `links`, thêm `guildRoleId`, `reminders`, `channels`; `allowed_mentions.users`; xoá `LinkButton` (§3.7) |
| `discord-bot/interaction-router.ts` | Dựng `deps` mới; `channel_id` đi tiếp tới command |
| `discord-bot/interaction.schema.ts` | `channel_id` trên nhánh `applicationCommand` |
| `discord-bot/discord.constants.ts` | Xoá `BUTTON_STYLE.link` (§3.7) |
| `discord-bot/announcement.ts`, `custom-id.ts` | Bỏ nút link; sửa doc comment (§3.7, §3.8) |
| `docs/architecture.md` | Bảng endpoint, bảng module, `BotChannel` ở §5, một dòng ở §7 cho "một job chạy định kỳ" |
| `docs/development.md` §3, `docs/production.md` §3 | Hai biến env mới |
| `docs/production.md` | Mục vận hành cho cron + Data API grant cho bảng mới |
| `docs/superpowers/specs/2026-09-02-thong-bao-command-design.md` | Sửa theo việc bỏ nút link (§3.7) |

## 6. Luồng

**Cron, 09:00 VN:**

1. Vercel `GET /api/cron/attendance-reminder`, `Authorization: Bearer $CRON_SECRET`.
2. `CronSecretGuard` so secret → sai/thiếu là 401, có log.
3. `ReminderService.run()`:
   - `channels.get()` → chưa cấu hình thì warn + `{ sent: false }`.
   - `battleSessions.listByWeek()`, lọc `isReminderDay(session.deadline, now)`.
   - Không còn session nào → `{ sent: false }`.
   - `characters.listRows()` + `attendance.getRecords()`; với mỗi session, người thiếu là
     người không có record cho session đó.
   - Mọi session đều đủ người → `{ sent: false }`.
   - `buildReminder(dueSessions)` → `rest.postMessage(channelId, payload)`.
4. Trả `{ data: { sent, sessionCount, missingCount } }`.

**`/nhac-diem-danh`:** resolve actor → không admin thì ephemeral từ chối → gọi đúng
`ReminderService.run()` → trả lời riêng tư theo kết quả ("đã nhắc N người", "chưa cấu hình
channel", "không ai còn thiếu"). Cùng một hàm với cron, không phải bản sao.

**`/cau-hinh-kenh`:** resolve actor → không admin thì từ chối → `rest.postMessage` một tin
xác nhận vào `interaction.channel_id` → Discord từ chối thì trả lỗi và không lưu → thành
công thì `channels.set(channelId)` và trả lời riêng tư.

**Bấm "Điểm danh ngay":** không đổi gì so với hôm nay (§3.8).

**Lỗi:** `AllExceptionsFilter` đã bọc toàn bộ. Discord từ chối lời gọi REST → client ném
kèm status và body, filter log `error` với stack; cron trả 500 và Vercel ghi nhận lần chạy
thất bại.

## 7. Vận hành

1. Set **trước khi merge** trên Vercel project của api: `CRON_SECRET` (chuỗi ngẫu nhiên
   ≥32 ký tự) và `DISCORD_BOT_TOKEN`. Cả hai bắt buộc trong schema env — thiếu là API
   không boot, và PR chạm `apps/api` thì deploy ngay sau khi merge.
2. Migration `BotChannel` chạy trong CI trước khi deploy (CLAUDE.md, mục Shipping). Sau
   đó kiểm tra Data API grant cho bảng mới theo production.md §5.
3. Sau deploy: `pnpm --filter api discord:register`, và bản production với
   `DISCORD_ENV_FILE=.env.production`, để hai lệnh mới hiện trong chat box.
4. Chạy `/cau-hinh-kenh` trong channel muốn nhận thông báo. Bot phải nhìn thấy channel đó
   và có quyền Send Messages — lệnh sẽ báo ngay nếu không.
5. Kiểm chứng bằng `/nhac-diem-danh` thay vì chờ tới 9h sáng hôm sau.
6. Cron chỉ chạy trên deployment **production**; preview không có cron. Xem lần chạy gần
   nhất ở Vercel → project api → Cron Jobs.

## 8. Test

`apps/api/src/modules/discord-bot/__tests__/`:

- `reminder.spec.ts` — mỗi ngày đánh một heading `### ` riêng; icon theo `isGuildWar`;
  mention trong `content` chứ không trong embed; một người thiếu hai ngày chỉ xuất hiện
  **một lần** trong `content`; `allowed_mentions.users` khớp đúng danh sách đó; người
  không có `discordId` hiện ở dòng "Chưa liên kết Discord" và không lọt vào mention; số
  đếm `còn N người` tính cả người đó; hàng nút có đúng một nút và **không** có nút link.
- `reminder.service.spec.ts` — chưa cấu hình channel → không gọi REST, `sent: false`;
  không session nào tới hạn → không gọi REST; mọi session đủ người → không gọi REST;
  session tới hạn còn người thiếu → gọi REST đúng một lần với đúng channel.
- `cron.guard.spec.ts` — thiếu header, sai secret, sai scheme → 401; đúng → qua.
- `cau-hinh-kenh.command.spec.ts` — non-admin bị từ chối; Discord từ chối tin xác nhận →
  **không lưu** và trả lỗi; thành công → lưu đúng `channel_id` của interaction.
- `nhac-diem-danh.command.spec.ts` — non-admin bị từ chối; ba nhánh kết quả ra ba câu trả
  lời riêng tư khác nhau.
- `interaction-router.spec.ts` (bổ sung) — nút `ANNOUNCEMENT_ATTENDANCE_ID` vẫn trả
  `channelMessageWithSource` + ephemeral, **không** phải `updateMessage`.
- `announcement.spec.ts` (sửa) — bỏ test link button; khẳng định hàng nút còn đúng một nút.
- `interaction.schema.spec.ts` (bổ sung) — `channel_id` được đọc ra; thiếu nó thì payload
  lệnh bị từ chối tại biên.

`battle-sessions/__tests__/session-schedule.spec.ts`:

- `isReminderDay` — hạn 17:00 thứ 5 là ngày nhắc khi `now` là sáng thứ 4, không phải sáng
  thứ 3 hay sáng thứ 5; biên nửa đêm giờ VN tính đúng; hạn 10:00 thứ 2 nhắc vào Chủ nhật.
- `formatDeadlineLabel` — dựng đúng "17:00 · Thứ 5 (03/09)".

## 9. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Quên set `CRON_SECRET` / `DISCORD_BOT_TOKEN` → API chết sau merge | §7 bước 1; nêu trong PR body |
| Bot không có quyền post trong channel → nhắc rơi vào hư không | §3.5 thử gửi ngay lúc cấu hình; §7 bước 4 |
| Cron Hobby nổ muộn tới 09:59 | Luật chỉ cần đúng ngày VN (§3.1) |
| Cron nổ hai lần → ping trùng | Chấp nhận có ý thức (§2) |
| Nút trên tin nhắc ghi đè chính tin nhắc | §3.8; có test khoá kiểu phản hồi |
| Danh sách mention vượt 2000 ký tự | Mention là **hợp**, mỗi người một lần (§3.3); bang ~30 người còn cách trần gấp đôi |
| Quên `discord:register` → hai lệnh mới không hiện | §7 bước 3 |
| Bỏ nút link làm spec `/thong-bao` sai | §3.7 sửa spec đó trong cùng PR |
