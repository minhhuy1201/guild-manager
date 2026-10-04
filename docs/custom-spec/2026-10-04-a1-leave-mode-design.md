# A1 - Chế độ nghỉ phép

Ngày: 2026-10-04 · Trạng thái: **đã triển khai** · Nguồn ý tưởng:
[`2026-10-04-feature-ideas-overview.md`](2026-10-04-feature-ideas-overview.md) ý 1 · Plan:
[`../custom-plan/2026-10-04-a1-leave-mode-plan.md`](../custom-plan/2026-10-04-a1-leave-mode-plan.md)

## 1. Vấn đề

Thành viên đi vắng nhiều ngày (công tác, về quê, ốm) hiện phải bấm "Không" cho từng trận, và mỗi
sáng bị bot nhắc điểm danh dù đã báo vắng ngoài game. Scrim admin tạo sau khi họ đi vắng lại hiện
"chưa phản hồi". Admin không có chỗ nào nhìn thấy "ai đang nghỉ".

## 2. Mục tiêu

- Khai một lần cho một khoảng ngày; mọi trận trong khoảng hiện "Không" kèm lý do, kể cả trận được
  tạo sau.
- Người đang nghỉ không bị nhắc, không nằm trong pool xếp team, bị gỡ khỏi đội hình đã xếp.
- Khai được ở web, bằng lệnh bot, và bằng nút trên tin `/thong-bao`.
- Admin thấy danh sách đang nghỉ / sắp nghỉ trong `/thiet-lap`.

Ngoài phạm vi: duyệt đơn nghỉ, thống kê số ngày nghỉ, tự coi nghỉ dài là rời bang, DM nhắc khi hết
nghỉ.

## 3. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| D1 | Ai khai | Thành viên tự khai cho nhân vật của mình; admin khai / hủy hộ bất kỳ ai. |
| D2 | Guild War | Nghỉ phủ mọi trận trong khoảng, Guild War cũng vậy. |
| D3 | Hủy giữa chừng | Ngày còn mở quay về "chưa phản hồi"; ngày đã khoá giữ "Không". |
| D4 | Độ dài | Không giới hạn; chỉ cần `endDate >= startDate`. Không tự coi là rời bang - rời bang vẫn là admin xoá thành viên. |
| D5 | Ngày đã khoá | Lần nghỉ thành viên tự khai chỉ phủ ngày còn mở lúc khai; thành viên hủy chỉ "nhả" ngày còn mở. |
| D6 | Kênh khai | Web + nút "Xin nghỉ" dưới tin `/thong-bao` (không thêm lệnh slash: tránh rối danh sách lệnh; hủy nghỉ chỉ làm trên web). |
| D7 | Đội hình | Khai nghỉ gỡ người đó khỏi đội hình các ngày được phủ, như trả lời "Không". |
| D8 | Admin vượt khoá | Có, đúng như admin ghi điểm danh hiện nay. Lần nghỉ **admin tạo** phủ cả ngày đã khoá trong khoảng, kể cả khoảng đã qua; **admin hủy** thì nhả mọi ngày, kể cả ngày đã khoá. Quyền được chụp lúc bấm (`createdByAdmin`, `cancelledByAdmin`), không đọc lại role hiện tại. |
| D9 | Câu trả lời cũ | Khai nghỉ ghi đè câu trả lời cũ trong khoảng: xoá record của người đó ở mọi ngày lần nghỉ phủ (thành viên: ngày còn mở; admin: mọi ngày trong khoảng). Ví dụ đã "Có" thứ 5, khai nghỉ thứ 4 - thứ 6 thì thứ 5 thành "Không (nghỉ)". Hủy nghỉ không khôi phục câu trả lời đã xoá (khớp D3: về "chưa phản hồi"). |
| D10 | PR | Một PR cho cả API, web và bot. |

## 4. Mô hình: "Không" suy ra lúc đọc

Lần nghỉ **không** ghi dòng vào `AttendanceRecord`. Nó là một dòng `Leave`, và câu trả lời hiệu lực
của một ô được tính lúc đọc.

Lý do chọn thay vì ghi thật:

- Scrim tạo sau, và Guild War của tuần sau (sinh lười bởi `ensureGuildWar`), tự được phủ - không cần
  móc vào luồng tạo trận.
- Hủy nghỉ không phải dọn dòng nào, và không cần phân biệt dòng "tự ghi" với dòng người dùng bấm.
- `AttendanceRecord` giữ đúng nghĩa: một dòng là một lần ai đó bấm.

