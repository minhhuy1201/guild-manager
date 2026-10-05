# F13 - Báo lỗi cron nhắc điểm danh vào kênh admin

Ngày: 2026-10-05 · Trạng thái: **spec, chưa triển khai** · Nguồn ý tưởng:
[`2026-10-04-feature-ideas-overview.md`](2026-10-04-feature-ideas-overview.md) ý 13 · Liên quan:
[`2026-09-07-flow-audit-overview.md`](2026-09-07-flow-audit-overview.md) DC3 · Plan:
[`../custom-plan/2026-10-05-f13-cron-failure-alert-plan.md`](../custom-plan/2026-10-05-f13-cron-failure-alert-plan.md)

## 1. Vấn đề

Cron nhắc điểm danh (`GET /cron/attendance-reminder`, 09:00 VN) chạy trên Vercel không ai trông. Khi
nó hỏng, không ai biết:

- Discord từ chối tin (bot mất quyền `Send Messages`, kênh bị xoá, 429, 5xx) - `ReminderService.run`
  ném lỗi, Vercel ghi 500 vào tab Cron Jobs, hết.
- Chưa cấu hình kênh nhắc - `run` trả `{ status: 'no-channel' }` và chỉ `logger.warn`.
- DB hoặc đoạn code đọc lịch ném lỗi - giống trường hợp đầu.

Thành viên không được nhắc, admin tưởng bot vẫn chạy. `architecture.md` §8 ghi khoảng hở này là đã
biết: "nothing alerts when a run fails or silently sends nothing".

## 2. Mục tiêu

- Lượt cron thất bại hoặc không gửi được vì thiếu kênh thì báo một tin vào **kênh admin riêng**.
- Admin đặt kênh admin bằng `/cau-hinh-kenh`, như kênh nhắc.
- Lượt "không có gì để nhắc" (`nothing-due`) **không** báo - đó là buổi sáng bình thường.

Ngoài phạm vi:

- Cron không được gọi (Vercel không chạy, deploy hỏng, function chết lúc cold start trước khi vào
  handler). Code bên trong không thể báo việc chính nó không chạy; cần dead-man switch bên ngoài -
  ghi vào §8, không làm.
- Báo lỗi cho các lệnh slash: admin đã thấy kết quả ngay trong Discord.
- Báo lỗi cho đường khác (announce đội hình, OAuth). Chỉ cron nhắc.

## 3. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| D1 | Báo vào đâu | Kênh admin riêng, purpose mới `ADMIN_ALERT` trong `BotChannel`. Không dùng kênh nhắc: lỗi hay gặp nhất là bot mất quyền ở chính kênh nhắc, báo vào đó cũng hỏng theo. |
| D2 | Báo khi nào | Khi `run` ném lỗi, và khi `run` trả `no-channel`. Không báo `nothing-due`, không báo `sent`. |
| D3 | Đường nào báo | Chỉ đường cron. `/nhac-diem-danh` gọi cùng `run` nhưng giữ nguyên: admin đang đọc câu trả lời trong chat rồi. |
| D4 | Đặt kênh admin | `/cau-hinh-kenh` thêm option `muc-dich` (không bắt buộc, mặc định = kênh nhắc như hiện nay). Không thêm lệnh mới: cùng một việc, cùng một kiểm tra quyền và tin xác nhận. |
| D5 | Thiếu kênh admin | `logger.warn` như hiện nay rồi thôi, không ném lỗi: kênh admin là cấu hình trong DB, không kiểm được lúc boot, và thiếu nó không được làm hỏng lượt nhắc. |
| D6 | Mã HTTP của cron | Lỗi vẫn ném ra sau khi báo, để Vercel vẫn ghi lượt đó là thất bại. `no-channel` vẫn trả 200 như hiện nay. |

## 4. Mô hình

### 4.1 `BotChannel`

Không đổi bảng, không migration: `purpose` đã là `String` (schema.prisma, model `BotChannel`). Thêm
một giá trị:

