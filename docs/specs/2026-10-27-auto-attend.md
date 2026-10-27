# Tự động điểm danh

Status: approved

Ngày: 2026-10-27 · Thuật ngữ: **Auto-attend** (UI: "Tự động điểm danh") trong `GLOSSARY.md` · Tiền lệ:
[`2026-10-04-a1-leave-mode-design.md`](../archive/specs/2026-10-04-a1-leave-mode-design.md) (Nghỉ phép).

## Problem Statement

Thành viên chăm chỉ gần như trận nào cũng đi, nhưng tuần nào cũng phải vào web hoặc Discord bấm "Có"
cho từng trận. Quên bấm thì bị bot nhắc và không nằm trong pool xếp team, dù thực tế họ vẫn đi.
Chiều ngược lại đã có: "Xin nghỉ" tự biến các ngày thành "Không". Chiều "Có" thì chưa có gì.

## Solution

Một công tắc bật/tắt **Tự động điểm danh** cho nhân vật của chính mình, không có khoảng ngày. Khi
bật, mọi trận còn mở (kể cả Guild War, scrim, và trận các tuần sau) hiện "Có" cho người đó cho đến khi
họ tắt. Thành viên vẫn vào đổi một trận cụ thể thành "Không" như bình thường; Nghỉ phép vẫn thắng.

Bật cần xác nhận, vì nó cam kết cho mọi trận về sau. Tắt thì tắt ngay. Công tắc có ở màn điểm danh
trên web và qua một nút mới dưới tin `/thong-bao` (và tin nhắc điểm danh, vì hai tin dùng chung hàng
nút).

## User Stories