### 4.1 Bảng `Leave`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `characterId` | `String`, FK `Character`, `onDelete: Cascade` | Xoá thành viên xoá luôn lần nghỉ. |
| `startDate` | `DateTime @db.Date` | Ngày lịch VN, tính cả ngày đó. |
| `endDate` | `DateTime @db.Date` | Ngày lịch VN, tính cả ngày đó. `>= startDate`. |
| `reason` | `String? @db.VarChar(255)` | Cùng giới hạn với `AttendanceRecord.reason`. |
| `createdAt` | `DateTime` (không `@default`) | Mốc so với `closeAt` (luật phủ). Ghi bằng `Clock`, không để DB tự điền - test mới cố định được. |
| `createdByCharacterId` | `String?` | Không phải relation, cùng lý do với `markedByCharacterId`. Null với rescue admin. |
| `createdByAdmin` | `Boolean` (không `@default`) | Người khai là admin lúc khai (D8). Không suy từ `createdByCharacterId`: rescue admin không có nhân vật, và role có thể đổi sau. |
| `cancelledAt` | `DateTime?` | Null = chưa hủy. Hủy là ghi cột này, không xoá dòng. |
| `cancelledByCharacterId` | `String?` | Như `createdByCharacterId`. |
| `cancelledByAdmin` | `Boolean` (không `@default`) | Người hủy là admin lúc hủy. Ghi `false` khi tạo; chỉ có nghĩa khi `cancelledAt` khác null. |

Index: `@@index([characterId])`, `@@index([endDate])`. Migration bật RLS cho bảng mới (cùng mẫu
`20260925004158_enable_rls_on_tactics`; `migration-rls.spec.ts` bắt nếu thiếu).

### 4.2 Luật phủ

Một hàm thuần `isLeaveCovering(leave, session)`, test bằng bảng. Định nghĩa:

- `sessionDay` = ngày lịch VN của `session.dateTime`.
- `closeAt` = `attendanceClosedAt` nếu có, nếu không thì `deadline`. Đây là thời điểm ngày đó khoá -
  cùng hai đường vào của `isAttendanceClosed`.

Lần nghỉ phủ trận khi **cả ba** đúng:

1. `startDate <= sessionDay <= endDate`.
2. `createdByAdmin`, **hoặc** `createdAt < closeAt` - thành viên phải khai trước khi ngày khoá (D5),
   admin thì không (D8).
3. `cancelledAt` là null, **hoặc** (`!cancelledByAdmin` **và** `cancelledAt >= closeAt`) - thành
   viên hủy sau khi ngày đã khoá thì ngày đó vẫn giữ "Không" (D3); admin hủy thì nhả mọi ngày (D8).

Hệ quả cần biết:

- "Về sớm" chính là hủy: ngày đã khoá giữ "Không", ngày còn mở về "chưa phản hồi". Admin hủy thì
  cả ngày đã khoá cũng về "chưa phản hồi" - cách sửa một lần nghỉ khai nhầm.
- Thành viên hủy một lần nghỉ admin đã khai: ngày đã khoá vẫn giữ (điều 3 xét người hủy, không xét
  người khai).
- Admin mở lại một ngày đã announce (`reopen-attendance`) thì `closeAt` lùi về `deadline`; một lần
  nghỉ khai giữa lúc announce và lúc mở lại sẽ bắt đầu phủ ngày đó. Đúng ý: ngày đã mở lại thì
  được trả lời lại.
- Luật không phụ thuộc `now`: kết quả của một ngày đã khoá không bao giờ đổi nữa, nên trang lịch sử
  ổn định.

### 4.3 Câu trả lời hiệu lực

Với mỗi cặp (thành viên, trận):

1. Có `AttendanceRecord` → dùng nó, `source: 'answer'`.
2. Không có record, có lần nghỉ phủ trận → "Không", `source: 'leave'`, `reason = leave.reason`,
   `markedAt = leave.createdAt`.
3. Còn lại → chưa phản hồi (không có phần tử).

Record luôn thắng vì D9: lúc khai nghỉ, record cũ của các ngày được phủ đã bị xoá, nên mọi record
còn lại trong khoảng nghỉ là thứ người đó (hoặc admin) bấm **sau** khi khai - ví dụ đi được một hôm
thì bấm "Có" hôm đó, và "Có" thắng.

Hai lần nghỉ chưa hủy của cùng một người không được chồng ngày (mục 5.2), nên bước 2 không bao giờ
phải chọn giữa hai lần nghỉ.

## 5. API

Đặt trong module `attendance`, không phải module mới: khai nghỉ phải xoá `AttendanceRecord` và gỡ
đội hình, còn đọc điểm danh phải biết lần nghỉ. Tách thành module `leaves` sẽ tạo vòng
`attendance ⇄ leaves` (CLAUDE.md cấm `forwardRef()`). Nghỉ phép là một phần của điểm danh.

