# `/chao-mung` — lệnh chào thành viên mới

Ngày: 2026-09-03 · Nhánh: `feat/chao-mung-command`

## 1. Vấn đề

Mỗi lần có người mới vào bang, admin gõ tay cùng một đoạn hướng dẫn: chat bang ở đâu,
thông báo ở đâu, chat lưu phái ở đâu, vào đâu để up gear. Đoạn đó lặp lại từng chữ, chỉ
khác đúng hai thứ — người được chào và channel lưu phái của họ. Gõ tay thì tên channel
hay bị viết trần thành chữ thay vì mention bấm được, và thỉnh thoảng sót một mục.

Mục tiêu: một lệnh `/chao-mung` chỉ admin dùng được, nhận người mới + channel lưu phái,
đăng công khai đúng đoạn hướng dẫn đó với cả bốn channel là mention bấm được.

## 2. Phạm vi

Trong phạm vi:

- Lệnh `/chao-mung` với hai option bắt buộc: `nguoi` (USER) và `luu-phai` (CHANNEL).
- Tin nhắn công khai, mention người mới, trỏ tới bốn channel.
- Ba channel cố định lấy từ biến môi trường; channel lưu phái lấy từ option.

Ngoài phạm vi — cố ý không làm:

- **Không tự chạy khi có người join.** Bot không nhận gateway event, chỉ nhận interaction
  webhook; nghe `guildMemberAdd` cần một kết nối thường trực mà kiến trúc Vercel Function
  không có (architecture.md §7). Lệnh chỉ chạy khi admin gõ.
- Không đọc/ghi database. Không gán nhân vật, không tạo `Character`, không liên quan điểm
  danh.
- Không map lưu phái → channel. `GuildClass` có sẵn 7 lớp, nhưng ánh xạ chúng sang 7
  channel id đòi thêm 7 hằng số vận hành để tiết kiệm đúng một cú chọn trong picker.
- Không nút, không embed, không lưu lịch sử lời chào.

## 3. Quyết định thiết kế

### 3.1 Ba channel cố định lấy từ env, channel lưu phái lấy từ option

Bang-chiến, nghịch-thuỷ-hàn và khám-acc là hằng số vận hành: cả bang chỉ có một cái mỗi
loại, và chúng không đổi giữa hai lần chào. Chúng đi cùng chỗ với `DISCORD_GUILD_ROLE_ID`
— biến môi trường — chứ không thành option, vì một option bắt admin chọn lại mỗi lần và
mở đường cho việc chọn nhầm.

Channel lưu phái thì ngược lại: nó đổi theo từng người mới và không biết trước là lưu
phái nào, nên nó là tham số.

Ba biến mới, đều **bắt buộc** (`z.string().min(1)`), theo quy tắc "misconfiguration fails
loud": API không boot khi thiếu, thay vì đăng một lời chào trỏ vào `<#undefined>`. Hệ quả
vận hành: phải set trên host **trước** khi merge PR — xem §7.

### 3.2 "Chat bang ở đây nha" là channel gõ lệnh, không phải biến thứ tư

Dòng đầu nói "ở đây", nên nó đúng nghĩa là channel mà lệnh được gõ. `interaction.channel_id`
đã có sẵn trong payload đã ký, giống hệt cách `/cau-hinh-kenh` dùng nó thay vì bắt admin
copy id. Không cần biến nào cho nó, và cũng không cần render mention: chữ "ở đây" tự nó
đủ nghĩa vì tin nhắn nằm ngay trong channel đó.

Nói cách khác: bốn channel trong nội dung = 3 env + 1 option; channel thứ năm ("ở đây") là
chỗ tin nhắn đứng, không phải một tham chiếu.

### 3.3 Option `luu-phai` kiểu CHANNEL, không phải text

Discord có sẵn option type CHANNEL (7): nó hiện picker, trả về channel id, và bot render
thành `<#id>` — một link bấm được, không thể gõ sai tên. Text tự do thì admin phải gõ đúng
tên channel kể cả phần emoji trong tên (`⚔️│bang-chiến`), và kết quả chỉ là chữ thường.

`interaction.schema.ts` không phải sửa: `commandOptionSchema.value` đã là `z.string()`, và
giá trị của một CHANNEL option là channel id dạng chuỗi — cùng hình dạng với USER option
đang chạy.

### 3.4 Tin nhắn công khai, `content` thuần, không embed

Công khai là bắt buộc, không phải lựa chọn: tin nhắn mention người mới để họ nhận thông
báo, mà một tin ephemeral chỉ đến được đúng người gõ lệnh. Cùng lý do với `/diem-danh-ho`.

`content` thuần thay vì embed: nội dung là bốn dòng ngắn, `<#id>` và `<@id>` render thành
link bấm được y hệt trong cả hai dạng, còn embed thì thêm màu viền và footer — hai thứ ở
đây không mang nghĩa gì. Embed của `/thong-bao` tồn tại vì nó dựng heading `###` cho từng
ngày đánh; lời chào không có cấu trúc đó.

### 3.5 `allowed_mentions` chỉ mở đúng người mới

Payload mang `allowed_mentions: { users: [targetDiscordId] }`. Không phải để bật ping —
Discord ping theo mặc định — mà để đóng mọi thứ khác lại. Cùng lý do với `/thong-bao`:
khai báo trắng danh sách khiến một `@everyone` lọt vào là chuyện không thể xảy ra, kể cả
khi nội dung sau này có phần nào đó lấy từ dữ liệu người nhập.

Ping channel thì `allowed_mentions` không liên quan: `<#id>` chỉ là link, không thông báo
cho ai.

### 3.6 Chỉ admin, kiểm tra ngay trong command