```ts
type BotChannelPurpose = 'ATTENDANCE_REMINDER' | 'ADMIN_ALERT';
```

Union đặt trong `bot-channel.service.ts` (giá trị không đi qua mạng tới web, cùng lý do model dùng
`String` thay vì enum). `BotChannelService.get` và `set` nhận thêm `purpose: BotChannelPurpose`.
Mọi caller hiện có truyền `'ATTENDANCE_REMINDER'`.

### 4.2 Lượt cron

`ReminderService` thêm `runScheduled()`; `ReminderController.run` gọi nó thay cho `run('today')`.

```
runScheduled():
  try:
    outcome = run('today')
  catch error:
    alert(failureText(error))     // không bao giờ ném
    throw error                   // D6
  if outcome.status == 'no-channel':
    alert(NO_CHANNEL_TEXT)
  return outcome
```

`alert(text)`:

1. Đọc kênh `ADMIN_ALERT`. Không có → `logger.warn`, trả về (D5).
2. `rest.postMessage(channelId, { content: text })`.
3. Bất kỳ lỗi nào ở bước 1-2 → `logger.error` kèm lỗi gốc, nuốt lỗi. Lý do: lỗi gốc của lượt nhắc là
   thứ phải tới Vercel; lỗi của tin báo không được che nó.

Việc chọn câu chữ (`failureText`, `NO_CHANNEL_TEXT`) là hàm thuần trong file mới
`discord-bot/reminder-alert.ts`, cạnh `reminder.ts` (nơi dựng tin nhắc).

### 4.3 Nội dung tin báo

Tiếng Việt, ngắn, có việc cần làm. Không kèm stack, không kèm message gốc của exception (có thể chứa
chi tiết DB); chi tiết nằm trong log Vercel.

| Trường hợp | Tin |
|---|---|
| Discord 403 (`isDiscordForbidden`) | `⚠️ Nhắc điểm danh 9h không gửi được: bot không có quyền gửi tin vào kênh nhắc. Kiểm tra quyền Send Messages hoặc chạy lại /cau-hinh-kenh trong kênh muốn dùng, rồi /nhac-diem-danh.` |
| Lỗi khác | `⚠️ Nhắc điểm danh 9h thất bại (lỗi hệ thống). Xem log Vercel, rồi chạy /nhac-diem-danh để nhắc bù.` |
| `no-channel` | `⚠️ Nhắc điểm danh 9h không chạy: chưa có kênh nhắc. Gõ /cau-hinh-kenh trong kênh muốn dùng.` |

Câu cho 403 dùng lại ý của `CANNOT_POST` trong `nhac-diem-danh.command.ts`; khi viết code thì gom về
một hằng nếu hai câu giống hệt.

## 5. Lệnh `/cau-hinh-kenh`

- Option mới `muc-dich`, kiểu string, `required: false`, hai choice; `value` của choice chính là
  `BotChannelPurpose` (cùng cách `SCOPE_CHOICES` dùng `ReminderScope`):
  - `Nhắc điểm danh` → `ATTENDANCE_REMINDER` (mặc định khi bỏ trống - hành vi cũ).
  - `Cảnh báo admin` → `ADMIN_ALERT`.
- Đọc option theo đúng mẫu `scopeOf` của `/nhac-diem-danh`: giá trị lạ → ném lỗi nói rõ cần
  `discord:register`.
- Tin xác nhận và câu `SAVED` theo mục đích:
  - Nhắc: giữ nguyên câu hiện có.
  - Admin: `✅ Channel này đã được đặt làm nơi bot báo lỗi cho admin.` /
    `Đã lưu. Từ giờ bot sẽ báo lỗi nhắc điểm danh trong channel này.`
- Thứ tự giữ nguyên: gửi tin xác nhận trước, lỗi thì không lưu.
- Sau deploy phải chạy `pnpm --filter api discord:register` (option mới phải đăng ký với Discord).