File mới trong `apps/api/src/modules/attendance/`: `leave.controller.ts`, `leave.service.ts`,
`leave.codec.ts`, `leave-coverage.ts` (hàm thuần mục 4.2-4.3), `dto/create-leave.dto.ts`.
`LeaveService` được export qua `attendance.public.ts` cho bot.

### 5.1 Endpoint

| Method | Path | Mục đích | Quyền |
|---|---|---|---|
| `GET` | `/leaves` | Lần nghỉ chưa hủy có `endDate >= hôm nay (VN)`, sắp theo `startDate` | Bearer, toàn bang (điểm danh vốn công khai trong bang) |
| `POST` | `/leaves` | Khai nghỉ | Bearer; thành viên chỉ cho nhân vật của mình, admin cho bất kỳ ai |
| `POST` | `/leaves/:id/cancel` | Hủy (ghi `cancelledAt`) | Bearer; chủ lần nghỉ hoặc admin |

`POST /leaves/:id/cancel` gọi lại trên lần nghỉ đã hủy thì trả nguyên trạng, không lỗi - cùng kiểu
`reopen-attendance`.

### 5.2 Validate (`POST /leaves`)

Schema dùng chung `createLeaveSchema` trong `packages/shared/schemas/leave.schema.ts`:
`{ characterId, startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', reason?: string ≤255 trim }`, refine
`endDate >= startDate`.

Service kiểm tra, theo thứ tự (lỗi cụ thể nhất trước, cùng tinh thần `AttendanceService.mark`):

| Điều kiện | Mã | Message |
|---|---|---|
| Nhân vật không tồn tại | 404 | `Không tìm thấy thành viên.` |
| Không phải admin, không phải nhân vật của mình | 403 | `Bạn chỉ khai nghỉ được cho nhân vật của mình.` |
| Không phải admin, `endDate` trước hôm nay (VN) | 400 | `Ngày kết thúc đã qua.` |
| Chồng ngày với lần nghỉ chưa hủy khác của người đó | 409 | `Khoảng nghỉ trùng với lần nghỉ dd/mm - dd/mm.` |

Thành viên được để `startDate` ở quá khứ ("đang nghỉ từ hôm qua"): ngày đã qua đều đã khoá nên luật
4.2 tự bỏ qua chúng. Admin được khai cả khoảng đã qua (sửa sau trận, như ghi hộ hiện nay).

Kiểm tra trùng chạy **trong** transaction tạo lần nghỉ, sau khoá advisory theo nhân vật
(`pg_advisory_xact_lock(hashtext(characterId))`, nhả lúc commit/rollback): hai yêu cầu đồng thời cho
cùng một người (web và nút Xin nghỉ cùng lúc) nối đuôi nhau, nên yêu cầu sau thấy lần nghỉ của yêu cầu
trước và nhận 409. Postgres không có ràng buộc loại trừ khoảng ngày nếu thiếu `btree_gist`, nên khoá
advisory là cách đơn giản nhất. (Bản đầu của spec chấp nhận không khoá; đổi vì rủi ro là lần nghỉ
chồng ngày hiện đôi trong banner.)

### 5.3 Ghi khi khai nghỉ

Một transaction:

1. Tạo dòng `Leave` (`createdAt = clock.now()`, `createdByAdmin = canManageGuild(actor.role)`,
   `cancelledByAdmin = false`).
2. Đọc các trận đã tồn tại có ngày VN trong khoảng mà lần nghỉ vừa tạo phủ - tức là dùng chính
   `isLeaveCovering`: thành viên được các ngày còn mở (`now < closeAt`), admin được mọi ngày.
3. Xoá `AttendanceRecord` của người đó ở các trận đó (D9 - ghi đè câu trả lời cũ).
4. `teamBuilder.releaseCharacterFromSession(session, characterId, tx)` cho từng trận (D7) - hàm này
   đã tự bỏ qua trận đã đánh.

Trận chưa tồn tại (tuần chưa sinh) không cần làm gì: luật phủ tính lúc đọc.

### 5.4 Đọc

`BattleSessionsService` thêm một hàm đọc nội bộ trả `{ id, dateTime, deadline, attendanceClosedAt }`
theo danh sách id hoặc theo khoảng ngày - shape public `BattleSession` không có `attendanceClosedAt`
và không cần có.

Đổi sang câu trả lời hiệu lực:

- `AttendanceService.getRecordsForSessions` (và `getRecords` gọi nó): ghép record + lần nghỉ phủ.
  Reminder đọc qua hàm này, nên **người đang nghỉ tự hết bị nhắc** mà không sửa `ReminderService`.
