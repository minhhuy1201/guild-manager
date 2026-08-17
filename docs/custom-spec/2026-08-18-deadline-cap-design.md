# Trần hạn chót điểm danh — Design

Ngày: 2026-08-18 · Phạm vi: `packages/shared` + `apps/api` + `apps/web`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md) (spec này là nửa đầu
của C2; nửa sau — cờ lịch do server tính — ở [c2](./2026-08-18-c2-schedule-flags-design.md)).
Chồng lấn: [C3](./2026-08-18-c3-vn-clock-design.md) viết lại chính
`packages/shared/lib/battle-session.ts`. Làm C3 trước thì `deadlineCapFor` ở đây dùng được
`atVnTime`/`vnWeekday` thay vì tự cộng offset; làm spec này trước thì C3 phải chuyển thêm hai hàm.

Hạn chót điểm danh của mỗi trận vẫn do quản trị viên nhập, nhưng từ nay **có trần cứng**:
không được muộn hơn **10:00 sáng giờ VN của chính ngày đánh**. Riêng trận **Guild War** (Thứ 7) có
hạn chót **cố định 17:00 Thứ 5** cùng tuần, hệ thống sở hữu, quản trị viên không sửa được.

## Bối cảnh

Spec [`2026-08-05-admin-schedule-settings-design.md`](../superpowers/specs/2026-08-05-admin-schedule-settings-design.md)
§3 chốt rằng deadline **không có trần**:

> Form điền sẵn deadline theo luật cũ […]. Admin sửa được. Backend lưu **đúng giá trị admin gửi**.
> Trần cứng 17:00 Thứ 5 do đó **chuyển từ luật hệ thống thành giá trị mặc định**. Phương án "vẫn kẹp
> `min(deadline, 17:00 T5)` ở backend" bị loại vì nó âm thầm sửa dữ liệu admin vừa nhập.

