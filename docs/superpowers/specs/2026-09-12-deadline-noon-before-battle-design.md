# Deadline mặc định 12:00 hôm trước ngày đánh, nhắc điểm danh theo mốc 12:00

Ngày: 2026-09-12 · Nhánh: `feat/deadline-noon-before-battle`

## 1. Vấn đề

Deadline mặc định hiện nằm quá sát trận, và tin nhắc ra quá sớm so với deadline:

- Scrim: form admin điền sẵn deadline bằng chính cap, **10:00 sáng ngày đánh**.
- Bang Chiến: deadline do hệ thống sở hữu, **17:00 thứ 5**, trong khi trận đánh 20:00 thứ 7.
- Bot nhắc lúc 9h sáng **hôm trước ngày hết hạn** (`isReminderDay`, spec
  [2026-09-02](2026-09-02-attendance-reminder-cron-design.md) §3.2). Tin nhắc cho Bang Chiến ra
  lúc 9h thứ 4, hơn một ngày trước deadline và ba ngày trước trận, nên người đọc dễ quên lại.

Mục tiêu: deadline mặc định là **12:00 trưa ngày trước ngày đánh**, và bot nhắc **lúc 9h sáng
cùng ngày hết hạn**, tức khoảng 3 tiếng trước deadline.

## 2. Phạm vi

Trong phạm vi:

- Hàm mới `defaultDeadlineFor(dateTime)` trong `packages/shared/lib/battle-session.ts`: 12:00 giờ
  VN ngày trước ngày đánh. Form admin dùng nó để điền sẵn deadline scrim.
- `guildWarDeadline` đổi từ 17:00 thứ 5 thành **12:00 thứ 6** của tuần.
- `isReminderDay` đổi sang luật mốc 12:00 (§3.3).
- `ReminderService` bỏ qua trận đã hết hạn (§3.4).
- Câu mở đầu của tin nhắc (§3.5).
- Docs: `architecture.md` §5 và §6, comment trong Prisma schema, bảng §3.2 của spec 2026-09-02.

Ngoài phạm vi, cố ý không làm:

- **Không đổi cap.** Admin vẫn được đặt deadline scrim muộn nhất 10:00 sáng ngày đánh
  (`deadlineCapFor`). Mặc định và cap giờ là hai giá trị khác nhau (§3.1).
- **Không migrate dữ liệu.** Scrim đã tạo vẫn nằm trong cap cũ, nên vẫn hợp lệ. Bang Chiến tự sửa
  deadline khi tuần được đọc (§3.6).
- Không đổi giờ cron. Vẫn `0 2 * * *` UTC, tức 09:00 giờ VN.
- Không tính deadline Bang Chiến theo giờ đánh đã bị admin dời (§3.2).

## 3. Quyết định thiết kế

### 3.1 Mặc định và cap tách nhau

Trước đây `deadlineCapFor` vừa là cap backend kiểm tra, vừa là giá trị form điền sẵn, với lý do
"muộn nhất cũng là mặc định hợp lý nhất". Lý do đó không còn đúng: mặc định mới sớm hơn cap
khoảng 22 tiếng.

Vì vậy có hai hàm, cùng nằm trong `packages/shared/lib/battle-session.ts`:

| Hàm | Giá trị | Ai dùng |
|---|---|---|
| `deadlineCapFor(dateTime)` | 10:00 ngày đánh, không muộn hơn giờ đánh | Zod schema, service, form (kiểm tra) |
| `defaultDeadlineFor(dateTime)` | 12:00 ngày trước ngày đánh | Form (điền sẵn) |

`defaultDeadlineFor` luôn nằm trong cap: 12:00 hôm trước luôn sớm hơn 00:00 ngày đánh, tức sớm hơn
cả 10:00 ngày đánh lẫn giờ đánh. Một test giữ tính chất đó.

Ô deadline trong form có `defaultTime` riêng, là giờ được điền khi admin tự chọn ngày. Giá trị này
đổi từ `"10:00"` thành `"12:00"` cho khớp mặc định. Dòng mô tả "Muộn nhất 10:00 sáng ngày đánh."
giữ nguyên vì cap không đổi.

### 3.2 Deadline Bang Chiến: 12:00 thứ 6, tính theo tuần