- `getSummary`: đếm trên câu trả lời hiệu lực, thay vì `groupBy` thẳng trên bảng.
- Pool xếp team (`presentCharacterIds`, web) lọc `isPresent === true` nên tự loại người nghỉ.
- `attendanceCount` của dialog xoá trận vẫn đếm record thật - đúng, nó cảnh báo dữ liệu sẽ mất.

### 5.5 Thay đổi contract

`attendanceRecordSchema` thêm `source: attendanceSourceSchema`, với
`type AttendanceSource = 'answer' | 'leave'` (type alias, theo luật union). Mọi chỗ switch trên
`source` kết thúc bằng `assertNever`.

`leaveSchema` (response): `{ id, characterId, startDate, endDate, reason, createdByCharacterId, createdAt }`,
ngày dạng `YYYY-MM-DD`; `createdByCharacterId` null với rescue admin (bảng admin hiện "Admin").

## 6. Bot Discord

### 6.1 Nhập ngày

Không có lệnh slash riêng: khai nghỉ trên Discord đi qua nút "Xin nghỉ" (mục 6.2), hủy nghỉ chỉ có trên
web. Ngày gõ `dd/mm` hoặc `dd/mm/yyyy`; khai hộ chỉ có trên web.

Ngày thiếu năm: lấy năm sao cho ngày đó gần hôm nay nhất (trong ±6 tháng), để `02/01` gõ ngày 28/12
ra năm sau còn `27/12` gõ ngày 02/01 ra năm trước. Riêng `den-ngay` thiếu năm: lấy lần xuất hiện đầu tiên từ
`tu-ngay` trở đi nếu cách không quá 183 ngày (`30/12 - 05/01` ra qua năm sau); xa hơn thì coi là gõ nhầm
và rơi về quy tắc gần hôm nay nhất, để schema báo "Ngày kết thúc phải từ ngày bắt đầu trở đi." Parse sai định dạng → trả lời ephemeral
`Ngày phải có dạng dd/mm, ví dụ 05/10.`

### 6.2 Nút "Xin nghỉ" và modal

- `buildEntryButtons` (dùng chung cho tin `/thong-bao` **và** tin nhắc điểm danh) thêm nút
  `🏖️ Xin nghỉ`, custom_id `ann:nghi-phep`. Cả hai tin nhận nút vì hàm này cố ý dùng chung - tách
  riêng là trái lý do nó tồn tại.
- Bấm nút → trả interaction response type `9` (MODAL), custom_id `modal:nghi-phep`, tiêu đề
  `Xin nghỉ`, ba Label (type 18) bọc Text Input (type 4): `tu-ngay` (short, điền sẵn hôm nay),
  `den-ngay` (short), `ly-do` (paragraph, không bắt buộc, max 255).
- Gửi modal → interaction type `5` (MODAL_SUBMIT). `interactionSchema` thêm nhánh này;
  `InteractionRouter` thêm `case`. Đọc giá trị qua `data.components[].component.{custom_id, value}`,
  rồi đi qua parser ngày và `LeaveService.create`. Trả lời ephemeral.

Danh tính lấy từ payload đã ký (`callerDiscordId`), không bao giờ từ custom_id.

## 7. Web

### 7.1 Màn điểm danh

- Nút `Xin nghỉ` trên đầu màn → dialog: hai ô chọn ngày "Từ ngày" / "Đến ngày" (mỗi ô là nút mở
  `Calendar` `mode="single"`), lý do (textarea, ≤255). Chọn "Từ ngày" thì "Đến ngày" theo luôn (nghỉ
  một ngày chỉ cần một lần chọn); đổi "Từ ngày" sang sau "Đến ngày" thì kéo "Đến ngày" theo; lịch
  "Đến ngày" khoá các ngày trước "Từ ngày". Ngày được đổi sang `YYYY-MM-DD` theo lịch của người chọn
  (DayPicker trả nửa đêm giờ máy, đi qua UTC sẽ lệch một ngày). Thành viên không chọn được ngày
  trước hôm nay; admin có thêm ô chọn thành viên (nút mở danh sách có tìm kiếm, không dấu cũng khớp)
  và được chọn ngày đã qua (D8).
- Lần nghỉ của chính mình (đang diễn ra hoặc sắp tới) hiện thành banner
  `Bạn đang nghỉ 05/10 - 12/10` + nút `Hủy nghỉ`.