Kênh admin nên là kênh riêng tư của admin. Spec không kiểm việc đó - Discord không cho biết dễ dàng,
và đặt kênh là quyền admin.

## 6. Lỗi và trường hợp biên

| Trường hợp | Kết quả |
|---|---|
| Kênh nhắc mất quyền, kênh admin ổn | Tin 403 vào kênh admin; cron trả 500. |
| Cả hai kênh hỏng | `logger.error` cho tin báo; cron trả 500 với lỗi gốc. |
| DB sập | `run` ném; đọc kênh admin cũng ném → `logger.error`; cron trả 500. Không báo được - giới hạn đã biết. |
| Chưa đặt kênh nhắc | Tin `no-channel` vào kênh admin; cron trả 200 `no-channel`. Lặp lại mỗi sáng tới khi admin đặt kênh - chấp nhận, đó là lời nhắc đúng. |
| Chưa đặt kênh admin | Như hôm nay: chỉ log. |
| Hai purpose cùng một kênh | Cho phép. Không cấm, chỉ mất ý nghĩa D1. |
| `/nhac-diem-danh` thất bại | Không báo vào kênh admin (D3). |

## 7. Kiểm thử

- `reminder-alert.ts`: bảng test câu chữ cho 403, lỗi khác, `no-channel`.
- `ReminderService.runScheduled`:
  - `sent` / `nothing-due` → không gửi tin báo.
  - `no-channel` → gửi tin vào kênh `ADMIN_ALERT`, trả outcome.
  - `run` ném 403 / lỗi khác → gửi đúng tin, rồi ném lại **chính lỗi gốc**.
  - Thiếu kênh admin → không gửi, không ném thêm.
  - `postMessage` của tin báo ném → lỗi gốc vẫn là thứ được ném ra.
- `BotChannelService`: `get` / `set` theo purpose, hai purpose không đè nhau.
- `/cau-hinh-kenh`: không option → kênh nhắc (hồi quy); `ADMIN_ALERT` → kênh admin; giá trị lạ
  → ném; tin xác nhận lỗi → không lưu.
- `ReminderController` gọi `runScheduled`, không gọi `run`.

## 8. Tài liệu phải cập nhật

- `docs/architecture.md`: §3.3 dòng `discord-bot` (kênh admin, báo lỗi cron); §5 dòng `BotChannel`
  ("Today it holds one row" → hai purpose); §8 đoạn về cron - thay "nothing alerts" bằng phạm vi đã
  có và giới hạn còn lại (cron không được gọi).
- `schema.prisma`: comment trên model `BotChannel`.
- `docs/production.md`: bước sau deploy chạy `discord:register` và `/cau-hinh-kenh` chọn
  `Cảnh báo admin` một lần.

## Nguồn

- Cron và hai kiểu im lặng: `apps/api/src/modules/discord-bot/reminder.service.ts` (`ReminderOutcome`,
  `run` - "Silence is a normal outcome"; `@throws Error when Discord rejects the message`).
- Controller cron: `apps/api/src/modules/discord-bot/reminder.controller.ts` (`return this.reminders.run('today')`).
- Một purpose duy nhất: `apps/api/src/modules/discord-bot/bot-channel.service.ts`
  (`ATTENDANCE_REMINDER`), `apps/api/prisma/schema.prisma` model `BotChannel` ("`purpose` is a String
  and NOT a Prisma enum on purpose").
- Lệnh đặt kênh, gửi xác nhận trước khi lưu: `apps/api/src/modules/discord-bot/commands/cau-hinh-kenh.command.ts`.
- Mẫu đọc option có choice: `apps/api/src/modules/discord-bot/commands/nhac-diem-danh.command.ts` (`scopeOf`).
- Lịch cron: `apps/api/vercel.json` (`"schedule": "0 2 * * *"`).
- Khoảng hở đã ghi: `docs/architecture.md` §8 ("nothing alerts when a run fails or silently sends
  nothing"); `docs/custom-spec/2026-09-07-flow-audit-overview.md` DC3.