`guildWarDeadline(weekStart)` đổi thành 12:00 thứ 6 của tuần đó. Hàm vẫn tính **theo tuần**, không
theo `dateTime` của trận. Admin được dời giờ Bang Chiến (`ensureGuildWar` không bao giờ ghi lại
`dateTime`), và nếu deadline đi theo giờ đánh thì phải đổi cả `ensureGuildWar` lẫn
`isGuildWarCurrent` để đọc `dateTime` đã lưu. Với lịch cố định 20:00 thứ 7, hai cách cho cùng một
kết quả, nên giữ cách đơn giản hơn.

Câu "12:00 Thứ 6" hiện ở hai nơi: dòng chữ cố định trong form web và lỗi 400 khi gửi `deadline` cho
Bang Chiến. Cả hai đang hard-code "17:00 Thứ 5". Thêm một hằng số trong
`packages/shared/schemas/battle-session.schema.ts`, cạnh `DEADLINE_CAP_MESSAGE`, để hai bên dùng
chung và không lệch chữ khi luật đổi lần sau.

### 3.3 Luật nhắc: mốc 12:00

Cron chạy lúc 9h sáng và tự hỏi *hôm nay nhắc cho deadline nào*. Luật mới:

- Deadline **từ 12:00 trở đi** được nhắc lúc 9h **cùng ngày**.
- Deadline **trước 12:00** được nhắc lúc 9h **hôm trước**.

| Trận | Deadline | Bot nhắc |
|---|---|---|
| Bang Chiến, thứ 7 20:00 | 12:00 thứ 6 (hệ thống) | 9h thứ 6 |
| Scrim thứ 5 20:30, để mặc định | 12:00 thứ 4 | 9h thứ 4 |
| Scrim thứ 5 20:30, admin kéo tới cap | 10:00 thứ 5 | 9h thứ 4 |
| Scrim thứ 2 20:00, để mặc định | 12:00 Chủ nhật | 9h Chủ nhật |

Lý do không dùng luật "luôn nhắc cùng ngày hết hạn": cap vẫn là 10:00 ngày đánh, và admin được đặt
deadline sớm hơn nữa. Deadline 08:00 sẽ được nhắc lúc 9h, tức sau khi đã khoá.

Lý do mốc là 12:00 chứ không phải 10:00: gói Hobby chỉ bảo đảm cron nổ trong khung giờ, thực tế
09:00 đến 09:59 giờ VN (spec 2026-09-02 §3.1). Deadline 10:00 mà nhắc cùng ngày thì có hôm chỉ còn
1 phút. Với mốc 12:00, mọi deadline được nhắc trước ít nhất khoảng 2 tiếng. 12:00 cũng trùng giờ
deadline mặc định, nên trường hợp phổ biến nhất nằm đúng trên mốc và được nhắc 3 tiếng trước.

Luật vẫn so **ngày dương lịch VN**, không dùng cửa sổ 24 giờ, giống luật cũ. Mốc là một hằng số có
tên trong `session-schedule.ts`, nơi architecture.md §7 chỉ định cho luật lịch. Tên hàm
`isReminderDay(deadline, now)` giữ nguyên vì câu hỏi nó trả lời không đổi.

Dòng cuối của bảng vẫn chạy được với `listByWeek()`: tuần mới mở lúc 22:00 thứ 7, nên sáng Chủ nhật
tuần đang mở đã chứa trận thứ 2, như spec 2026-09-02 §3.2 đã lập luận. Deadline 12:00 Chủ nhật nằm
trước `weekStart` của trận, nhưng không có luật nào đòi deadline nằm trong khung thứ 2 đến thứ 7.

### 3.4 Không nhắc trận đã hết hạn

Theo luật cũ, tin nhắc luôn ra trước ngày hết hạn, nên không bao giờ gặp deadline đã qua. Luật mới
nhắc cả trong ngày hết hạn, nên nếu admin chạy `/nhac-diem-danh` lúc 14:00 thì trận có deadline
12:00 hôm đó vẫn lọt qua `isReminderDay`. Bot sẽ ping những người đã không còn điểm danh được nữa.

`ReminderService.run` lọc thêm `!isDeadlinePassed(deadline, now)` bên cạnh `isReminderDay`. Hai
điều kiện giữ riêng chứ không gộp vào `isReminderDay`: một cái trả lời "hôm nay có phải ngày nhắc
không", cái kia trả lời "còn điểm danh được không", và `isDeadlinePassed` đã tồn tại.

### 3.5 Câu mở đầu của tin nhắc

