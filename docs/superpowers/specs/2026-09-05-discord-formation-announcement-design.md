# Gửi thông báo đội hình vào Discord — Design

Ngày: 2026-09-05 · Phạm vi: `apps/web` (feature `team-builder` mở rộng, thêm `@zumer/snapdom`),
`apps/api` (module `discord-bot` mở rộng + một endpoint mới trên `team-builder`), `packages/shared`
(một schema mới). Không đụng database, không migration.

Hôm nay admin xếp xong đội hình rồi tự chụp màn hình, tự gõ lại câu thông báo theo mẫu, tự dán vào
Discord và tự nhớ ping role. Bốn bước tay, mỗi bước một chỗ sai: chụp thiếu trận 2, gõ nhầm giờ tập
hợp, quên ping. Spec này gom cả bốn vào **một nút** trên thanh công cụ của màn xếp đội hình.

## Bối cảnh

- [architecture.md](../../architecture.md) §3.2 (tầng), §3.3 (module + bảng endpoint), §4.2 (tầng
  frontend), §6 (luật giờ/tuần), §7 (thêm hành vi mới ở đâu).
- `2026-09-01-discord-bot-design.md` — `DiscordRestClient`, khung module `discord-bot`.
- `2026-09-02-thong-bao-command-design.md` — tiền lệ gần nhất: một message công khai có ping role,
  nội dung dựng bằng **hàm thuần** rồi mới đưa cho lớp gửi.
- `2026-08-07-two-matches-per-day-design.md` — một ngày đánh 1 hoặc 2 trận, mỗi trận một đội hình.
- Mẫu chữ đang dùng tay: `apps/api/tb.md` — file tạm, đã xoá khi tính năng này ship; mẫu giờ sống
  trong `formation-announcement.ts` và có test canh.

## 1. Nút làm gì

Một nút **“Gửi Discord”** trong `FormationToolbar`, cạnh “Lưu”. Bấm vào:

1. Mở modal xác nhận, nêu số slot còn trống **của từng trận** trong ngày.
2. Xác nhận → chụp đội hình **mọi trận của ngày đang mở** thành ảnh, ngay trong trình duyệt.
3. Gửi ảnh lên API → API dựng câu thông báo theo mẫu và đăng **một** message vào channel
   `#⚔️│bang-chiến`, kèm ảnh và ping role bang.
4. Thành công → toast xanh. Thất bại → toast đỏ với đúng câu tiếng Việt API trả về.

Phạm vi là **ngày đang mở tab**, không phải “trận đang mở tab” và cũng không phải “ngày hôm nay”:
người bấm nhìn thấy chính xác ngày mình đang thông báo, và một ngày hai trận chỉ tốn một lần bấm.

## 2. Những quyết định đã chốt

| Câu hỏi | Chốt | Vì sao |
|---|---|---|
| Ảnh dựng ở đâu | **Chụp DOM ở client** bằng `@zumer/snapdom` | Ảnh đúng bằng những gì admin vừa nhìn thấy, không phải viết lại layout lần hai rồi để nó trôi khỏi UI thật. Headless Chromium quá nặng cho một Vercel Function; satori không đủ CSS grid. |
| Truyền ảnh kiểu gì | **base64 data URL trong body JSON** | Dùng lại `apiFetch` nguyên vẹn, không cần multer. Hai ảnh webp nằm rất xa hạn 4.5MB body của Vercel; schema chặn cứng nếu vượt. |
| Gửi vào channel nào | `DISCORD_BANG_CHIEN_CHANNEL_ID` **đã có sẵn** | Đúng channel cần đăng, và biến này đã được `/chao-mung` dùng nên không phát sinh cấu hình. |
| Ping ai | `DISCORD_GUILD_ROLE_ID` **đã có sẵn** | Chính role `@Nghịch Nước` trong mẫu, `/thong-bao` đang ping cùng role đó. |
| `#🤒│báo-bận` | Thêm env `DISCORD_BAO_BAN_CHANNEL_ID`, render `<#id>` | Một dòng chữ thường không bấm được; mẫu tay đang bắt người đọc tự đi tìm channel. |
| Draft chưa lưu | **Chặn**, bắt lưu trước | Ảnh gửi cho cả bang mà khác dữ liệu trên hệ thống là mâu thuẫn không ai gỡ được về sau. |
| Theme của ảnh | Chụp theo theme đang bật | Bảng màu đội (`team-colors.ts`) và banner đều là palette cố định, sáng/tối gần như không khác. Ép một cây theme thứ hai chỉ để chụp là chi phí thừa. |