**Spec này thay thế quyết định đó.** Lý do phản đối hồi ấy — *âm thầm sửa dữ liệu admin vừa nhập* —
vẫn đúng và vẫn được tôn trọng: ở đây trần được thực thi bằng cách **từ chối request kèm thông báo
tiếng Việt**, không phải bằng cách kẹp giá trị. Câu ở `docs/architecture.md` §6 ("`deadline` là
whatever the admin set — the backend does not clamp it") và ở `apps/api/prisma/schema.prisma` cần
sửa theo.

Hiện trạng liên quan:

- `packages/shared/lib/battle-session.ts` — `defaultDeadline(dateTime)`: 10:00 chính ngày đánh nếu
  trận diễn ra **trước Thứ 5**, ngược lại 17:00 Thứ 5 của tuần đó. Dùng ở hai nơi: điền sẵn form
  (`session-form-dialog.tsx:104`) và gieo deadline cho Guild War (`battle-sessions.service.ts:238`).
- `battle-sessions.service.ts:280-284` — `assertDeadlineBeforeBattle`, luật duy nhất đang có về
  deadline: hạn chót không được muộn hơn giờ đánh.
- `battle-sessions.service.ts:229-244` — `ensureGuildWar` upsert trận Guild War với
  `update: {}`, tức **đã tồn tại thì không đụng vào**.
- `battle-sessions.service.ts:176-178` — chỗ duy nhất hiện đang chặn quản trị viên sửa một field của
  Guild War (`opponent`).

Một hệ quả của luật cũ đáng nêu, vì spec này sửa nó: với trận **Thứ 5 20:30**, `defaultDeadline` trả
về **17:00 Thứ 5** — muộn hơn 10:00 Thứ 5, tức chính giá trị mặc định hôm nay đã vi phạm trần mới.

## Luật mới

Phát biểu chính xác, mọi mốc giờ tính theo **UTC+7 cố định**:

1. **Scrim** — quản trị viên nhập hạn chót tuỳ ý, với điều kiện
   `deadline ≤ min(10:00 VN của ngày đánh, giờ đánh)`.
   Vế thứ hai là luật `assertDeadlineBeforeBattle` đã có, giữ nguyên; nó chỉ ràng buộc thêm khi trận
   diễn ra **trước 10:00** (ví dụ trận 08:00 thì trần là 08:00, không phải 10:00).
2. **Guild War** — `deadline = 17:00 Thứ 5 của tuần chứa trận`, do hệ thống đặt. Quản trị viên gửi
   `deadline` cho trận Guild War là lỗi 400, không phải bị bỏ qua im lặng.

## Quyết định thiết kế

### 1. Từ chối, không kẹp

Vi phạm trần → `400` với thông báo tiếng Việt hiển thị nguyên văn cho người dùng (đúng contract ở
`architecture.md` §3.4). Không `Math.min`, không sửa ngầm.

Lý do: nó giữ nguyên phản đối đã ghi trong spec 2026-08-05 (deadline hiển thị khác cái vừa gõ là
loại bug khó hiểu nhất) mà vẫn có được ràng buộc, và khớp quy ước "misconfiguration fails loud" của
dự án. Frontend chặn trước bằng `max` trên ô nhập, nên đường đi bình thường của người dùng không bao
giờ chạm vào lỗi này — 400 là lưới an toàn cho request nặn tay và cho dữ liệu cũ.

### 2. Trần là **10:00 của ngày đánh**, không phải một mốc cố định trong tuần

Trần đi theo từng trận, nên mỗi ngày một trần khác nhau — đúng như yêu cầu "deadline từng ngày sẽ
khác nhau". Không còn khái niệm "trần chung cả tuần 17:00 Thứ 5" cho scrim; mốc 17:00 Thứ 5 từ nay
**chỉ còn là luật riêng của Guild War**.

### 3. Deadline của Guild War do hệ thống sở hữu

Trận Guild War là bất biến của bang (`2026-08-05` §2). Deadline của nó vì thế thuộc cùng nhóm với
`dateTime` và `isGuildWar`: dữ liệu hệ thống, không phải input.

Hệ quả cụ thể:

- `ensureGuildWar` đặt `deadline: guildWarDeadline(weekStart)` khi **tạo**, và — khác hôm nay —
  cũng **ghi đè lại trong nhánh `update`**, để một hàng cũ lệch luật tự chỉnh về đúng ở lần đọc kế
  tiếp. Các field khác vẫn không đụng tới (quản trị viên có thể đã dời giờ đánh).
- `PATCH /battle-sessions/:id` với `deadline` khác `undefined` trên một trận Guild War → 400.
- Nếu quản trị viên dời `dateTime` của Guild War sang tuần khác, `weekStart` đổi theo (logic đã có ở
  `update`), và deadline được tính lại từ `weekStart` mới.

Phương án đã cân nhắc và loại: **không lưu deadline của Guild War, suy ra khi đọc**. Loại vì
`AttendanceService.mark()` đọc deadline qua `BattleSessionsService.findById()` và so sánh trực tiếp;
để một trận có deadline lưu trong cột còn một trận suy ra lúc chạy sẽ đẻ ra hai đường đọc cho cùng
một giá trị. Cột `deadline` vẫn là nguồn đọc duy nhất, chỉ khác ở chỗ ai được ghi vào nó.

### 4. Luật sống ở `packages/shared`, service là nơi phán quyết cuối

Trần phụ thuộc `dateTime`, nên cả form lẫn backend đều cần cùng một phép tính. Theo quy ước
"`packages/shared` sở hữu mọi shape và mọi luật validate đi qua dây", hai hàm mới vào
`packages/shared/lib/battle-session.ts`:

```ts
/** Hạn chót muộn nhất được phép của một trận scrim: 10:00 VN ngày đánh, và không quá giờ đánh. */
export function deadlineCapFor(dateTime: Date): Date;

/** Hạn chót cố định của trận Guild War một tuần: 17:00 Thứ 5 của tuần đó. */
export function guildWarDeadline(weekStart: Date): Date;
```

`createBattleSessionSchema` thêm một `.refine` cross-field cho cặp `dateTime` + `deadline`.
`updateBattleSessionSchema` là `.partial()`, nên khi PATCH chỉ gửi một trong hai field schema không
đủ dữ liệu để kết luận — **service vẫn là nơi phán quyết cuối**, kiểm tra trên cặp giá trị đã trộn
với hàng hiện có (`battle-sessions.service.ts:180-189` đã trộn sẵn). Schema chỉ bắt sớm trường hợp
gửi đủ cả hai.

### 5. `defaultDeadline` đổi nghĩa: gợi ý = chính cái trần

Với scrim, giá trị điền sẵn từ nay là `deadlineCapFor(dateTime)` — muộn nhất có thể, vì đó cũng là
lựa chọn hợp lý nhất trong đa số trường hợp và không bao giờ vi phạm trần.

`defaultDeadline` cũ (nhánh "17:00 Thứ 5 cho trận từ Thứ 5 trở đi") **bị xoá**: nhánh đó vừa vi phạm
trần mới với trận Thứ 5, vừa chỉ còn một người dùng thật là Guild War — mà Guild War nay có
`guildWarDeadline` riêng. Xoá luôn `defaultDeadline` và sửa hai call site.

## Thay đổi `packages/shared`

`lib/battle-session.ts`:

- Thêm hằng `DEADLINE_CAP_HOUR = 10`, `GUILD_WAR_DEADLINE_HOUR = 17`,
  `THURSDAY_OFFSET_FROM_MONDAY = 3`.
- Thêm `deadlineCapFor(dateTime)`: `min(shiftVnDate(dateTime, 0, 10, 0), dateTime)`.
- Thêm `guildWarDeadline(weekStart)`: `shiftVnDate(weekStart, 3, 17, 0)`.
- Xoá `defaultDeadline`, `vnIsoWeekday`, `THURSDAY`, `WEEK_CUTOFF_HOUR`,
  `EARLY_SESSION_DEADLINE_HOUR`. `shiftVnDate` giữ nguyên.

`schemas/battle-session.schema.ts`:

```ts
export const createBattleSessionSchema = z
  .object({ dateTime: isoDateTime, deadline: isoDateTime, opponent })
  .refine(
    ({ dateTime, deadline }) =>
      new Date(deadline).getTime() <= deadlineCapFor(new Date(dateTime)).getTime(),
    {
      path: ["deadline"],
      message: "Hạn chót điểm danh không được muộn hơn 10:00 sáng ngày đánh.",
    }
  );
```

`updateBattleSessionSchema` vẫn là `.partial()` — lưu ý `ZodObject.partial()` không dùng được sau
`.refine()`, nên giữ object gốc thành một biến riêng rồi `.partial()` từ nó, và gắn `.refine()` cho
bản create.

Sau khi sửa: `pnpm --filter @guild/shared build` trước khi API nhận thay đổi lúc chạy.

## Backend

`battle-sessions.service.ts`:

- Thêm `assertDeadlineWithinCap(deadline, dateTime)` — thay thế `assertDeadlineBeforeBattle`, vì
  trần mới đã bao hàm luật cũ (`cap ≤ dateTime` theo định nghĩa). Thông báo:
  `'Hạn chót điểm danh không được muộn hơn 10:00 sáng ngày đánh.'`
- `create()` — gọi `assertDeadlineWithinCap` thay cho `assertDeadlineBeforeBattle`.
- `update()` — thêm, ngay cạnh chỗ chặn `opponent` của Guild War:

  ```ts
  if (current.isGuildWar && input.deadline !== undefined) {
    throw new BadRequestException(
      'Hạn chót của trận Guild War cố định 17:00 Thứ 5, không sửa được.'
    );
  }
  ```

  Với Guild War, `deadline` đem đi ghi là `guildWarDeadline(weekStart)` (tính từ `weekStart` sau khi
  đã xử lý việc dời tuần), không phải `current.deadline`. Với scrim, giữ nguyên logic trộn hiện có
  rồi `assertDeadlineWithinCap`.
- `ensureGuildWar()` — `create.deadline` và `update.deadline` đều là `guildWarDeadline(weekStart)`;
  `update` từ `{}` thành `{ deadline: guildWarDeadline(weekStart) }`.

Không có thay đổi schema database, không có migration.

### Thông báo lỗi

| Tình huống | Mã | Thông báo |
|---|---|---|
| Scrim, deadline muộn hơn 10:00 ngày đánh | 400 | `Hạn chót điểm danh không được muộn hơn 10:00 sáng ngày đánh.` |
| Scrim đánh trước 10:00, deadline muộn hơn giờ đánh | 400 | như trên (trần chính là giờ đánh) |
| PATCH `deadline` lên trận Guild War | 400 | `Hạn chót của trận Guild War cố định 17:00 Thứ 5, không sửa được.` |

## Frontend

`features/settings/components/session-form-dialog.tsx`:

- `handleDateTimeChange` dùng `deadlineCapFor` thay `defaultDeadline`.
- Ô hạn chót truyền thêm `max` = `toInputValue(deadlineCapFor(dateTime))`, để trình duyệt chặn trước
  khi submit; `DateTimeField` cần nhận và chuyển tiếp prop `max` xuống `<input>`.
- Khi `isGuildWar`: **ẩn ô hạn chót**, thay bằng một dòng chỉ đọc
  `Hạn chót: 17:00 Thứ 5 (cố định)`, và `handleSubmit` không gửi field `deadline` cho Guild War.
  Đây là lý do ô `opponent` đã bị ẩn ở `session-form-dialog.tsx:159` — cùng một khuôn.
- Ô hạn chót thêm dòng mô tả nhỏ: `Muộn nhất 10:00 sáng ngày đánh.`

`features/settings/components/session-row.tsx` không đổi — nó chỉ hiển thị giá trị server trả về.

`apps/web/lib/__tests__/session-deadline.test.ts` đang test `defaultDeadline`; đổi sang
`deadlineCapFor` và `guildWarDeadline`.

## Dữ liệu cũ

Hàng đang vi phạm trần mới tồn tại thật: mọi scrim Thứ 5 tạo bằng giá trị điền sẵn đều có deadline
17:00 Thứ 5 > 10:00 Thứ 5.

- **Tuần đã qua**: để nguyên. Chúng là bản ghi lịch sử, quản trị viên không sửa được
  (`assertEditableWeek`), và deadline chỉ còn tác dụng hiển thị.
- **Tuần đang mở và tuần kế**: một script chạy tay một lần, kẹp `deadline = min(deadline, cap)` cho
  scrim và đặt lại `deadline = guildWarDeadline(weekStart)` cho Guild War. Đặt cùng chỗ với
  `prisma/seed.ts`, chạy bằng `PRISMA_ENV_FILE` như các lệnh Prisma khác
  (`docs/production.md` §3). Guild War không cần script nếu chấp nhận nó tự chỉnh ở lần
  `listByWeek` kế tiếp — nhưng chạy script vẫn rẻ hơn là đi giải thích một deadline lệch.

Đây là lần duy nhất dự án kẹp giá trị deadline; nó là thao tác di trú dữ liệu một lần, không phải
luật chạy thường trực, nên không mâu thuẫn với quyết định §1.

## Edge case

- **Trận trước 10:00** — trần là giờ đánh. Trận 08:00 với deadline 09:00 bị từ chối.
- **Deadline đúng 10:00:00.000** — hợp lệ (so sánh `≤`).
- **Dời giờ đánh sang ngày khác mà không đổi deadline** — `update()` kiểm tra cặp
  `(deadline hiện có, dateTime mới)`, nên dời trận từ Thứ 5 sang Thứ 3 với deadline 17:00 Thứ 5 sẽ
  bị từ chối. Đúng ý: người dùng phải chọn lại hạn chót cho ngày mới.
- **Dời Guild War sang tuần khác** — deadline tính lại từ `weekStart` mới trong cùng transaction.
- **Guild War bị dời sang một ngày trong tuần khác Thứ 7** — deadline vẫn là 17:00 Thứ 5 của tuần
  chứa nó; nếu bị dời tới Thứ 2/Thứ 3 thì deadline rơi vào **sau** giờ đánh. Chấp nhận: luật Guild
  War được phát biểu theo tuần, và dời Guild War khỏi Thứ 7 không phải kịch bản thật. Không thêm
  luật chặn để tránh đẻ ra một trường hợp không ai gặp.
- **Điểm danh sau hạn** — không đổi. `AttendanceService.mark()` vẫn dùng `isDeadlinePassed` trên cột
  `deadline`, và token admin vẫn bỏ qua được hạn.

## Kiểm thử

`packages/shared` chưa có bộ test riêng; các hàm mới được phủ từ hai phía:

- `apps/web/lib/__tests__/session-deadline.test.ts` (Vitest, `TZ=Asia/Ho_Chi_Minh`) — `deadlineCapFor`
  cho trận trước 10:00, đúng 10:00, sau 10:00, và ở ranh giới nửa đêm giờ VN; `guildWarDeadline` cho
  vài `weekStart` khác nhau, gồm một tuần vắt qua mốc đổi tháng.
- `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts` (Jest):
  - `create` từ chối deadline muộn hơn trần, chấp nhận deadline đúng bằng trần.
  - `create` với trận 08:00 và deadline 09:00 → từ chối.
  - `update` chỉ đổi `dateTime` sang ngày khác khiến deadline cũ vượt trần → từ chối.
  - `update` gửi `deadline` lên Guild War → 400 với thông báo riêng.
  - `update` đổi `dateTime` của Guild War sang tuần khác → deadline được ghi lại theo tuần mới.
  - `ensureGuildWar` ghi đè deadline của một hàng Guild War đang lệch luật.

## Ngoài phạm vi

- **Cờ `isDeadlinePassed` trong response.** Frontend đang tự tính lại từ `deadline` thô ở hai chỗ
  (`features/attendance/api/attendance-api.ts:33`, `hooks/use-deadline-refresh.ts:42`) dù tài liệu
  bảo là "mirror cờ API gửi về" — cờ đó chưa tồn tại. Việc riêng, không giải quyết ở đây.
- **Trần cho `dateTime`.** Giờ đánh vẫn nhập tự do trong hai tuần được phép.
- **Thông báo cho thành viên khi hạn chót đổi.** Không có hệ thống thông báo.