`LEAD` hiện là "mấy ngày dưới đây hết hạn vào ngày mai". Theo luật mới, một tin có thể gồm cả trận
hết hạn hôm nay (từ 12:00) lẫn trận hết hạn sáng mai (trước 12:00). Câu mới:

```
⏰ **Nhắc điểm danh** - mấy ngày dưới đây sắp hết hạn điểm danh.
```

Mỗi khối trong embed đã ghi giờ hạn đầy đủ (`⏳ Hạn: 12:00 · Thứ 4 (09/09)`), nên câu mở đầu không
cần nói hôm nay hay ngày mai. Comment "falls tomorrow" trong `reminder.ts` và `reminder.service.ts`
được sửa theo.

### 3.6 Dữ liệu đang có và lúc deploy

- **Scrim đã tạo:** deadline cũ (thường là 10:00 ngày đánh) vẫn nằm trong cap, nên sửa trận vẫn
  qua được `assertDeadlineWithinCap`. Chúng được nhắc theo luật mới, tức 9h hôm trước.
- **Bang Chiến:** `ensureGuildWar` ghi lại deadline mỗi lần tuần được đọc, nên hàng cũ tự chuyển
  sang 12:00 thứ 6. Không cần migration, không cần script.
- **Deploy giữa tuần:** nếu deploy sau 17:00 thứ 5 và trước 12:00 thứ 6, Bang Chiến tuần đó mở lại
  cho điểm danh tới 12:00 thứ 6. Đây là hành vi mong muốn.
- `prisma/fix-deadlines.ts` là script một lần từ 2026-08, dùng `deadlineCapFor` và
  `guildWarDeadline`. Script vẫn biên dịch được; nếu chạy lại, nó áp luật mới. Không sửa.

## 4. File thay đổi

| File | Thay đổi |
|---|---|
| `packages/shared/lib/battle-session.ts` | `defaultDeadlineFor` mới; `guildWarDeadline` thành 12:00 thứ 6; sửa comment `deadlineCapFor` |
| `packages/shared/schemas/battle-session.schema.ts` | Hằng số câu deadline Bang Chiến |
| `apps/web/features/settings/components/session-form-dialog.tsx` | Điền sẵn bằng `defaultDeadlineFor`; `defaultTime` 12:00; dùng hằng số Bang Chiến |
| `apps/api/src/modules/battle-sessions/battle-sessions.service.ts` | Lỗi 400 Bang Chiến dùng hằng số chung |
| `apps/api/src/modules/battle-sessions/session-schedule.ts` | `isReminderDay` theo mốc 12:00 |
| `apps/api/src/modules/discord-bot/reminder.service.ts` | Lọc trận đã hết hạn |
| `apps/api/src/modules/discord-bot/reminder.ts` | `LEAD` mới, sửa comment |
| `apps/api/prisma/schema.prisma` | Comment của `BattleSession.deadline` (không tạo migration) |
| `docs/architecture.md` | §5 bảng `BattleSession`, §6 luật deadline và luật nhắc |
| `docs/superpowers/specs/2026-09-02-attendance-reminder-cron-design.md` | Bảng §3.2, trỏ sang spec này |

## 5. Test

- `defaultDeadlineFor`: trận 20:30 thứ 5 cho 12:00 thứ 4; trận sáng sớm 08:00 vẫn cho 12:00 hôm
  trước; qua ranh giới tháng; kết quả luôn nằm trong `deadlineCapFor`.
- `guildWarDeadline`: 12:00 thứ 6 của tuần, vài tuần khác nhau.
- `isReminderDay`:
  - deadline 12:00 hôm nay, `now` 9h: nhắc;
  - deadline 11:59 ngày mai, `now` 9h hôm nay: nhắc;
  - deadline 12:00 ngày mai, `now` 9h hôm nay: không nhắc;
  - deadline 10:00 ngày đánh (cap): nhắc hôm trước;
  - deadline 11:59 hôm nay: không nhắc hôm nay (đã được nhắc hôm qua);
  - cron trễ tới 09:59 vẫn cho cùng kết quả.
- `ReminderService.run`: trận đúng ngày nhắc nhưng deadline đã qua thì không có trong tin; nếu chỉ
  còn trận đó thì kết quả là `nothing-due`.
- `buildReminder`: câu mở đầu mới.
- `BattleSessionsService`: deadline Bang Chiến mới, và lỗi 400 dùng câu mới.
- Form web: chọn giờ đánh thì deadline tự điền 12:00 hôm trước.