## 3. Nội dung message

Mẫu, đúng markdown Discord (`#` heading, `##` subheading, `*…*` nghiêng):

```
# SCRIM 20:30 19/08 TỐI NAY - 2 TRẬN
## - Các thành viên có tên trong danh sách vui lòng online *sớm trước 19:45* !
## - Sau 20:15 chưa online, slot được thay thế cho thành viên khác.
## - Nếu không thể tham gia hoặc vào trễ *sau 19:45*, báo gấp vào <#1234567890> .
## - Những ai không có tên trong danh sách *vẫn nên online để sẵn sàng thay thế khi cần thiết*.
---------------------------------------------------------------------
<@&9876543210>
```

### 3.1 Ba mốc giờ

| | SCRIM | BANG CHIẾN |
|---|---|---|
| `online sớm trước` | giờ đánh **− 45 phút** | **19:30** cố định |
| `Sau … chưa online` | giờ đánh **− 15 phút** | **19:45** cố định |
| `vào trễ sau` | giờ đánh **− 45 phút** | **19:45** cố định |

Bang chiến in cứng vì luật §6 ghim nó ở **20:00 thứ 7**: ba mốc trong mẫu tay không suy ra được từ
một bộ offset chung với scrim (19:30 là −30, còn scrim là −45), và ép chúng vào một công thức chỉ để
“đối xứng” sẽ đổi chữ admin đang dùng. Giờ đánh trên tiêu đề vẫn đọc từ `session.dateTime` — nếu một
ngày nào đó bang chiến đổi giờ thì tiêu đề nói thật, và spec này phải được sửa lại cùng lúc.

Mọi phép tính giờ đọc theo **giờ Việt Nam** qua `vnParts` (§6: không bao giờ dùng giờ máy chủ).

### 3.2 Cụm ngày

So ngày lịch VN của `dateTime` với `Clock.now()`:

| | Chữ in ra |
|---|---|
| Cùng ngày | ` TỐI NAY` |
| Ngày kế tiếp | ` TỐI MAI` |
| Xa hơn | *(bỏ hẳn cụm này)* |

### 3.3 Số trận

`n TRẬN` lấy từ `session.matchCount` — **lịch đánh**, không phải số ảnh. Một ngày đánh 2 trận nhưng
dùng chung một đội hình sẽ ghi “2 TRẬN” mà chỉ đính 1 ảnh; đó đúng là quy ước banner trên web
(`banner-title.ts`) và là sự thật với người đọc: họ đánh 2 trận với cùng một đội hình.

### 3.4 Ping

`content` mang `<@&roleId>`; `allowed_mentions: { roles: [roleId] }` để đóng mọi mention khác —
cùng lý do đã ghi trong `MessagePayload`.

## 4. Backend

### 4.1 `packages/shared/schemas/formation.schema.ts`

```ts
/** Ảnh đội hình gửi kèm thông báo: data URL webp, base64. */
export const ANNOUNCEMENT_IMAGE_MAX_CHARS = 3_000_000;

const announcementImageSchema = z
  .string()
  .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/, "Ảnh đội hình không hợp lệ.")
  .max(ANNOUNCEMENT_IMAGE_MAX_CHARS, "Ảnh đội hình quá lớn.");

export const announceFormationSchema = z.object({
  images: z.array(announcementImageSchema).min(1).max(2),
});

export const announcementResultSchema = z.object({ imageCount: z.number() });
```

`min(1)`: một thông báo không ảnh thì không phải thông báo đội hình. `max(2)` khớp trần `matchCount`
đã có. Định dạng ép **webp** bằng regex — một hằng số duy nhất quyết định cả client chụp gì lẫn
server nhận gì. Câu từ chối viết tiếng Việt vì frontend hiện thẳng.

### 4.2 `apps/api`

