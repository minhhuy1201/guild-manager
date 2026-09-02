# `/thong-bao` — lệnh thông báo lịch đánh trong tuần

Ngày: 2026-09-02 · Nhánh: `feat/thong-bao-command`

## 1. Vấn đề

Thông báo lịch đánh hàng tuần đang được admin gõ tay trong chat bang. Nó lặp lại, dễ sai
ngày, và trình bày xấu (heading `##` chồng nhau, gạch ngang, mention đặt cuối). Nội dung
lại rời khỏi nguồn dữ liệu: lịch nằm trong `BattleSession` nhưng thông báo được chép tay.

Mục tiêu: một lệnh `/thong-bao` chỉ admin dùng được, đọc thẳng lịch tuần đang mở từ
database và đăng một thông báo công khai có mention role bang, kèm lối vào điểm danh ngay
trong chat.

## 2. Phạm vi

Trong phạm vi:

- Lệnh `/thong-bao`, không tham số, chỉ ADMIN.
- Thông báo công khai dạng Discord embed, mention một role bang cố định.
- Hai nút: **Điểm danh ngay** (mở bảng điểm danh riêng tư của người bấm) và
  **Mở website** (link button).
- Đưa giờ đánh vào nhãn của Bang Chiến (`formatSessionLabel`), và dọn hệ quả của
  nó trên web (§3.8).

Ngoài phạm vi — cố ý không làm:

- **Không chạy tự động.** Không cron, không scheduler, không job. Lệnh chỉ chạy khi admin
  gõ tay. Đây là yêu cầu, không phải sự thiếu sót.
- Không lưu lịch sử thông báo, không sửa/xoá thông báo đã gửi.
- Không hiện deadline từng trận, không hiện tiến độ điểm danh ("đã trả lời 12/30").
- Không chọn tuần: luôn là tuần `listByWeek()` trả về.

## 3. Quyết định thiết kế

### 3.1 Tuần đang mở, không cho chọn

`listByWeek()` không tham số trả về tuần đang mở — đúng tuần mà `/diem-danh` và website
đang hiển thị. Cho chọn "tuần sau" sẽ tạo ra một trạng thái vô nghĩa: thông báo nói về
tuần sau nhưng nút **Điểm danh ngay** vẫn mở bảng của tuần đang mở. Một nguồn sự thật,
không có gì để lệch.

Tuần sau tự mở lúc 22:00 thứ 7 (`getActiveWeek`), nên admin gõ `/thong-bao` sau thời điểm
đó là đã thông báo cho tuần mới.

### 3.2 Role mention lấy từ env, không phải option

Bang chỉ có một role cần ping. Một option ROLE bắt admin chọn lại mỗi lần và mở đường cho
việc chọn nhầm. Biến môi trường `DISCORD_GUILD_ROLE_ID` là hằng số vận hành, đổi ở chỗ
mọi hằng số vận hành khác đang nằm.

Biến này **bắt buộc** (`z.string().min(1)`), theo quy tắc "misconfiguration fails loud" —
API không boot khi thiếu, thay vì gửi một thông báo không ping được ai. Hệ quả vận hành:
biến phải được set trên host **trước** khi PR merge, xem §7.

Link website tái dùng `WEB_ORIGIN` đã có. Không thêm biến thứ hai cho cùng một giá trị.

### 3.3 `allowed_mentions` khai báo tường minh

Message payload mang `allowed_mentions: { roles: [DISCORD_GUILD_ROLE_ID] }`. Không phải
để bật ping — Discord đã ping theo mặc định — mà để đóng lại mọi thứ khác. Nội dung embed
được dựng từ dữ liệu database (tên đối thủ do admin nhập), nên `@everyone` hoặc mention
người khác lọt vào là chuyện có thể xảy ra. Khai báo trắng danh sách khiến nó không thể.

### 3.4 Nút "Điểm danh ngay" phải trả message MỚI

Đây là ràng buộc dễ làm sai nhất.

`InteractionRouter.dispatch` hiện xử lý **mọi** `messageComponent` bằng một nhánh duy
nhất: `handleAttendanceButton` rồi trả `INTERACTION_RESPONSE_TYPE.updateMessage`. Giả
định đó đúng khi chỉ có nút bảng điểm danh — nút nằm trên đúng message cần ghi đè.

