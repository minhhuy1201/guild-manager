# Discord — lệnh `/diem-danh` và `/diem-danh-ho` — Design

Ngày: 2026-09-02 · Phạm vi: `apps/api` (module `discord-bot` mở rộng, `attendance` và `auth` mỗi
module thêm một cửa public, `AttendanceModule` export service của nó). Không đụng `apps/web`,
`packages/shared`, database, migration.

Đợt trước dựng **đường ống** (`docs/superpowers/specs/2026-09-01-discord-bot-design.md`): một slash
command đi được từ ô chat Discord tới `apps/api` và trả lời về. Đợt này cho đường ống đó chạm vào
**dữ liệu thật** — điểm danh ngay trong Discord, không phải mở website.

## Bối cảnh

- [architecture.md](../../architecture.md) §3.2 (tầng), §3.3 (module + endpoint), §5 (data model),
  §6 (luật tuần/deadline), §7 (thêm hành vi mới ở đâu). Spec này **không** thêm endpoint nào: cả hai
  lệnh đi qua `POST /discord/interactions` đã có.
- `2026-09-01-discord-bot-design.md` — khung lệnh, guard chữ ký, `commands/index.ts`.
- `2026-08-24-discord-oauth-diem-danh-design.md` — `Character.discordId` là khoá định danh, do admin
  điền tay; `DISCORD_ADMIN_IDS` là đường cứu hộ.

## 1. Hai lệnh

| Lệnh | Ai gọi được | Làm gì |
|---|---|---|
| `/diem-danh` | Mọi thành viên đã được gán `discordId` | Điểm danh cho **chính mình** |
| `/diem-danh-ho nguoi:@ai-đó` | Chỉ ADMIN | Điểm danh **thay** người được mention |

Cả hai trả về cùng một bảng: phần chữ liệt kê mọi ngày đánh của tuần đang mở kèm câu trả lời hiện
tại, phía dưới là các hàng nút `Có` / `Không`. Bấm nút là ghi ngay, rồi chính tin nhắn đó được vẽ
lại với trạng thái mới.

**Ai thấy tin nhắn thì khác nhau, và đó là chủ ý:**

- `/diem-danh` — **ephemeral**, chỉ người gọi thấy. Bảng của chính mình, cả kênh không cần xem.
- `/diem-danh-ho` — **công khai cả kênh**, và nhắc tên người được điểm danh để họ nhận thông báo.
  Discord chỉ cho **đúng một** người xem tin ephemeral, nên "để người được điểm danh hộ cũng thấy"
  và "ephemeral" là hai thứ loại trừ nhau. Nút công khai vẫn an toàn: mọi lượt bấm đều đi lại qua
  `AttendanceService.mark`, nên người ngoài bấm hộ ai đó sẽ bị từ chối, còn chính chủ thì tự sửa
  được câu trả lời của mình — một tính năng, không phải lỗ hổng. Riêng **lời từ chối vẫn ephemeral**:
  chỉ người gõ lệnh cần đọc chúng, và điều đó áp dụng cho **cả lượt bấm nút**. Từ chối bằng
  `updateMessage` sẽ thay nội dung bảng công khai bằng một câu chỉ dành cho một người — tức là một
  người ngoài bấm nhầm sẽ xoá bảng của cả kênh. Nên `handleAttendanceButton` trả về một kết quả có
  tag: `board` thì vẽ lại tin nhắn, `refusal` thì gửi tin riêng.

  Discord **không** cho phép tắt nút theo từng người xem: một tin nhắn mang đúng một bộ component
  cho tất cả mọi người, nên `disabled` sẽ tắt cả với admin lẫn chính chủ. Thứ duy nhất làm được là
  nói trước bảng dành cho ai — bảng công khai kèm một dòng subtext `Chỉ <@…> và admin bấm được các
  nút này.` Bảng ephemeral không mang dòng đó: người xem duy nhất của nó đương nhiên được bấm. Bảng
  của một tuần chưa có ngày đánh nào cũng không, vì lúc đó nó không mang cái nút nào.

  Một hệ quả đã biết của việc dùng chung một tin nhắn: bảng được vẽ lại theo quyền của **người vừa
  bấm**. Nên sau khi chính chủ (member) bấm một lần, các hàng nút của ngày đã quá hạn biến mất, vì
  member không thao tác được trên đó — admin muốn lấy lại thì gõ lại lệnh. Nhét "admin mở bảng này"
  vào `custom_id` sẽ chữa được phần hiển thị, nhưng `custom_id` là dữ liệu client, nên rốt cuộc chỉ
  bày ra những cái nút mà service sẽ từ chối. Đổi chác đó tệ hơn là thỉnh thoảng gõ lại lệnh.