| File | Việc |
|---|---|
| `config/env.validation.ts` | Thêm `DISCORD_BAO_BAN_CHANNEL_ID: z.string().min(1)` — thiếu thì chết lúc boot, đúng luật “misconfiguration fails loud”. |
| `discord-bot/vn-format.ts` | `formatVnTime` / `formatVnDayMonth` — tách ra từ bản sao đang nằm riêng trong `announcement.ts`, để hai message không có hai cách viết `dd/MM`. |
| `discord-bot/formation-announcement.ts` | **Hàm thuần** `buildFormationAnnouncement(input, links): MessagePayload`. Nơi duy nhất giữ mẫu chữ. |
| `discord-bot/discord-rest.ts` | Thêm `postMessageWithFiles(channelId, payload, files)` — multipart `payload_json` + `files[n]`, Node 24 có sẵn `FormData`/`Blob`. |
| `discord-bot/formation-announcer.service.ts` | Đọc session qua `BattleSessionsService.findById`, dựng payload, gửi vào channel bang chiến. |
| `discord-bot/discord-bot.public.ts` | Export `FormationAnnouncerService`. |
| `discord-bot/discord-bot.module.ts` | Khai báo + `exports` service đó. |
| `team-builder/team-builder.controller.ts` | `@Post('formations/:sessionId/announce')` — class đã có `JwtAuthGuard + AdminGuard`. |
| `team-builder/team-builder.service.ts` | `announceFormation(sessionId, images)` — chuyển tiếp sang announcer, bọc kết quả bằng `verifyResponse`. |
| `team-builder/dto/announce-formation.dto.ts` | `createZodDto(announceFormationSchema)`. |
| `team-builder/team-builder.module.ts` | `imports: [DiscordBotModule]`. |

**Chiều phụ thuộc:** `team-builder → discord-bot`. Không có cycle vì `discord-bot` không biết
`team-builder` tồn tại, nên không cần `forwardRef()` — và nếu một ngày nó cần, đó là dấu hiệu phải
tách module thứ ba chứ không phải nới luật.

**Vì sao endpoint nằm ở `team-builder` chứ không phải một controller mới trong `discord-bot`:**
§7 nói endpoint mới của một domain sẵn có thì thêm method vào controller của domain đó. Người gọi là
màn xếp đội hình, quyền là quyền admin của màn đó, và class đã gắn sẵn đúng cặp guard. Controller
của `discord-bot` xác thực bằng chữ ký Ed25519 hoặc bằng cron secret — không dùng lại được.

Session không tồn tại → `NotFoundException('Không tìm thấy trận đánh này.')`. Discord từ chối →
`DiscordRestClient` đã ném kèm status + body; announcer để lỗi nổi lên nguyên trạng, tầng filter biến
thành 500 và frontend hiện câu tiếng Việt của nó.

Gửi **một** message mang cả hai ảnh, không phải hai message: không tồn tại trạng thái “gửi được nửa”
để phải dọn.

## 5. Frontend

Thêm `@zumer/snapdom` vào `apps/web`.

| File | Việc |
|---|---|
| `components/formation-capture-sheet.tsx` | Container **ngoài màn hình** chứa một `FormationGrid` cho mỗi trận của ngày. |
| `lib/announce-capture.ts` | `captureFormations(nodes): Promise<string[]>` — snapDOM → webp data URL. |
| `components/announce-formation-dialog.tsx` | Modal xác nhận + spinner. |
| `hooks/use-formation-announce.ts` | Điều phối: mở modal → chụp → mutation → toast. |
| `api/team-builder-api.ts` | `announceFormation(sessionId, images)`. |
| `components/formation-toolbar.tsx` | Nút mới + props `onAnnounce` / `announcing`. |
| `components/formation-grid.tsx` | Thêm prop `fixedColumns?: boolean`. |
| `components/team-builder-screen.tsx` | Ráp modal + capture sheet. |
| `next.config.ts` | `serverActions.bodySizeLimit: "8mb"` — mặc định 1MB chặn mất hai ảnh. |

### 5.1 Capture sheet

```
fixed left-[-10000px] top-0 w-[1280px] pointer-events-none  (aria-hidden)
```

Đặt lệch ra ngoài khung nhìn chứ **không** `display:none`: snapDOM đọc layout thật, một cây bị ẩn
hoàn toàn thì mọi kích thước bằng 0.

Bề rộng ghim 1280px và `FormationGrid` nhận `fixedColumns` để dùng `grid-cols-5` thay vì bộ class
responsive. Không có nó, ảnh sẽ phụ thuộc kích thước cửa sổ người bấm — admin mở máy hẹp thì cả bang
nhận một tấm ảnh 1 cột cao 10 màn hình.

Mỗi trận vẽ bằng `FormationGrid` với `readOnly`, tiêu đề banner dựng bằng `buildBannerTitle` **cho
đúng chỉ số trận đó** — banner đã nằm sẵn trong lưới nên chụp lưới là có luôn banner, đúng yêu cầu
“kèm cả banner”.

Mỗi khung chụp mang thuộc tính `data-formation-capture`; lúc bấm xác nhận, hook đọc thẳng các node
đó từ document thay vì luồn một mảng ref qua modal — cùng một câu trả lời, ít mảnh động hơn, và
chính thuộc tính đó là thứ test khẳng định.