- Ô có `source: 'leave'` hiện icon máy bay màu "Không" kèm nhãn `Không · Nghỉ phép` (nhãn cho trình đọc màn
  hình), để phân biệt với "Không" tự bấm. Bấm vào ô vẫn ghi được "Có" như bình thường.

### 7.2 `/thiet-lap`

Tab thứ ba `Nghỉ phép` (`?tab=leaves`): bảng lần nghỉ chưa hủy, chưa hết (thành viên, khoảng ngày,
lý do, người khai), nút `Khai hộ` và `Hủy` mỗi dòng. Component nằm trong `features/attendance`, export
qua `index.ts`.

## 8. Lỗi và trường hợp biên

| Trường hợp | Kết quả |
|---|---|
| Thành viên khai khoảng toàn ngày đã khoá | Tạo được, không phủ trận nào; dialog vẫn báo thành công. |
| Admin khai khoảng chứa ngày đã khoá / đã đánh | Phủ cả các ngày đó, xoá record cũ ở đó; đội hình ngày đã đánh không đổi (`releaseCharacterFromSession` tự bỏ qua). |
| Admin hủy lần nghỉ | Mọi ngày trong khoảng về "chưa phản hồi", kể cả ngày đã khoá. |
| Khai nghỉ khi đã trong đội hình ngày còn mở | Bị gỡ khỏi ô; ô có ghi chú giữ ghi chú. |
| Bấm "Có" trong lúc nghỉ | Record "Có" thắng ngày đó; các ngày khác vẫn nghỉ. |
| Hủy nghỉ chưa bắt đầu | Mọi ngày quay về chưa phản hồi; record bị xoá lúc khai không quay lại (D9). |
| Xoá thành viên | `Leave` cascade theo. |
| Xoá trận | Không ảnh hưởng `Leave`. |
| Bot: modal gửi khi người gọi không có nhân vật | Cùng message `ActorResolver` đang dùng cho `/diem-danh`. |

## 9. Kiểm thử

- `leave-coverage.ts`: bảng test cho luật 4.2 (trong/ngoài khoảng, biên ngày VN 23:59/00:00, khai
  trước/sau `closeAt`, hủy trước/sau `closeAt`, `attendanceClosedAt` vs `deadline`, admin khai /
  admin hủy vượt khoá, thành viên hủy lần admin khai) và ghép 4.3.
- `LeaveService`: quyền, bốn lỗi validate (400 chỉ với thành viên), transaction xoá record + gỡ đội
  hình ở đúng các ngày được phủ (thành viên: ngày còn mở; admin: mọi ngày), hủy idempotent.
- `AttendanceService`: `getRecords` / `getSummary` trả câu trả lời hiệu lực; record thắng lần nghỉ.
- `ReminderService`: người đang nghỉ không bị nhắc.
- Bot: parse ngày (có/không năm, qua năm, sai định dạng), nút mở
  modal, modal submit đi đúng service.
- Web: dialog (validate khoảng, admin chọn thành viên), banner, nhãn `Nghỉ phép`, tab Thiết lập.

## 10. Tài liệu phải cập nhật

`docs/architecture.md`: bảng module `attendance` và `discord-bot`, bảng endpoint, §5 model `Leave`
và cột `source`, §6 luật phủ, §1.1 sơ đồ bot (thêm modal submit). Comment trên model trong
`schema.prisma`.

## Nguồn

- Luật khoá ngày: `apps/api/src/modules/battle-sessions/session-schedule.ts` (`isAttendanceClosed`, `closingMoment`).
- Gỡ đội hình: `apps/api/src/modules/team-builder/team-builder.service.ts:273`
  (`releaseCharacterFromSession`).
- Reminder coi "có record" là đã trả lời: `apps/api/src/modules/discord-bot/reminder.service.ts`
  (`answered` set).
- Bot chưa nhận modal submit: `apps/api/src/modules/discord-bot/interaction.schema.ts:67`.
- Nút dùng chung: `apps/api/src/modules/discord-bot/entry-buttons.ts` (`buildEntryButtons`).
- RLS bảng mới: `docs/production.md` §5, `apps/api/prisma/migrations/20260925004158_enable_rls_on_tactics`.
- Discord modal (đã đọc 2026-10-04): https://docs.discord.com/developers/interactions/receiving-and-responding
  - "MODAL_SUBMIT" = 5; MODAL = 9 "Respond to an interaction with a popup modal"; "Not available for
  `MODAL_SUBMIT` and `PING` interactions."; modal `components` "Between 1 and 5".
- Text Input / Label (đã đọc 2026-10-04): https://docs.discord.com/developers/components/reference -
  "Text Inputs can only be used within modals and must be placed inside a Label"; response của Text
  Input gồm `custom_id` và `value`.