```
## Điểm danh · Mèo Béo (@meobeo)

⬜ **Thứ 5 · 20:30** · gặp ABC — chưa trả lời
✅ **Thứ 7 · Bang Chiến** — **CÓ**
❌ **Chủ nhật · 21:00** — **KHÔNG** · đã quá hạn

-# Bấm "Không" ở đây sẽ xoá lý do vắng đã ghi trên web.

[ Thứ 5 · 20:30 · Có ] [ Thứ 5 · 20:30 · Không ]     <- cả hai xám
[ ✔ Thứ 7 · Bang Chiến · Có ] [ Thứ 7 · ... · Không ] <- chỉ "Có" xanh
```

Discord xếp **toàn bộ** action row xuống dưới khối chữ chứ không xen kẽ theo từng ngày, nên tên ngày
bắt buộc phải nằm trong nhãn nút — bỏ đi thì năm hàng nút trông y hệt nhau.

## 2. Những gì đã chốt, và vì sao

- **`/diem-danh-ho` chỉ dành cho ADMIN.** Đây đúng là luật `AttendanceService.mark` đang áp dụng cho
  website. Bot **không** nới luật nào: nó là một đường ghi mới lên cùng một service, không phải một
  bộ luật thứ hai. Member gọi lệnh này sẽ nhận đúng câu từ chối mà API vẫn trả.
- **Không nhập lý do vắng mặt trên Discord.** Bấm `Không` là ghi luôn với `reason = null`. Muốn kèm
  lý do thì vào website. Đổi lại bot không phải xử lý modal, và một lượt điểm danh là một lượt bấm.

  **Hệ quả phải nói ra:** `AttendanceService.mark` quyết định `reason` từ chính request, nên ai đã
  ghi lý do trên web rồi bấm `Không` lần nữa trong Discord sẽ **mất câu lý do đó**. Chấp nhận, vì
  cách duy nhất để tránh là đổi luật của service — tức đổi luôn hành vi của web, cho một trường hợp
  hiếm. Bảng trong Discord nói thẳng điều này ở dòng cuối, để không ai mất dữ liệu mà không biết.
- **Chọn người bằng mention**, không phải gõ tên nhân vật. Hệ quả đã biết và chấp nhận: không điểm
  danh hộ được cho ai chưa được gán `discordId`, hoặc không ở trong server Discord. Bot nói thẳng
  điều đó thay vì im lặng.
- **Nút cho từng ngày**, không phải select menu chọn ngày rồi mới trả lời: xem được toàn cảnh tuần
  và điểm danh nhiều ngày trong một lần gọi lệnh.

## 3. Ba loại interaction bot phải hiểu

Hôm nay `interaction.schema.ts` chỉ nhận `PING` (1) và `APPLICATION_COMMAND` (2). Thêm:

| Loại | Số | Khi nào | Bot trả lời bằng |
|---|---|---|---|
| `APPLICATION_COMMAND` | 2 | Gõ `/diem-danh` | `CHANNEL_MESSAGE_WITH_SOURCE` (4) + cờ ephemeral (64) |
| `MESSAGE_COMPONENT` | 3 | Bấm một nút | `UPDATE_MESSAGE` (7) — vẽ lại chính tin nhắn đó |

`UPDATE_MESSAGE` chứ không phải gửi tin mới: người dùng bấm ba ngày thì vẫn chỉ có một tin nhắn,
luôn hiển thị trạng thái mới nhất. Cả hai hằng số vào `discord.constants.ts` cạnh những cái đã có.

`interactionSchema` vẫn là `discriminatedUnion('type', …)`, thêm một nhánh. Một `type` không có
trong danh sách vẫn bị chặn ngay tại biên như hôm nay.

**Định danh người gọi.** Discord đặt nó ở `member.user.id` khi lệnh chạy trong server, ở `user.id`
khi chạy trong DM. Schema nhận cả hai dạng optional, và một helper `callerDiscordId(interaction)`
đọc ra một giá trị; không có giá trị nào là lỗi cấu hình, không phải lỗi người dùng.