**Sheet chỉ mount khi modal đang mở**, và là **anh em** của modal chứ không nằm trong nó: nội dung
modal đi qua portal, còn tấm chụp phải ở lại cây thường để giữ layout thật. Nhờ vậy tới lúc bấm “Xác nhận” thì nó đã vẽ xong từ lâu,
không cần bắt tay “đã paint chưa” giữa hook và component; đóng modal là nó biến mất, màn hình chính
không phải gánh thêm hai lưới suốt phiên làm việc.

### 5.2 Modal

Nội dung:

- Tiêu đề: `Gửi thông báo đội hình?`
- Dòng trận: mỗi trận một dòng — `Trận 1: thiếu 4/60` hoặc `Trận 1: đủ 60/60`.
- Nếu ngày đang có thay đổi chưa lưu: một dòng cảnh báo và **vô hiệu hoá** nút xác nhận, kèm câu bảo
  bấm “Lưu” trước.
- Nút xác nhận: `Gửi thông báo`; đang gửi thì `Spinner` + `Đang gửi...`, y hệt nút “Lưu” của toolbar.

60 = `TEAM_COUNT * SLOTS_PER_TEAM`, đọc từ `mock-formation.ts` chứ không viết số cứng.

### 5.3 Nút trên toolbar

Nằm trong nhánh `editable` sẵn có: ngày đã đánh xong thì toolbar vốn đã trả về đúng một câu và không
có nút nào cả — không thông báo cho một trận đã đá xong. Nút khoá khi `saving` hoặc `announcing`.

### 5.4 Lỗi

| Chuyện gì | Người dùng thấy |
|---|---|
| snapDOM ném | Toast đỏ `Không chụp được ảnh đội hình.` |
| API/Discord từ chối | Toast đỏ với `ApiError.message` (§ web: hiện nguyên văn) |
| Xong | Toast xanh `Đã gửi thông báo vào Discord.` |

## 6. Test

Jest (`apps/api`):

- `formation-announcement.spec.ts` — offset của scrim (−45/−15/−45), ba mốc cứng của bang chiến,
  `TỐI NAY` / `TỐI MAI` / không có cụm nào, `n TRẬN` theo `matchCount`, mention role + channel và
  `allowed_mentions` đóng đúng.
- `discord-rest.spec.ts` — `postMessageWithFiles` gửi multipart có `payload_json` và `files[0]`,
  không tự set `Content-Type`; lỗi mang theo status + body.
- `formation-announcer.service.spec.ts` — session không tồn tại → 404; gọi đúng channel bang chiến;
  số ảnh vào bằng số file gửi đi.

Vitest (`apps/web`):

- `formation-toolbar.test.tsx` — nút mới hiện khi `editable`, khoá khi đang gửi.
- `announce-formation-dialog.test.tsx` — dòng thiếu của từng trận, chặn khi còn draft chưa lưu,
  spinner khi đang gửi.
- `formation-capture-sheet.test.tsx` — một node chụp cho mỗi trận, lưới bị ép 5 cột, banner nói
  đúng số thứ tự trận.

`announce-capture.ts` **không có test**: nó chỉ gọi snapDOM, mà snapDOM cần canvas thật, jsdom không
có. Bọc nó thành một file riêng chính là để phần còn lại test được.

## 7. Tài liệu phải sửa cùng

- `docs/architecture.md` §3.3 — thêm dòng endpoint mới vào bảng.
- `apps/api/.env.example`, `docs/development.md` §3, `docs/production.md` §3 — biến
  `DISCORD_BAO_BAN_CHANNEL_ID`.
- Xoá `apps/api/tb.md` — mẫu chữ đã có chỗ ở thật trong `formation-announcement.ts`.

## 8. Cố tình không làm

- **Không tự động gửi theo lịch.** Giống `/thong-bao`: message này ping cả bang, và ai bị ping lúc
  nào là quyết định của admin, không phải của một dòng cron.
- **Không lưu lại đã gửi hay chưa.** Gửi hai lần là chuyện admin tự thấy trong channel; thêm một cột
  database để chặn một thao tác vô hại là đắt hơn vấn đề.
- **Không có lệnh Discord tương ứng.** Nút này cần ảnh chụp từ DOM, mà một slash command thì không
  có DOM nào để chụp.
- **Không cho sửa chữ trong modal.** Mẫu là mẫu; sửa chữ mở đường cho mention tuỳ tiện lọt vào một
  message ping cả bang.