1. As a Member, I want to turn Auto-attend on once, so that I stop pressing "Có" for every battle.
2. As a Member, I want a confirmation before Auto-attend turns on, so that I do not commit to every future battle by accident.
3. As a Member, I want the confirmation to warn that every future battle will be answered "Có" for me, so that I know to change the days I cannot make.
4. As a Member, I want to turn Auto-attend off with one action and no confirmation, so that stopping is never harder than starting.
5. As a Member, I want Auto-attend to cover battles created after I turned it on (next week's Guild War, a new scrim), so that I never need to turn it on again.
6. As a Member, I want to change one covered battle to "Không", so that I can skip a day without turning Auto-attend off.
7. As a Member, I want a "Không" I pressed before turning Auto-attend on to stay "Không", so that turning it on never overrides a decision I already made.
8. As a Member, I want my Leave to win over Auto-attend, so that the days I am away show "Không" without turning Auto-attend off.
9. As a Member, I want the open days of a cancelled Leave to go back to "Có" while Auto-attend is on, so that coming back early needs no extra step.
10. As a Member, I want days that already locked to keep "Có" after I turn Auto-attend off, so that history does not change behind my back.
11. As a Member, I want the open days to go back to "chưa phản hồi" when I turn Auto-attend off, so that turning it off means I answer again myself.
12. As a Member, I want to see on the attendance screen whether Auto-attend is on, so that I know my current state.
13. As a Member, I want a covered cell to read "Có · Tự động", so that I can tell it apart from a "Có" I pressed.
14. As a Member with Auto-attend on, I want the bot to stop reminding me, so that I am not nagged for battles I already answered.
15. As a Member, I want a "Tự động điểm danh" button under `/thong-bao` and the reminder, so that I can turn it on from Discord without opening the site.
16. As a Member pressing that Discord button, I want a private reply showing my current state and one button to change it, so that nobody else sees my choice and I cannot toggle by mis-click.
17. As a Member pressing "Bật" or "Tắt" on that private reply, I want the reply to update to the new state, so that I see the result in place.
18. As a Member pressing a stale "Bật" when Auto-attend is already on, I want the reply to show the real state, so that a duplicate press does no harm.
19. As a Discord user with no character, I want the same refusal the bot gives for `/diem-danh`, so that the message is consistent.
20. As an Admin building teams, I want members with Auto-attend on to appear in the pool for covered days, so that I can place them without chasing them.
21. As an Admin, I want to see on the attendance grid which "Có" came from Auto-attend, so that I know who committed by default.
22. As an Admin, I want the per-battle "Có"/"Không" tallies to count Auto-attend answers, so that the battle's head-count is right.
23. As an Admin, I want placements to stay when a member turns Auto-attend off, so that a formation I built does not change by itself.
24. As an Admin, I want marking a member "Không" on their behalf to win over their Auto-attend, so that I can still correct a day.
25. As a Member reading past weeks in History, I want locked days covered by Auto-attend to still read "Có · Tự động", so that the record stays stable.
26. As a Member, I want to turn Auto-attend on, off, and on again, so that each period covers only its own days.
27. As a Member, I want turning it on twice (web and Discord at the same moment) to leave one period, so that a race cannot duplicate it.

## Implementation Decisions

### Model: "Có" suy ra lúc đọc

- Giống Nghỉ phép: Tự động điểm danh **không** ghi `AttendanceRecord`. Câu trả lời hiệu lực của một ô
  được tính lúc đọc. Lý do: trận tạo sau (Guild War sinh lười, scrim mới) tự được phủ mà không móc
  vào luồng tạo trận; tắt đi không phải dọn dòng nào; một `AttendanceRecord` vẫn là một lần ai đó bấm.
- Bảng mới **`AutoAttendPeriod`**, mỗi dòng là một lần bật:
  - `id` (cuid), `characterId` (FK `Character`, `onDelete: Cascade`).
  - `enabledAt: DateTime` (không `@default`, ghi bằng `Clock`).
  - `disabledAt: DateTime?` - null = đang bật. Tắt là ghi cột này, không xoá dòng.
  - `@@index([characterId])`. Migration bật RLS cho bảng mới, cùng mẫu các bảng trước
    (`migration-rls.spec.ts` bắt nếu thiếu).
- Không dùng cột cờ trên `Character`: nó mất lịch sử, nên "bật - tắt - bật lại" làm ngày đã khoá của
  lần bật đầu mất "Có" (vi phạm luật tắt bên dưới).
- Mỗi nhân vật có tối đa một dòng đang bật. Bật và tắt chạy trong transaction sau khoá advisory theo
  nhân vật (`pg_advisory_xact_lock(hashtext(characterId))`, cùng cách Nghỉ phép chống trùng), nên
  web và Discord bấm cùng lúc nối đuôi nhau thay vì tạo hai dòng.

### Luật phủ

Một lần bật phủ một trận khi **cả hai** đúng, với `closeAt` = `attendanceClosedAt` nếu có, nếu không
thì `deadline` (cùng `closingMoment` mà Nghỉ phép dùng):

1. `enabledAt < closeAt` - bật trước khi ngày khoá. Không có ngoại lệ admin, vì admin không bật hộ.
2. `disabledAt` là null, **hoặc** `disabledAt >= closeAt` - tắt sau khi ngày đã khoá thì ngày đó giữ "Có".

Không có điều kiện khoảng ngày: phủ mọi trận, Guild War và scrim. Luật không phụ thuộc `now`, nên kết
quả của một ngày đã khoá không bao giờ đổi.

### Câu trả lời hiệu lực

Với mỗi cặp (thành viên, trận), theo thứ tự:

1. Có `AttendanceRecord` → dùng nó, `source: 'answer'`.
2. Có lần nghỉ phủ trận → "Không", `source: 'leave'` (không đổi).
3. Có lần bật Tự động điểm danh phủ trận → "Có", `source: 'auto'`, `reason: null`,
   `markedAt = enabledAt`.
4. Còn lại → chưa phản hồi.

Hệ quả:

- Bật không xoá record nào: "Không" bấm trước khi bật vẫn thắng (khác Nghỉ phép D9).
- Hàm ghép hiện có (`effectiveRecords`) nhận thêm danh sách lần bật và đặt bước 3 sau bước 2. Luật phủ
  là hàm thuần riêng, test bằng bảng như `isLeaveCovering`.
- Mọi chỗ đọc qua câu trả lời hiệu lực tự hưởng: tally theo trận, bot nhắc điểm danh (người đang bật
  coi như đã trả lời, nên hết bị nhắc), pool xếp team (lọc `isPresent`), bảng điểm danh `/diem-danh`
  trên bot, màn Lịch sử.

### Module và API

- Nằm trong module `attendance`, cùng lý do Nghỉ phép: đọc điểm danh phải biết lần bật, tách module
  sẽ tạo vòng phụ thuộc. Service mới **`AutoAttendService`** (bật/tắt, đọc trạng thái, đọc các lần bật
  cho danh sách trận), export qua `attendance.public.ts` cho bot.
- Endpoint, Bearer, chỉ cho nhân vật của người gọi:

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/auto-attend/me` | Trạng thái của người gọi |
| `PUT` | `/auto-attend/me` | Bật hoặc tắt, body `{ enabled: boolean }` |

- `PUT` idempotent: bật khi đang bật, hoặc tắt khi đang tắt, trả nguyên trạng, không lỗi.
- Người gọi không có nhân vật (rescue admin): 404 `Không tìm thấy thành viên.`. Không có đường cho
  admin bật hộ người khác.
- Tắt không gỡ ai khỏi đội hình: "chưa phản hồi" khác "Không", và chỉ trả lời "Không" mới gỡ.

### Contract dùng chung

- `attendanceSourceSchema` thêm `'auto'`: `type AttendanceSource = 'answer' | 'leave' | 'auto'`. Mọi
  chỗ switch trên `source` (web và bot) kết thúc bằng `assertNever`, nên giá trị mới thành lỗi compile
  ở chỗ nào còn thiếu.
- Schema mới: `setAutoAttendSchema` `{ enabled: boolean }` (request) và `autoAttendStatusSchema`
  `{ enabled: boolean, enabledAt: string | null }` (response, `enabledAt` ISO của lần bật đang chạy).

### Bot Discord

- `buildEntryButtons` thêm nút thứ tư `🔁 Tự động điểm danh` (secondary), custom_id cố định
  `ann:tu-dong`. Cả `/thong-bao` lẫn tin nhắc nhận nút, vì hàng nút cố ý dùng chung. Hàng còn chỗ:
  Discord cho tối đa 5 nút một hàng.
- Bấm nút → trả lời ephemeral: trạng thái hiện tại và một nút.
  - Đang tắt: nội dung cảnh báo "Mọi trận đánh trong tương lai sẽ được tự động điểm danh **CÓ** cho
    bạn. Lưu ý: trận nào bận thì vào đổi thành **KHÔNG** trước hạn chót, hoặc dùng Xin nghỉ." và nút
    `Bật` (custom_id `auto:bat`).
  - Đang bật: "Bạn đang bật tự động điểm danh từ dd/mm." và nút `Tắt` (custom_id `auto:tat`).
- Bấm `Bật`/`Tắt` → gọi `AutoAttendService`, rồi trả **update message** (type 7) thay tin ephemeral
  bằng trạng thái mới và nút ngược lại. Bấm lại nút cũ thì nhờ idempotent, tin hiện trạng thái thật.
- custom_id mới khai báo cùng chỗ với các id hiện có, và router thêm nhánh. Danh tính lấy từ payload
  đã ký, không bao giờ từ custom_id. Không cần `discord:register`: nút không phải lệnh.
- Người bấm không có nhân vật: cùng message `ActorResolver` đang dùng cho `/diem-danh`.

### Web

- Màn điểm danh, đầu màn, cạnh nút `Xin nghỉ`: một switch "Tự động điểm danh" đọc từ
  `GET /auto-attend/me`.
- Bật → dialog xác nhận (cùng shell dialog các thao tác ghi hiện có): tiêu đề "Bật tự động điểm danh?",
  nội dung cùng ý cảnh báo trên Discord, nút `Bật` / `Để sau`. Tắt → gọi ngay, không hỏi.
- Thành công → toast, như mọi thao tác ghi; danh sách điểm danh và tally được tải lại.
- Ô có `source: 'auto'` hiện icon "Có" kèm dấu tự động và nhãn `Có · Tự động` (nhãn cho trình đọc màn
  hình), cùng cách ô nghỉ phép hiện `Không · Nghỉ phép`. Bấm vào ô vẫn đổi được như bình thường.
- Hình thức cụ thể (vị trí, icon, chữ) thiết kế bằng `redesign-skill` trước khi code phần web, theo
  `docs/design-direction.md`.

## Testing Decisions

Test hành vi nhìn từ ngoài: đầu vào là trận, record, lần nghỉ, lần bật và thời điểm; đầu ra là câu
trả lời hiệu lực, response HTTP, response Discord, hay thứ người dùng thấy trên màn. Không test cấu
trúc bên trong (câu query, thứ tự gọi).

Seam, từ cao xuống:

1. **Câu trả lời hiệu lực (API, hàm thuần)** - bảng test cho luật phủ (bật trước/sau `closeAt`, tắt
   trước/sau `closeAt`, `attendanceClosedAt` vs `deadline`, bật-tắt-bật lại) và thứ tự ưu tiên
   (record > nghỉ > tự động). Prior art: `leave-coverage.spec.ts`.
2. **`AutoAttendService`** - bật/tắt idempotent, một dòng đang bật duy nhất, 404 khi không có nhân vật,
   trạng thái trả về. Prior art: `leave.service.spec.ts`.
3. **`AttendanceService` đọc** - `getRecords`/`getSummary` trả `source: 'auto'` và đếm nó; một test
   `ReminderService` xác nhận người đang bật không bị nhắc. Prior art: `attendance.service.spec.ts`,
   `reminder.service.spec.ts`.
4. **Bot qua `InteractionRouter`** - nút trên hàng, bấm mở tin ephemeral đúng trạng thái, `Bật`/`Tắt`
   trả update message, người không có nhân vật bị từ chối. Prior art: `interaction-router.spec.ts`,
   `entry-buttons.spec.ts`.
5. **Web qua màn điểm danh** - switch hiện trạng thái, bật mở dialog và chỉ gọi API sau xác nhận, tắt
   gọi ngay, ô `auto` hiện nhãn `Có · Tự động`. Prior art: `attendance-screen.test.tsx`,
   `attendance-row.test.tsx`, `leave-dialog.test.tsx`.

## Out of Scope

- Admin bật/tắt hộ thành viên.
- Khoảng ngày, chọn loại trận (chỉ Guild War, chỉ scrim), hay chọn thứ trong tuần.
- Tab hay danh sách "ai đang bật" trong `/thiet-lap`: nhãn trên lưới là đủ.
- Tự gỡ khỏi đội hình khi tắt.
- Lệnh slash riêng cho Tự động điểm danh.
- DM nhắc định kỳ cho người đang bật.

## Further Notes

- Một PR cho cả API, web và bot.
- Tài liệu cập nhật cùng PR: `docs/architecture.md` (bảng module `attendance` và `discord-bot`, bảng
  endpoint, §5 model `AutoAttendPeriod` và giá trị `source` mới, §6 luật phủ), comment trên model
  trong `schema.prisma`.
- Discord: tối đa 5 nút trong một action row; response type 7 = UPDATE_MESSAGE, đã có trong
  `discord.constants.ts` và đang được router dùng cho bảng điểm danh.

## Sources

- Nghỉ phép suy ra lúc đọc: `apps/api/src/modules/attendance/leave-coverage.ts` (`isLeaveCovering`,
  `effectiveRecords`).
- Đường đọc dùng chung: `apps/api/src/modules/attendance/attendance.service.ts`
  (`getRecordsForSessions`, `getSummary`).
- Chỉ "Không" mới gỡ đội hình: `attendance.service.ts`, nhánh `if (!isPresent)` gọi
  `releaseCharacterFromSession`.
- Hàng nút dùng chung: `apps/api/src/modules/discord-bot/entry-buttons.ts` (`buildEntryButtons`).
- custom_id cố định: `apps/api/src/modules/discord-bot/custom-id.ts` (`ANNOUNCEMENT_LEAVE_ID`).
- Update message: `apps/api/src/modules/discord-bot/discord.constants.ts` (`updateMessage: 7`).
- Discord component reference (đã đọc 2026-10-27): https://docs.discord.com/developers/components/reference
  - "An Action Row can contain up to 5 Buttons".