**Option của lệnh.** `SlashCommandDefinition` thêm trường `options` không bắt buộc, đúng hình dạng
Discord chờ (`{ name, description, type, required }`). `/diem-danh-ho` khai báo một option kiểu
`USER` (6) tên `nguoi`. Phía interaction, `data.options` là mảng `{ name, type, value }` — bot chỉ
đọc `value` của `nguoi`, tức Discord ID của người được mention.

## 4. Lệnh nhận dependency qua tham số, không phải qua DI

Hôm nay `SlashCommand.execute(interaction)` là hàm **thuần, đồng bộ, không phụ thuộc gì**; `/ping`
trả lời từ bộ nhớ. Hai lệnh mới phải đọc database.

Ràng buộc thật: `src/scripts/register-discord-commands.ts` import `commandDefinitions` **mà không
boot Nest**. Biến mỗi lệnh thành một provider Nest sẽ buộc script đó phải dựng cả ứng dụng chỉ để
đọc tên lệnh, hoặc phải tách `definition` khỏi handler — mất chính tính chất "thêm lệnh = một file +
một dòng" mà đợt trước dựng lên.

Nên chữ ký đổi thành:

```ts
execute(interaction: ApplicationCommandInteraction, deps: CommandDeps): Promise<CommandReply>
```

- `CommandDeps` là một interface khai trong `commands/command.types.ts`, gom đúng những service các
  lệnh cần: `attendance`, `battleSessions`, `characters`, `actorResolver`.
- `commands/index.ts` vẫn là mảng object thuần; `commandDefinitions` vẫn import tĩnh được.
- `routeInteraction` trở thành `InteractionRouter`, một `@Injectable` inject các service kia và bó
  chúng thành `CommandDeps` một lần. Controller inject router thay vì gọi hàm module-level.
- `/ping` đổi tối thiểu: `async`, nhận `deps` và không dùng.
- Test một lệnh vẫn là gọi `execute()` với một object `deps` giả — không cần dựng Nest testing
  module.

Hàm xử lý nút không nằm trong `SlashCommand`: nó là một `handleButton(interaction, deps)` riêng
trong `attendance-board.ts` (§5), vì một lần bấm không thuộc về lệnh nào cả — nút do `/diem-danh` và
`/diem-danh-ho` cùng sinh ra.

## 5. Bảng điểm danh là một thứ dựng được, không phải một trạng thái lưu lại

Cả ba đường vào — gõ `/diem-danh`, gõ `/diem-danh-ho`, bấm một nút — kết thúc ở **cùng một hàm**:

```ts
buildAttendanceBoard(targetCharacterId, actor, deps): Promise<CommandReply>
```

Nó đọc lịch tuần đang mở, đọc các `AttendanceRecord` của nhân vật đó, rồi dựng chữ + nút. Không có
state nào sống giữa hai lần bấm: mỗi lần bấm ghi xong lại dựng lại từ database. Đó là lý do tin
nhắn không bao giờ lệch với dữ liệu thật, kể cả khi người khác vừa sửa trên website.

**Chữ** liệt kê **mọi** ngày đánh của tuần kèm trạng thái (`chưa trả lời` / `Có` / `Không`, thêm
`đã quá hạn` khi hợp).

**Nút** chỉ dựng cho những ngày người gọi còn ghi được: member là ngày chưa quá hạn, admin là mọi
ngày (admin bypass deadline — luật §6 architecture.md, giữ nguyên). Discord chỉ cho **5 action row
mỗi tin nhắn**, mỗi ngày chiếm một row, nên nếu số ngày còn ghi được vượt 5 thì lấy 5 ngày sớm nhất
theo `dateTime` và phần chữ nói rõ những ngày còn lại phải điểm danh trên web. Một tuần 6 trận là
hiếm; im lặng cắt mất một ngày thì không chấp nhận được.

**Nhãn nút** là `<nhãn ngày> · Có` / `<nhãn ngày> · Không`, dùng thẳng `label` mà API đã dựng từ
`formatSessionLabel` (`Thứ 5 · 20:30`, `Thứ 7 · Bang Chiến`). Trần 80 ký tự của Discord còn rất xa,
và dùng lại nhãn có sẵn thì nút với dòng chữ phía trên không thể gọi cùng một ngày bằng hai tên.