Cùng ba bước với `/thong-bao`, `/cau-hinh-kenh` và `/diem-danh-ho`:
`actors.resolve(callerDiscordId)` → chưa link nhân vật thì `NOT_LINKED` → không
`canManageGuild(role)` thì `ADMIN_ONLY`. Cả hai từ chối đều ephemeral: kênh chung không
cần xem ai bị từ chối.

Kiểm tra nằm trong command chứ không đẩy xuống service, vì **phản hồi chính là tác dụng**
— không có tầng nào phía sau để từ chối; đến lúc đó tin nhắn đã ở trong channel rồi.

### 3.7 Builder nằm trong chính file lệnh

`/thong-bao` tách `announcement.ts` ra riêng vì nó dựng một payload phức tạp từ
`BattleSession[]` và cần test độc lập khỏi tầng quyền. Lời chào chỉ nội suy bốn id vào một
template không nhánh, và chỉ có một chỗ gọi. Tách file ở đây là chia nhỏ mà không giảm
được gì; giữ trong `chao-mung.command.ts` đúng với §7 architecture.md — "một lệnh mới là
một file cộng một dòng".

## 4. Nội dung tin nhắn

```
Chào mừng <@{nguoi}> gia nhập bang!
- Chat bang ở đây nha
- Các thông báo thì ở <#{bangChien}> , <#{nghichThuyHan}>
- Chat lưu phái <#{luuPhai}>
- Bây giờ ông vào <#{khamAcc}> để up gear nhé
```

- Một cấp bullet, không lồng nhau. Bản gõ tay có ba mức thụt lề nhưng nội dung là bốn mục
  ngang hàng; thụt lề chỉ làm Discord đẩy chúng thành list con vô nghĩa.
- Dấu cách trước dấu phẩy ở dòng thông báo giữ nguyên như bản gõ tay.

## 5. Thay đổi theo file

| File | Thay đổi |
|---|---|
| `apps/api/src/config/env.validation.ts` | Ba biến `DISCORD_BANG_CHIEN_CHANNEL_ID`, `DISCORD_NGHICH_THUY_HAN_CHANNEL_ID`, `DISCORD_KHAM_ACC_CHANNEL_ID`, đều `z.string().min(1)` |
| `apps/api/.env.example` | Ba biến, kèm chú thích lấy id ở đâu |
| `docs/development.md` §3, `docs/production.md` §3 | Ba dòng trong bảng env |
| `discord.constants.ts` | `COMMAND_OPTION_TYPE.channel = 7` |
| `commands/command.types.ts` | `CommandLinks.channelIds: { bangChien, nghichThuyHan, khamAcc }` |
| `interaction-router.ts` | Ba `config.get` trong getter `deps` |
| `commands/chao-mung.command.ts` | **Mới.** Definition + execute + template tin nhắn |
| `commands/index.ts` | Một dòng |
| `docs/architecture.md` §3.3 | Bổ sung `/chao-mung` vào mô tả module `discord-bot` |
| `__tests__/chao-mung.command.spec.ts` | **Mới** |

## 6. Luồng

1. Discord → `discord-bot.controller.ts` → chữ ký Ed25519 → `interactionSchema` → router.
2. `chaoMungCommand.execute`: `actors.resolve(callerDiscordId(interaction))`.
   - Không resolve được → ephemeral `NOT_LINKED`.
   - Không `canManageGuild(role)` → ephemeral `ADMIN_ONLY`.
3. `commandOptionValue(interaction, 'nguoi')` và `commandOptionValue(interaction, 'luu-phai')`.
   - Thiếu một trong hai → `throw new Error` nêu tên option. Discord đã ép `required: true`,
     nên giá trị rỗng nghĩa là definition đã đăng ký và bản build này lệch nhau — cách sửa
     là `pnpm --filter api discord:register`. Cùng cách xử lý với `/diem-danh-ho`.
4. Dựng `content` từ hai id đó + `deps.links.channelIds`.
5. `publicMessage({ content, allowed_mentions: { users: [nguoi] } })`.

**Lỗi:** không thêm gì. `InteractionRouter.route` đã bọc mọi thứ — `HttpException` thành
câu tiếng Việt của nó, còn lại thành `UNEXPECTED` + log.

## 7. Vận hành

1. Lấy ba channel id: bật Developer Mode → chuột phải channel → Copy Channel ID.
2. Set cả ba biến trên host **trước** khi merge PR. Chúng bắt buộc, thiếu là API không
   boot, và PR chạm `apps/api` thì deploy ngay sau khi merge — web app không có backend
   nào khác.
3. Sau deploy: `pnpm --filter api discord:register` (bản production với
   `DISCORD_ENV_FILE=.env.production`) để `/chao-mung` xuất hiện trong chat box.
4. Không cần quyền Discord mới: bot chỉ đăng tin trong channel nó đã đăng được, và mention
   người dùng không đòi quyền đặc biệt như mention role.

## 8. Test

`apps/api/src/modules/discord-bot/__tests__/chao-mung.command.spec.ts`:

- Discord ID không resolve được → ephemeral `NOT_LINKED`.
- MEMBER → ephemeral, đúng câu `ADMIN_ONLY`, và **không** phải tin công khai.
- ADMIN → `publicMessage`, `content` chứa `<@người mới>` và đủ bốn `<#id>` đúng thứ tự
  bang-chiến, nghịch-thuỷ-hàn, lưu phái, khám-acc.
- ADMIN → `allowed_mentions.users` đúng một phần tử là id người mới, và không có khoá
  `roles`.
- Thiếu option `nguoi`, thiếu option `luu-phai` → throw, message nêu đúng tên option.

`commands.spec.ts` (bổ sung): `/chao-mung` có mặt trong registry, hai option đều
`required: true` và đúng type 6 / 7.