Nút **Điểm danh ngay** nằm trên **thông báo công khai của cả bang**. Nếu nó cũng trả
`updateMessage`, người bấm đầu tiên sẽ **ghi đè bản thông báo** bằng bảng điểm danh của
riêng mình, và cả bang mất thông báo. Nó phải trả `channelMessageWithSource` + cờ
ephemeral: một message riêng tư mới, thông báo gốc không đổi.

Router vì thế phân nhánh theo `custom_id`, và mỗi nhánh tự quyết kiểu phản hồi.

### 3.5 Phân nhánh bằng so khớp hằng số, không phải registry

Nút announcement không mang dữ liệu gì — nó luôn nghĩa là "mở bảng điểm danh của chính
người bấm". Nên `custom_id` của nó là một hằng số cố định, `ANNOUNCEMENT_ATTENDANCE_ID =
'ann:diem-danh'`, và router so khớp bằng `===`.

Không dựng registry component tổng quát theo prefix: với đúng hai loại nút thì đó là
speculative generality. Mọi `custom_id` không khớp vẫn rơi xuống `handleAttendanceButton`
như hiện nay, và nút lạ vẫn nhận câu `STALE_BUTTON` cũ — hành vi hiện tại không đổi.

Tiền tố `ann:` được giữ trong tên hằng số vì `decodeAttendanceButtonId` phân biệt theo
prefix `dd` và số phần; một id hai phần với prefix khác không thể bị nó nhận nhầm.

### 3.6 Dùng chung đường dựng bảng với `/diem-danh`

Thân của `diemDanhCommand.execute` — resolve actor, kiểm tra đã gán nhân vật, đọc
character, dựng board — chính là thứ nút **Điểm danh ngay** cần. Nó được rút thành một
hàm dùng chung trong `attendance-board.ts`; `/diem-danh` và nút cùng gọi nó. Hai bản sao
của cùng một chuỗi kiểm tra sẽ trôi khỏi nhau.

### 3.7 `CommandDeps` nhận `links`, không nhận `ConfigService`

`CommandDeps` hiện chỉ chứa service. Nó nhận thêm:

```ts
links: { webOrigin: string; guildRoleId: string };
```

Một object phẳng, resolve một lần trong `InteractionRouter` từ `ConfigService`, thay vì
đưa `ConfigService` cho mọi command. Command chỉ thấy đúng hai giá trị nó cần, và test
dựng bằng object literal thay vì stub một class của Nest. Khớp quy tắc "Defaults are
explicit: resolved in one obvious place".

### 3.8 Nhãn Bang Chiến mang giờ đánh

Hôm nay `formatSessionLabel` dựng hai nhãn không đối xứng:

| | Nhãn | Dòng phụ trên web (`getSessionSubtitle`) |
|---|---|---|
| Scrim | `Thứ 5 · 20:30` | `VS: Moonlight` |
| Bang Chiến | `Thứ 7 · Bang Chiến` | `20:00` |

Giờ đánh của scrim nằm trong nhãn, giờ đánh của Bang Chiến nằm ở dòng phụ. Sự bất đối
xứng đó có giá ngay tại thông báo này: một embed field chỉ có một dòng tiêu đề, nên hoặc
Bang Chiến mất giờ, hoặc `announcement.ts` phải dựng nhãn riêng — tức là quy ước nhãn thứ
hai trong dự án.

Chọn hướng còn lại: **giờ vào nhãn, cho cả hai loại.**

```
Thứ 5 · 20:30            (không đổi)
Thứ 7 · 20:00 · Bang Chiến   (mới)
```

Nhãn do `dateTime` sinh ra và không lưu (architecture.md §5), nên đổi hàm là đổi ở mọi
màn cùng lúc — không có migration, không có hàng nào cũ.

**Hệ quả bắt buộc phải dọn:** `getSessionSubtitle` tồn tại một phần chỉ để bù cho việc
nhãn thiếu giờ — nhánh Bang Chiến của nó trả về đúng cái giờ vừa chuyển đi. Để nguyên là
hiện giờ hai lần. Nhánh đó trả về chuỗi rỗng, và bảy chỗ gọi phải bỏ qua dòng phụ rỗng
thay vì render một dòng trống:

| Chỗ gọi | Cách dọn |
|---|---|
| `week-timeline.tsx:84` | đã có biến `subtitle`; bọc `{subtitle && …}` |
| `attendance-grid.tsx:186` | đã có biến `subtitle`; bọc `{subtitle && …}` |
| `session-tabs.tsx:72` | đã có biến `subtitle`; bọc `{subtitle && …}` |
| `member-attendance-card.tsx:208` | bọc `{getSessionSubtitle(...) && …}` |
| `session-row.tsx:50` | bọc tương tự |
| `delete-session-dialog.tsx:60` | bọc tương tự |
| `attendance-summary-card.tsx:158` | nối các mảnh khác rỗng bằng ` · ` thay vì nội suy thẳng — nếu không sẽ ra `" · đã điểm danh 12/30"` |

Đây là mở rộng phạm vi có chủ ý sang `apps/web`, không phải refactor tiện tay: bỏ qua nó
thì tính năng hiện sai.

## 4. Hình dạng thông báo

```
@Nghịch Nước
┌──────────────────────────────────────────
│ 📢 LỊCH ĐÁNH TUẦN NÀY
│ 01/09 – 06/09
│
│ 🛡️ Thứ 7 · 20:00 · Bang Chiến   ⚔️ Thứ 5 · 20:30
│ 📅 06/09                 📅 04/09
│ ⚔️ 2 trận                ⚔️ 2 trận
│                          🆚 Moonlight
│
│ ✅ Điểm danh
│ Bấm nút bên dưới, hoặc gõ /diem-danh trong chat.
│ Bận thì chọn KHÔNG.
│ Gặp lỗi đăng nhập thì báo admin.
└─ Guild Manager
[ ✅ Điểm danh ngay ]  [ 🌐 Mở website ]
```

- Mỗi ngày đánh là một embed field `inline: true` (Discord xếp tối đa 3 field một hàng).
- `name` = `${icon} ${session.label}` — `label` đã do backend dựng
  (`formatSessionLabel`, nay kèm giờ cho cả hai loại — §3.8), không dựng lại ở đây.
  Icon: 🛡️ khi `isGuildWar`, ⚔️ còn lại.
- `value` = ngày `dd/MM` từ `dateTime`, số trận từ `matchCount`, và dòng đối thủ chỉ khi
  `opponent` khác null.
- Khoảng tuần lấy từ `weekStart` của session đầu tiên, đến `weekStart + 5 ngày`
  (`shiftVnDate`) — tuần điểm danh chạy thứ 2 → thứ 7 (architecture.md §6).
- Ghi chú hướng dẫn là một field cố định cuối embed, không inline.
- Tuần rỗng: bỏ toàn bộ field ngày đánh, `description` thành "Tuần này chưa có ngày đánh
  nào." Nút vẫn giữ — người dùng vẫn có thể muốn xem bảng.

## 5. Thay đổi theo file

| File | Thay đổi |
|---|---|
| `apps/api/src/modules/battle-sessions/session-schedule.ts` | `formatSessionLabel` — Bang Chiến kèm giờ (§3.8) |
| `apps/web/features/attendance/lib/session-subtitle.ts` | Bang Chiến trả chuỗi rỗng (§3.8) |
| 7 component web ở bảng §3.8 | Bỏ qua dòng phụ rỗng |
| `apps/api/src/config/env.validation.ts` | `DISCORD_GUILD_ROLE_ID: z.string().min(1)` |
| `apps/api/.env.example` | Biến mới, kèm chú thích lấy ở đâu |
| `docs/development.md` §3, `docs/production.md` §3 | Một dòng trong bảng env |
| `discord.constants.ts` | `BUTTON_STYLE.primary = 1`, `BUTTON_STYLE.link = 5`, `EMBED_COLOR` |
| `commands/command.types.ts` | `EmbedPayload`, `EmbedField`, `LinkButtonComponent`, `ButtonComponent` thành union, `MessagePayload.embeds?` + `.allowed_mentions?`, `CommandDeps.links` |
| `announcement.ts` | **Mới.** Dựng `MessagePayload` của thông báo từ `BattleSession[]` + `links`. Thuần, không I/O |
| `custom-id.ts` | `export const ANNOUNCEMENT_ATTENDANCE_ID = 'ann:diem-danh'` |
| `attendance-board.ts` | Rút `buildOwnBoard(discordId, deps)` dùng chung (§3.6) |
| `commands/thong-bao.command.ts` | **Mới.** Definition + execute |
| `commands/diem-danh.command.ts` | Gọi `buildOwnBoard` thay vì thân hiện tại |
| `commands/index.ts` | Một dòng |
| `interaction-router.ts` | Phân nhánh `messageComponent` (§3.4, §3.5); dựng `links` từ `ConfigService` trong getter `deps` |

## 6. Luồng

**Gõ lệnh:**

1. Discord → `discord-bot.controller.ts` → chữ ký Ed25519 → `interactionSchema` → router.
2. `thongBaoCommand.execute`: `actors.resolve(callerDiscordId)`.
   - Không resolve được → ephemeral `NOT_LINKED`.
   - Không `canManageGuild(role)` → ephemeral `ADMIN_ONLY`. Từ chối luôn riêng tư, kênh
     chung không cần xem ai bị từ chối — cùng quy ước với `/diem-danh-ho`.
3. `battleSessions.listByWeek()` → `buildAnnouncement(sessions, deps.links)`.
4. `publicMessage(payload)`.

**Bấm "Điểm danh ngay":**

1. Router thấy `custom_id === ANNOUNCEMENT_ATTENDANCE_ID`.
2. `buildOwnBoard(callerDiscordId(interaction), deps)`.
   - Chưa gán nhân vật → `NOT_LINKED`; admin cứu hộ không có nhân vật →
     `NO_OWN_CHARACTER`.
3. `ephemeral(payload)` → **message mới**, thông báo gốc nguyên vẹn.
4. Từ đó trở đi các nút Có/Không là nút `dd:` sẵn có, chạy đúng đường cũ với
   `updateMessage` trên chính message ephemeral đó.

**Lỗi:** không thêm gì. `InteractionRouter.route` đã bọc mọi thứ: `HttpException` thành
câu tiếng Việt của nó, còn lại thành `UNEXPECTED` + log.

## 7. Vận hành

1. Set `DISCORD_GUILD_ROLE_ID` trên host **trước** khi merge PR. Biến bắt buộc, thiếu là
   API không boot, và PR chạm `apps/api` thì deploy ngay sau khi merge.
2. Sau deploy: `pnpm --filter api discord:register` (và bản production với
   `DISCORD_ENV_FILE=.env.production`) để `/thong-bao` xuất hiện trong chat box.
3. Bot cần quyền mention role: hoặc role được đặt "Allow anyone to @mention this role",
   hoặc bot có Mention Everyone. `allowed_mentions` không cấp quyền, chỉ giới hạn.

## 8. Test

`apps/api/src/modules/discord-bot/__tests__/`:

- `announcement.spec.ts` — một field mỗi ngày đánh; icon theo `isGuildWar`; dòng đối thủ
  chỉ xuất hiện khi `opponent` khác null; khoảng tuần đúng; tuần rỗng ra câu thay thế;
  `allowed_mentions.roles` đúng một phần tử; link button mang `WEB_ORIGIN`.
- `thong-bao.command.spec.ts` — non-admin bị từ chối ephemeral; Discord ID không resolve
  được ra `NOT_LINKED`; admin nhận `publicMessage` với mention role trong `content`.
- `interaction-router.spec.ts` (bổ sung) — nút announcement trả
  `channelMessageWithSource` + cờ ephemeral, **không** phải `updateMessage`; nút `dd:`
  vẫn trả `updateMessage`; `custom_id` lạ vẫn ra `STALE_BUTTON`.
- `diem-danh.command.spec.ts` — giữ nguyên, chứng minh việc rút `buildOwnBoard` không đổi
  hành vi.

Ngoài discord-bot:

- `battle-sessions/__tests__/session-schedule.spec.ts` — nhãn Bang Chiến đổi thành
  `Thứ 7 · 20:00 · Bang Chiến`; nhãn scrim không đổi.
- `attendance/lib/__tests__/session-subtitle.test.ts` (web) — Bang Chiến trả chuỗi rỗng;
  hai nhánh scrim không đổi.

## 9. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Quên set env → API chết sau merge | §7 bước 1; nêu trong PR body |
| Nút announcement ghi đè thông báo chung | §3.4; có test riêng khẳng định kiểu phản hồi |
| Role không mentionable → thông báo không ping ai | §7 bước 3 |
| Quên `discord:register` → lệnh không hiện | §7 bước 2 |
| Đổi nhãn để lại dòng phụ rỗng trên 7 màn web | §3.8 liệt kê đủ bảy chỗ; test dòng phụ khẳng định chuỗi rỗng |