**Màu nút mã hoá trạng thái, không mã hoá ý nghĩa.** Câu trả lời chưa được chọn luôn là `secondary`
(xám); đúng một nút mỗi hàng được tô màu — cái đang có hiệu lực — và nó mang thêm dấu `✔` ở đầu
nhãn. Bản đầu tiên tô xanh "Có" và đỏ "Không" cùng lúc, nên **lúc nào cả hai nút cũng sáng** và
không còn gì nói cho người dùng biết họ đã chọn cái nào; nút đỏ sáng lên còn bị đọc thành "tôi đã
chọn Không". Cũng vì thế **không nút nào bị `disabled`**: Discord vẽ nút disabled thành mờ, đọc ra
"không bấm được" chứ không phải "đây là lựa chọn của bạn" — hai tín hiệu ngược nhau. Bấm lại đúng
câu trả lời cũ là vô hại (`mark` là upsert).

**Phần chữ** dùng markdown của Discord: một heading `##`, mỗi ngày một dòng mở đầu bằng emoji trạng
thái (`⬜` chưa trả lời, `✅` Có, `❌` Không) với tên ngày in đậm, và dòng cảnh báo xoá lý do đặt ở
`-#` (subtext) để có mặt mà không tranh chấp với các câu trả lời.

Dòng đầu nêu tên nhân vật, kèm mention khi nhân vật đó có `discordId` — với `/diem-danh-ho` đó chính
là cách người được điểm danh hộ nhận được thông báo, và nó cũng khiến admin không ghi nhầm người sau
khi gọi lệnh vài lần.

**`custom_id` của nút** mang đủ ngữ cảnh vì Discord không giữ hộ gì cả:

```
dd:<sessionId>:<characterId>:<1|0>
```

Giới hạn 100 ký tự: `sessionId` là cuid (25) hoặc `gw-YYYY-MM-DD` (13), `characterId` là slug tên +
hậu tố ngẫu nhiên. Còn dư, nhưng một tên rất dài vẫn có thể chạm trần — nên hàm dựng `custom_id`
kiểm tra độ dài và ném lỗi rõ ràng thay vì để Discord từ chối cả tin nhắn.

**`custom_id` là dữ liệu do client gửi lại, không phải bằng chứng.** `characterId` trong đó có thể bị
sửa. Bot **không** tin nó: `AttendanceService.mark` vẫn nhận `actor` dựng từ Discord ID của người
đang bấm (chữ ký Ed25519 bảo chứng), và chính service từ chối nếu người đó không phải admin mà lại
ghi cho nhân vật khác. Không có kiểm tra quyền nào được viết lại trong bot.

## 6. Actor: từ Discord ID ra `JwtPayload`

`AttendanceService.mark(input, actor)` nhận một `JwtPayload` (`{ sub, role, type }`). Bot không có
JWT — nó có một Discord ID đã được chữ ký bảo chứng. Cần dựng `actor` từ đó, và luật phải **đúng
bằng** luật đăng nhập, nếu không quyền trên bot sẽ trôi khỏi quyền trên web.

Luật đó hôm nay nằm trong `AuthService`, một phần ở method `private isRescueAdmin`, một phần là biểu
thức `isRescue ? ADMIN : (member?.role ?? MEMBER)` viết thẳng trong `describeSession`. Chép lại nó
sang `discord-bot` là cách chắc chắn nhất để hai bên lệch nhau sau này.

Nên tách ra hai hàm **thuần** trong file mới `src/modules/auth/actor-identity.ts`:

- `isRescueAdmin(discordId, adminIdsRaw)` — tách chuỗi `DISCORD_ADMIN_IDS`, so khớp.
- `resolveGuildRole({ isRescue, memberRole })` — danh sách cứu hộ thắng giá trị trong database, đúng
  như hôm nay ("một admin không được tự khoá mình ra ngoài").

`AuthService` sửa để gọi chúng thay vì giữ luật trong mình — hành vi không đổi, test hiện có phải
vẫn xanh nguyên. File `auth.public.ts` **mới** export hai hàm này (module `auth` chưa có cửa public
nào; nó chưa từng cần).

Trong `discord-bot`, một `ActorResolver` (`@Injectable`) ghép chúng lại: tra `CharactersService
.findByDiscordId`, đọc `DISCORD_ADMIN_IDS` qua `ConfigService`, trả về `{ actor: JwtPayload,
characterId: string | null }`. Không có nhân vật **và** không nằm trong danh sách cứu hộ thì trả
`null` — người này chưa được gán nhân vật, và bot nói đúng câu đó.

`type: TOKEN_TYPE.access` được đặt vào payload cho đúng hình dạng; không token nào được ký, không
token nào rời khỏi process.

## 7. Ranh giới module

`eslint.config.mjs` chỉ cho import qua `*.public.ts` hoặc `*.module.ts` của module khác. Cần:

- **`attendance/attendance.public.ts`** — mới, export `AttendanceService`.
- **`AttendanceModule`** — thêm `exports: [AttendanceService]`. Hôm nay nó không export gì, vì chưa
  ai ở ngoài cần.
- **`auth/auth.public.ts`** — mới, export `isRescueAdmin` và `resolveGuildRole` (chỉ hai hàm thuần;
  `AuthService` vẫn là nội bộ).
- **`DiscordBotModule`** — `imports: [AttendanceModule, BattleSessionsModule, CharactersModule]`.
  `BattleSessionsModule` và `CharactersModule` đã export service của mình sẵn.

Không có `forwardRef()` nào, và không có cycle: `discord-bot` phụ thuộc vào ba module kia, không
module nào phụ thuộc ngược lại.

## 8. Lỗi hiện ra như một câu tiếng Việt, không phải một mã HTTP

`AttendanceService` ném `NotFoundException`, `ForbiddenException`, `ConflictException` — với người
gọi HTTP thì `AllExceptionsFilter` biến chúng thành 4xx JSON. Với Discord thì **không được**: mọi mã
khác 200 đều làm Discord hiện "ứng dụng không phản hồi", và câu giải thích tiếng Việt đã viết sẵn
trong exception bị vứt đi.

Nên `InteractionRouter` bọc phần xử lý lệnh và nút trong một chỗ bắt lỗi duy nhất:

- `HttpException` → tin nhắn ephemeral mang đúng `message` của nó. Những câu này (`Bạn chỉ điểm danh
  được cho nhân vật của mình.`, `Đã quá hạn điểm danh ngày này.`) vốn đã được viết để hiện thẳng cho
  người dùng — architecture.md §3.4.
- Mọi lỗi khác → một câu chung chung cho người dùng, và log đầy đủ phía server. Không rò chi tiết
  nội bộ vào một kênh chat.

Các câu bot tự nói:

| Tình huống | Câu trả lời |
|---|---|
| Người gọi chưa được gán nhân vật | `Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.` |
| Member gọi `/diem-danh-ho` | `Chỉ admin mới điểm danh hộ được.` (xem ghi chú dưới) |
| Người được mention chưa được gán nhân vật | `<@id> chưa được gán nhân vật nào.` |
| Tuần đang mở không có ngày đánh nào | `Tuần này chưa có ngày đánh nào.` |
| Admin cứu hộ không có nhân vật, gọi `/diem-danh` | `Tài khoản admin này không gắn với nhân vật nào — dùng /diem-danh-ho.` |

Một ghi chú về dòng thứ hai: `AttendanceService` chỉ từ chối khi có lệnh **ghi**, mà
`/diem-danh-ho` phải **hiện bảng** trước khi ai kịp bấm gì. Nên riêng chỗ này bot kiểm tra vai trò
trước — không phải để dựng luật thứ hai, mà để không bày ra một bảng mà mọi nút trong đó chắc chắn
sẽ bị từ chối. Luật ghi vẫn nằm nguyên trong service, và vẫn chạy lại ở mỗi lượt bấm.

## 9. Ngân sách 3 giây

Discord huỷ interaction nếu không nhận được phản hồi trong 3 giây. Bot **trả lời thẳng**, không dùng
deferred response.

Lý do: mỗi lượt chỉ tốn vài truy vấn Postgres nhỏ (lịch tuần, các bản ghi điểm danh của một nhân
vật, một lượt tra nhân vật). Deferred thì phải trả 200 trước rồi mới gọi webhook của Discord sau —
trên serverless Vercel, process có thể bị đóng ngay sau khi response đi, nên làm cho đúng cần
`waitUntil` và một đường gọi Discord REST API mới. Không tương xứng với chỗ nó cứu.

**Rủi ro đã biết, ghi ra đây để sau này không phải đoán:** cold start của `apps/api` trên Vercel ăn
vào chính ngân sách 3 giây đó. Nếu thực tế có timeout, câu trả lời là chuyển sang deferred +
`waitUntil` trong một đợt riêng, chứ không phải cắt bớt truy vấn.

### 9.1. Rủi ro đó đã xảy ra thật — 2026-09-06

Một admin dùng `/diem-danh-ho` đổi "Có" → "Không" cho một ngày **đã quá hạn**. Bản ghi trong database
đổi đúng — website hiện trạng thái mới — còn Discord in "Ứng dụng không phản hồi".

**Timeout nằm ở lượt bấm nút, không phải ở lượt gõ lệnh** (`MESSAGE_COMPONENT`, không phải
`APPLICATION_COMMAND`): lệnh chỉ dựng bảng và không ghi gì; chỗ ghi là `handleAttendanceButton`.
Nói rõ vì hai đường này ACK bằng hai hằng số khác nhau — xem 9.3. Đó là chữ của
Discord khi endpoint im quá 3 giây; Vercel Function vẫn chạy tiếp và ghi xong sau đó, nên dữ liệu đi
một đằng còn tin nhắn đi một nẻo.

Đo lại đường bấm nút thì thấy **~13 truy vấn gần như nối đuôi nhau**, và lệnh ghi nằm ở truy vấn thứ
năm — nên mọi thứ chậm phía sau vẫn để lại dữ liệu đã đổi. Nhánh "Không" tốn thêm 4 round-trip so với
nhánh "Có" (`releaseCharacterFromSession`), khớp đúng với việc chỉ câu trả lời "Không" chạm trần.

**Đợt sửa đầu (PR #62) đi ngược chỉ dẫn ở trên: nó cắt bớt truy vấn chứ không chuyển sang deferred.**
Ghi rõ ở đây vì đó là một quyết định đổi ý, không phải một chi tiết triển khai:

- bốn trong số 13 truy vấn là **trùng lặp**, không phải cái giá phải trả — cùng một nhân vật đọc hai
  lần, cùng một ngày đánh đọc hai lần, và tuần được suy ra hai lần trong đó mỗi lần lại **ghi** (vì
  `listByWeek` materialise Bang Chiến). Bỏ trùng lặp là việc đúng dù ngân sách 3 giây có tồn tại hay
  không, nên làm trước là rẻ hơn.
- deferred kéo `waitUntil` của `@vercel/functions` vào lớp Discord, biến mọi lỗi thành lỗi im lặng
  (response đã đi rồi), và buộc mọi test bấm nút phải đi qua `DiscordRestClient` — cái giá đó chỉ
  đáng trả khi đã biết chắc việc cắt truy vấn là không đủ.

Kết quả: độ sâu tuần tự còn ~7. **Việc này rút ngắn công việc chứ không đưa nó ra khỏi đường tới
hạn** — cold start vẫn nguyên vẹn, và nếu bản thân việc khởi động Nest + Prisma đã ăn hết 3 giây thì
không truy vấn nào kịp chạy.

### 9.2. Nếu lỗi tái diễn: đọc câu chữ trước, rồi mới sửa

Câu chữ của thông báo là thứ phân biệt hai nguyên nhân hoàn toàn khác nhau. Hỏi người báo lỗi **đúng
một câu: bot hiện chữ gì**.

| Người dùng thấy | Nghĩa là | Việc phải làm |
| --- | --- | --- |
| "Ứng dụng không phản hồi" (chữ xám của Discord, không phải tin nhắn của bot) | Quá 3 giây. Dữ liệu **có thể đã ghi** — kiểm tra trên web trước khi bảo họ bấm lại | Chuyển sang deferred (xem 9.3) |
| "Có lỗi xảy ra. Thử lại sau hoặc điểm danh trên web." | Tin nhắn của chính bot: có exception thật sau khi ghi | Đọc log Vercel — có stack trace. Deferred không cứu được gì ở đây |
| Một câu tiếng Việt khác ("Đã quá hạn…", "Nút này không còn dùng được…") | Một nhánh từ chối chạy đúng như thiết kế | Không có gì để sửa; nếu câu đó sai thì sửa luật, không sửa lớp Discord |

### 9.3. Deferred trông như thế nào, nếu phải làm

**ACK phụ thuộc điểm vào, không phải một hằng số duy nhất** — §3 đã phân đôi việc trả lời thẳng, và
việc trả lời hoãn cũng phân đôi y hệt:

| Interaction | Trả thẳng (hôm nay) | ACK hoãn | Rồi gửi kết quả bằng |
| --- | --- | --- | --- |
| `MESSAGE_COMPONENT` — bấm nút, **chính là đường đã timeout ở 9.1** | `UPDATE_MESSAGE` (7) | `DEFERRED_UPDATE_MESSAGE` (6) — tin nhắn giữ nguyên, không hiện "đang suy nghĩ…" | `PATCH /webhooks/{application_id}/{token}/messages/@original` để vẽ lại bảng |
| `APPLICATION_COMMAND` — gõ `/diem-danh`, `/diem-danh-ho` | `CHANNEL_MESSAGE_WITH_SOURCE` (4) | `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` (5) | cũng `PATCH … /messages/@original`; cờ ephemeral phải đặt ngay ở ACK |

Lời **từ chối** không đi theo `@original` ở nhánh bấm nút: `PATCH` sẽ ghi đè bảng công khai bằng một
câu chỉ dành cho một người — đúng cái §1 đã cấm. Nó đi bằng một followup riêng,
`POST /webhooks/{application_id}/{token}` kèm cờ ephemeral. Hai nhánh này ánh xạ 1-1 với
`AttendanceButtonOutcome` (`board` / `refusal`) đang có, nên luật từ chối không phải sửa.

Trên Vercel, phần việc chạy sau khi response đã đi phải bọc trong `waitUntil` của
`@vercel/functions`, nếu không function bị đóng băng giữa chừng.

Đây là một thay đổi kiến trúc của lớp Discord, đụng `INTERACTION_RESPONSE_TYPE`,
`interaction.schema` (phải đọc thêm `token` và `application_id`), `DiscordRestClient`,
`InteractionRouter`, cách `InteractionRouter.route` biến exception thành câu trả lời, và toàn bộ test
bấm nút — nên nó cần một spec riêng, và §9 này phải được viết lại chứ không phải đắp thêm.

Cái giá phải nói trước: sau khi hoãn, một lỗi ở bước gửi kết quả **không còn hiện ra cho người dùng**
— họ chỉ thấy bảng đứng yên. Phải bù bằng log.

## 10. Test

Jest, đặt trong `src/modules/discord-bot/__tests__/` cạnh code (architecture.md §7). Mọi test dưới
đây kiểm **hành vi**, không kiểm việc gọi hàm nào:

- `interaction.schema` — nhận `MESSAGE_COMPONENT`; đọc được id người gọi ở cả `member.user.id` lẫn
  `user.id`; đọc được option `nguoi`; một `type` lạ vẫn bị chặn.
- `custom_id` — dựng rồi đọc lại ra đúng ba mảnh; ném lỗi khi vượt 100 ký tự.
- `buildAttendanceBoard` — chữ liệt kê đủ ngày; nút chỉ có cho ngày còn ghi được; member không có
  nút ở ngày quá hạn còn admin thì có; quá 5 ngày thì cắt còn 5 và nói ra.
- `ActorResolver` — rescue admin thắng role trong database; không nhân vật + không rescue → `null`.
- Đường bấm nút — ghi xong trả `UPDATE_MESSAGE` với trạng thái mới.
- Từ chối — member gọi `/diem-danh-ho`; `HttpException` từ service thành tin nhắn tiếng Việt.
- `auth` — test hiện có của `AuthService` phải xanh nguyên sau khi tách hàm; thêm test thuần cho
  `isRescueAdmin` và `resolveGuildRole`.

## 11. Tài liệu phải sửa cùng lúc

- `docs/architecture.md` §3.3 — dòng module `discord-bot` nêu thêm rằng nó ghi điểm danh; bảng
  endpoint **không đổi** (không có endpoint mới).
- `apps/api/CLAUDE.md` / `README.md` — nhắc `pnpm --filter api discord:register` phải chạy lại sau
  đợt này, vì danh sách lệnh đổi.
- Không có biến môi trường mới, không có migration.

## 12. Ngoài phạm vi

- Nhập lý do vắng mặt trên Discord (đã chốt: chỉ web).
- Chọn nhân vật bằng tên qua autocomplete.
- Xem điểm danh của cả bang trong Discord, nhắc theo lịch, sửa điểm danh của tuần đã đóng.
- Deferred response (§9).
- Cho **đúng hai người** (người điểm danh hộ và người được điểm danh) thấy tin nhắn: Discord không
  có cách nào làm thế trong một interaction — ephemeral là một người, ngoài ra phải gửi DM qua
  Discord REST API. Không tương xứng với chỗ nó cứu.
