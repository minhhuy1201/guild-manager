# Rà soát luồng người dùng, edge case và hiệu năng - Tổng quan

Ngày: 2026-09-07 · Phạm vi: toàn repo tại commit `ea2fb79` · Nguồn: bốn lượt quét song song theo bốn
vai (member trên web, admin trên web, bề mặt Discord, hiệu năng), sau đó đọc lại và xác minh trực
tiếp trên code từng mục nặng.

Khác với loạt spec `C1-C7` và `A1-A6` trước đó - vốn là **cơ hội làm sâu module** - loạt này là
**lỗi và chỗ vướng luồng**: những thứ cắn vào người dùng thật, không phải cơ hội tái cấu trúc.

## Quy ước mã số

Loạt spec cũ đã dùng `A1-A6` cho việc khác (`2026-08-21-a1-schedule-read-seam-design.md`). Để không
đụng, bản rà soát này đánh số theo vai:

| Tiền tố | Vai | Mã trong báo cáo HTML |
|---|---|---|
| `MB` | Member trên web | `M1-M6` |
| `AD` | Admin trên web | `A1-A6` |
| `DC` | Bề mặt Discord | `D1-D5` |
| `PF` | Hiệu năng | `P1-P4` |

**`AD1` trong tài liệu này chính là `A1` trong báo cáo HTML** - lỗi admin cuối cùng.

## Bảng tóm tắt

| | Vấn đề | Mức | Trạng thái |
|---|---|---|---|
| **AD1** | Không gì chặn xoá hoặc hạ quyền admin cuối cùng | Nghiêm trọng | Đã xác minh |
| **AD2** | Ô chọn giờ trận đọc múi giờ trình duyệt, không phải UTC+7 | Cao | Đã xác minh |
| **MB1** | Trang "Lịch sử điểm danh" chỉ đọc được tuần đang mở | Cao | Đã xác minh |
| **MB2** | `AUTH_SECRET` lệch tạo vòng lặp đăng nhập câm; tài liệu mô tả sai | Cao | Đã xác minh |
| **MB3** | Server Action không làm mới token, nút Có/Không chết cứng | Trung bình | Đã xác minh |
| **AD3** | Xoá thành viên cuốn theo cả ghi chú của ô đội hình | Trung bình | Đã xác minh |
| **AD4** | Ghi "Không" và gỡ khỏi đội hình không nằm trong một transaction | Trung bình | Đã xác minh |
| **AD5** | PUT đội hình và tên đội ghi đè toàn bộ, hai admin ghi đè nhau âm thầm | Trung bình | Đã xác minh |
| **DC1** | Nhắc điểm danh và thông báo lịch không chặn giới hạn ký tự của Discord | Trung bình | Đã xác minh |
| **DC2** | `/nhac-diem-danh` không dịch lỗi 403 thành câu tiếng Việt | Trung bình | Đã xác minh |
| **MB6** | Bị gỡ khỏi bang trông giống hệt hết phiên | Trung bình | Nghi ngờ |
| **PF1** | `ReactQueryDevtools` đi thẳng vào bundle production | Trung bình | Đã xác minh |
| **MB4** | Member vào route admin bị đá về `/` không một lời | Thấp | Đã xác minh |
| **MB5** | Callback OAuth báo sai "Bạn đã huỷ đăng nhập" | Thấp | Đã xác minh |
| **AD6** | Endpoint thông báo đội hình không kiểm số ảnh so với `matchCount` | Thấp | Nghi ngờ |
| **DC3** | Cron thiếu hàng `BotChannel` chỉ log warn | Thấp | Đã ghi nhận sẵn |
| **DC4** | `/thong-bao` và `/cau-hinh-kenh` không idempotent nếu Discord retry | Thấp | Nghi ngờ |
| **DC5** | Hạn 3 giây của Discord chưa từng được đo trên cold start | Cần đo | Đã xác minh |
| **PF2** | `snapdom` import tĩnh trong bundle đầu của `/xep-team` | Thấp | Nghi ngờ |
| **PF3** | Waterfall `weeks → formations` ở `/xep-team` | Thấp | Đánh đổi có chủ ý |
| **PF4** | Index và N+1: sạch ở quy mô hiện tại | Không có vấn đề | Đã xác minh |

## Thứ tự thực hiện đề nghị

```
AD1 ──► AD2 ──► MB1
 │
 └──► (gom một PR nhanh) PF1 · DC2 · AD6 · MB4 · MB5
 │
 └──► (cần bàn trước) AD4 · AD5 · DC5
 │
 └──► (độc lập, làm lúc nào cũng được) AD3 · MB2 · MB3 · DC1 · PF2
```

- **AD1 trước hết**: đây là lỗi duy nhất trong bản rà soát mà một lần bấm nhầm đưa hệ thống vào
  trạng thái không tự thoát ra được. Nó nhỏ, nằm gọn trong một service, không đụng ranh giới module
  nào.
- **AD2 trước MB1**: cả hai đều là chuyện thời gian. AD2 là sai âm thầm đang xảy ra ngay bây giờ;
  MB1 là tính năng thiếu. Sửa cái sai trước cái thiếu.
- **MB1 cần chốt spec trước khi viết code**: nó là mục duy nhất mà câu hỏi "trang này vốn định làm
  gì" chưa có câu trả lời trong tài liệu.
- **AD4 và AD5 cần bàn trước**: cả hai là câu hỏi về mô hình ghi dữ liệu chứ không phải bug đơn lẻ.
- **DC5 không sửa gì cả**, chỉ cần đo.

---

## AD1 - Không gì chặn xoá hoặc hạ quyền admin cuối cùng

**Mức: Nghiêm trọng. Trạng thái: đã xác minh.**

### Hiện trạng

API không có bất kỳ kiểm tra nào về số admin còn lại.

- `apps/api/src/modules/characters/characters.service.ts:128-143` - `update()` ghi thẳng `role` từ
  DTO vào `prisma.character.update({ where: { id }, data: input })`.
- `apps/api/src/modules/characters/characters.service.ts:177-183` - `remove()` chỉ gọi
  `ensureExists(id)` rồi xoá.
- `apps/api/src/modules/characters/characters.controller.ts` - không route nào có kiểm tra thêm.

Chốt chặn duy nhất nằm ở phía client:
`apps/web/features/members/components/member-form-dialog.tsx:90-91`

```ts
const isRoleLocked = ... || member?.discordId === session?.discordId;
```

Nó chỉ chặn **tự hạ quyền chính mình**. Nó không chặn:

- tự **xoá** chính mình,
- admin A hạ quyền admin B khi B là admin còn lại duy nhất,
- một request `PATCH /characters/:id` hay `DELETE /characters/:id` gọi thẳng, bỏ qua UI.

### Hậu quả

Bang còn 0 admin. Không ai sửa được lịch, thành viên hay đội hình nữa. Lối thoát duy nhất là sửa
`DISCORD_ADMIN_IDS` trong biến môi trường rồi deploy lại - không phải thứ người dùng tự làm được.

### Yêu cầu

1. `CharactersService.update` phải từ chối một thay đổi làm số `Character` có `role = ADMIN` về 0.
2. `CharactersService.remove` phải từ chối việc xoá `Character` cuối cùng có `role = ADMIN`.
3. Thông báo là một câu tiếng Việt hiển thị thẳng cho người dùng, đúng quy ước
   `architecture.md` §3.4 ("`message` đã là tiếng Việt và để hiện nguyên văn").
4. Quy tắc nằm ở **service**, không ở UI: đây là quy tắc nghiệp vụ, và UI không phải biên tin cậy
   được. UI vẫn nên chặn trước cho êm, nhưng không được là chốt chặn duy nhất.
5. `DISCORD_ADMIN_IDS` **không** được tính vào số admin: nó là lối cứu hộ ở tầng hạ tầng, không phải
   `Character`, và việc đếm nó vào sẽ cho phép hạ quyền admin thật cuối cùng.

### Tiêu chí nghiệm thu

- `PATCH /characters/:id` đổi `role` từ `ADMIN` sang `MEMBER` khi đó là admin cuối cùng: trả `400`
  với câu tiếng Việt, dữ liệu không đổi.
- `DELETE /characters/:id` trên admin cuối cùng: trả `400` với câu tiếng Việt, hàng không bị xoá.
- Cùng thao tác đó khi còn ít nhất một admin khác: thành công như cũ.
- Hạ quyền hoặc xoá một `MEMBER` không bao giờ bị chặn.
- Một `PATCH` không đụng tới `role` không bao giờ bị chặn, kể cả trên admin cuối cùng.

### Test còn thiếu

`characters.service.spec.ts` hiện không có ca nào cho hạ quyền hay xoá admin cuối. Theo luật dự án,
đây là bug fix nên phải **dựng lại được lỗi trước** rồi mới sửa.

### Ghi chú khi làm

- Đếm admin và ghi phải thấy cùng một trạng thái. Hai admin cùng lúc, mỗi người xoá một người, cả
  hai lệnh đều thấy "còn 2 admin" rồi cùng chạy là về 0. Đặt phép đếm và phép ghi trong cùng một
  `$transaction` hoặc dựa vào một ràng buộc ở tầng cơ sở dữ liệu.
- Nhánh đề nghị: `fix/last-admin-guard`.

---

## AD2 - Ô chọn giờ trận đọc múi giờ trình duyệt

**Mức: Cao. Trạng thái: đã xác minh.**

`apps/web/features/settings/lib/datetime-input.ts:11-35`

```ts
export function toInputValue(iso: string): string {
  const date = new Date(iso);
  return [date.getFullYear(), ..., pad(date.getHours()), ":", pad(date.getMinutes())].join("");
}
export function fromInputValue(value: string): string {
  return new Date(value).toISOString();
}
```

`getFullYear`/`getHours`/`getMinutes` đọc đồng hồ **máy người dùng**, và `new Date(value)` với chuỗi
không có `Z` cũng được parse theo giờ máy. Toàn bộ luồng tạo và sửa scrim
(`session-form-dialog.tsx`) đi qua đúng hai hàm này.

Backend thì ngược lại: cố định UTC+7 ở mọi nơi, qua `vnParts`/`shiftVnDate` trong
`packages/shared/lib/vn-time.ts`, và `session-schedule.ts` nói rõ là "độc lập với đồng hồ máy chủ".

**Hậu quả:** admin ngồi máy không đặt `Asia/Ho_Chi_Minh` gõ "20:30" thì lưu ra một mốc thời gian
khác, không lỗi, không cảnh báo. Tệ hơn: `isWithinDeadlineCap` chạy trên giá trị đã lệch nên nội bộ
trông vẫn nhất quán trong khi thực tế sai.

**Sửa:** quy đổi bằng offset +07:00 cố định, dùng lại các nguyên thủy đã có trong
`@guild/shared/lib` thay vì các getter giờ máy.

**Test còn thiếu:** CI hiện chạy ở múi giờ UTC nên đang che chính lỗi này. Cần ca test đặt `TZ` khác
Việt Nam.

---

## MB1 - Trang "Lịch sử điểm danh" chỉ đọc được tuần đang mở

**Mức: Cao. Trạng thái: đã xác minh. Cần chốt spec trước khi viết code.**

- `apps/web/features/attendance/api/attendance-api.ts:44-85` - `fetchBattleSessions()` gọi
  `GET /battle-sessions` không kèm `weekStart`; `fetchAttendanceRecords()` gọi
  `GET /attendance/records` cũng không kèm gì.
- `apps/api/src/modules/attendance/attendance.controller.ts:38-42` - `GET /attendance/records`
  **không có tham số tuần nào cả**.
- `apps/api/src/modules/attendance/attendance.service.ts:80-84` - `getRecords()` gọi
  `this.battleSessions.listByWeek()` không đối số, tức luôn là `getActiveWeek()`.
- `attendance-history-filters.tsx` chỉ có bộ lọc theo người, theo trạng thái và theo trận **trong
  tuần**; không có bộ chọn tuần.

`GET /battle-sessions` **đã** hỗ trợ `weekStart` qua `WeekStartQueryDto`; `/attendance/records` thì
chưa, và frontend không gửi ở cả hai chỗ.

**Hậu quả:** 22:00 thứ Bảy tuần lật, toàn bộ dữ liệu tuần cũ biến mất khỏi mắt member. Không tra
được "tuần trước tôi có điểm danh không", không có gì để đối chiếu khi tranh chấp.

**Câu hỏi phải chốt trước:** trang này vốn định làm gì. Hai hướng, chọn một:

- **Nếu chỉ phục vụ tuần đang mở**: đổi tên trang và tiêu đề cho đúng, ghi vào `architecture.md`.
  Đây là việc nhỏ.
- **Nếu đúng là lịch sử**: thêm `weekStart` vào `GET /attendance/records` (soi theo
  `WeekStartQueryDto` đã có), thêm bộ chọn tuần, gửi `weekStart` cho cả hai request, và **chuyển
  phân trang về server** - `attendance-log-table.tsx:92` đang phân trang ở client, chấp nhận được
  với dữ liệu một tuần nhưng không chấp nhận được với dữ liệu nhiều tuần. Khi đó xem lại index (xem
  PF4).

**Test còn thiếu:** không ca nào lấy dữ liệu của một tuần đã qua.

---

## MB2 - `AUTH_SECRET` lệch tạo vòng lặp đăng nhập câm

**Mức: Cao. Trạng thái: đã xác minh. Có phần phải sửa tài liệu.**

`apps/web/features/auth/core/access.ts:41` - `decideAccess` coi `role === null` là "chưa đăng nhập"
cho **mọi** route không phải trang đăng nhập, không riêng route admin. Khi `AUTH_SECRET` lệch giữa
hai app, `verifyJwt` hỏng cả access lẫn refresh token (cả hai đều verify bằng secret của web), nên
`proxy.ts:57-69` đá về `/dang-nhap` mà không kèm mã lỗi nào.

**Hậu quả:** member vừa đăng nhập Discord thành công, cookie đã ghi, request kế tiếp lại về trang
đăng nhập, không một dòng giải thích. Bấm đăng nhập lại thì lặp y hệt.

**Tài liệu đang sai:** `docs/architecture.md` §1.1 viết "bạn vẫn đăng nhập được nhưng mọi route admin
sẽ đá bạn về trang chủ". Thực tế nghiêm trọng hơn: **mọi** route đá về trang đăng nhập. Theo luật
"giữ spec, plan và code nhất quán", câu này phải sửa dù có sửa code hay không.

**Sửa (tuỳ chọn, sau khi sửa tài liệu):** phân biệt "chữ ký không hợp lệ" với "token hết hạn" để
hiện được một câu khác hẳn, kiểu "cấu hình sai, liên hệ quản trị viên", thay vì im lặng như một
phiên hết hạn bình thường.

---

## MB3 - Server Action không làm mới token

**Mức: Trung bình. Trạng thái: đã xác minh.**

- `apps/web/proxy.ts` là nơi **duy nhất** làm mới cặp token, và nó chỉ chạy khi điều hướng trang.
- `apps/web/features/attendance/api/attendance-api.ts:23-33` - Server Action đọc cookie rồi gọi
  `apiFetch` thẳng, không có bước làm mới.
- `apps/api/src/common/guards/jwt-auth.guard.ts:44` trả `UnauthorizedException('Bạn cần đăng nhập.')`.

**Hậu quả:** member mở tab điểm danh rồi để đó qua đêm (access token sống 1 ngày, refresh 7 ngày).
Sáng bấm "Có" thì nhận toast lỗi. Bấm lại vẫn lỗi. Phiên thật ra vẫn còn hạn, chỉ cần tải lại trang
là xong, nhưng không có gì nói cho họ biết điều đó, nên nó đọc như "app hỏng".

**Sửa:** gặp `401` từ Server Action thì kích hoạt tải lại phía client thay vì chỉ toast, để lần thử
lại thực sự khôi phục được phiên.

**Test còn thiếu:** không ca nào cho trạng thái access hết hạn nhưng refresh còn hạn.

---

## AD3 - Xoá thành viên cuốn theo cả ghi chú của ô đội hình

**Mức: Trung bình. Trạng thái: đã xác minh.**

`apps/api/prisma/schema.prisma:150-163` - `FormationSlot.character` khai `onDelete: Cascade`, nên
xoá một `Character` xoá luôn **cả hàng** `FormationSlot`, ghi chú đi theo.

Trong khi đó, đúng tình huống tương đương - người đó không còn tham gia nữa - thì hai chỗ khác lại
cố ý giữ ghi chú lại:

- `team-builder.service.ts:263-286` (`releaseCharacterFromSession`) dùng
  `updateMany({ data: { characterId: null } })` thay vì xoá hàng.
- `team-builder.service.ts:200-210` (`saveFormation`) lọc id treo mà vẫn giữ ô.

Cả hai đều có comment nói rõ: ghi chú mô tả vị trí, không mô tả con người.

**Hậu quả:** admin xoá một thành viên đang được xếp kèm ghi chú (kiểu "giữ chỗ chờ X vào muộn") thì
cả ô biến mất, ghi chú mất theo - trái đúng cái quy tắc phần còn lại của app đang bảo vệ.

**Sửa:** đổi `FormationSlot.characterId` sang `onDelete: SetNull` cho khớp ngữ nghĩa
`releaseCharacterFromSession` đã cài, và chỉ xoá hàng khi nó vừa trống người vừa không ghi chú -
đúng bất biến đã ghi trong `schema.prisma:150`.

**Cảnh báo migration:** đây là migration đổi hành vi khoá ngoại. Theo `CLAUDE.md`, migration phá huỷ
cần bước chuyển dữ liệu viết tay, không được để Prisma tự sinh.

---

## AD4 - Ghi "Không" và gỡ khỏi đội hình không nằm trong một transaction

**Mức: Trung bình. Trạng thái: đã xác minh. Cần bàn trước.**

`apps/api/src/modules/attendance/attendance.service.ts:195-217`

```ts
const record = await this.prisma.attendanceRecord.upsert({ ... });

if (!isPresent) {
  await this.teamBuilder.releaseCharacterFromSession(session, characterId);
}
```

Hai câu lệnh, hai round trip, không transaction. Nếu câu thứ hai hỏng (mạng, timeout, pool cạn) thì
request trả 500 nhưng câu trả lời "Không" **đã commit**, còn người đó vẫn nằm trong đội hình - đúng
trạng thái mà comment ngay phía trên nói là không được phép tồn tại.

**Sửa:** bọc cả hai trong một `$transaction` tương tác, truyền `tx` vào một biến thể của
`releaseCharacterFromSession`. `team-builder.service.ts:200` đã có tiền lệ nhận `tx`.

**Vì sao cần bàn trước:** chữ ký mới phải đi qua `team-builder.public.ts`, tức là mở rộng interface
công khai của một module để phục vụ một module khác. Đó là quyết định về seam, không phải một dòng
sửa.

**Test còn thiếu:** không ca nào cho việc bước gỡ đội hình thất bại.

---

## AD5 - PUT đội hình và tên đội ghi đè toàn bộ

**Mức: Trung bình. Trạng thái: đã xác minh. Cần bàn trước.**

- `team-builder.service.ts:178-247` (`saveFormation`)
- `team-builder.service.ts:315-327` (`saveTeamNames`)

Cả hai là "xoá sạch theo khoá rồi dựng lại từ payload", không so với thứ client đã đọc lúc mở trang.
Không có cột phiên bản, không có ETag, không có kiểm `updatedAt`.

**Hậu quả:** hai admin cùng mở một ngày đánh. Ai bấm lưu sau ghi đè sạch công của người kia. Không
xung đột, không cảnh báo, không hợp nhất - công của người thứ nhất biến mất và không ai được báo.

**Sửa (tối thiểu):** so một mốc `updatedAt` lúc tải với lúc lưu, và cảnh báo "có người vừa lưu trang
này" thay vì ghi đè im lặng.

**Vì sao cần bàn trước:** câu hỏi thật là hệ thống có cần khái niệm phiên bản hay không. Nếu quyết
định chấp nhận rủi ro vì bang chỉ có một hai admin, thì **phải ghi vào tài liệu** - hiện tại nó
không được cài mà cũng không được ghi nhận là rủi ro đã chấp nhận, đó mới là vấn đề.

**Test còn thiếu:** không ca nào cho hai lượt ghi đồng thời.

---

## DC1 - Nhắc điểm danh và thông báo lịch không chặn giới hạn ký tự

**Mức: Trung bình. Trạng thái: đã xác minh.**

- `discord-bot/reminder.ts:97-117` (`buildReminder`) dựng `content` từ một danh sách mention phẳng.
- `discord-bot/announcement.ts:74-97` (`buildAnnouncement`) dựng `embed.description` mỗi trận một
  khối.
- `discord-bot/discord-rest.ts:107-118` (`postMessage`) cũng không kiểm kích thước.

Không chỗ nào cắt hay chia lô. Giới hạn của Discord là 2000 ký tự cho `content` và 4096 cho
`embed.description`.

Chính comment ở `reminder.ts:68` đã gọi tên rủi ro này ("ba ngày mention là chỗ 2000 ký tự hết
chỗ") nhưng không có dòng nào xử lý.

**Hậu quả:** khi bang đông lên hoặc nhiều ngày dồn lại, Discord trả 400 và `DiscordApiError` nổi lên
thô. Sáng hôm đó không có tin nhắn nhắc nào, hoặc `/nhac-diem-danh` trả về "Có lỗi xảy ra..." chung
chung. Admin không có cách nào biết vì sao nếu không đọc log.

**Sửa:** chia nhỏ theo lô khi vượt ngưỡng, hoặc cắt danh sách tên kèm đuôi "+N khác". Nếu chọn cách
báo lỗi thay vì cắt thì phải là một câu tiếng Việt cụ thể, không phải câu chung.

**Test còn thiếu:** `reminder.spec.ts` không dựng tập `due` nào đủ lớn để chạm giới hạn.

---

## DC2 - `/nhac-diem-danh` không dịch lỗi 403 của Discord

**Mức: Trung bình. Trạng thái: đã xác minh.**

`reminder.service.ts:130-133` gọi `postMessage` không bọc `try/catch`;
`nhac-diem-danh.command.ts:36-59` gọi `deps.reminders.run()` cũng không bọc. Kênh bị xoá hoặc bot mất
quyền gửi thì admin nhận câu chung "Có lỗi xảy ra...".

Trong khi đó cùng tình huống 403 đó đã được xử lý ở hai chỗ khác:

- `cau-hinh-kenh.command.ts:17-19, 51-61` - có `CANNOT_POST`.
- `formation-announcer.service.ts:114-125` - cũng vậy.

Hai chỗ có xử lý, một chỗ quên. Đúng loại bất đối xứng mà `CLAUDE.md` gọi là dấu hiệu của một phần
trích xuất bị bỏ sót.

**Sửa:** bắt `DiscordApiError` với status 403 và dịch giống hệt hai chỗ kia. Nếu làm, cân nhắc rút
luôn phần dịch đó ra một chỗ dùng chung thay vì chép lần thứ ba.

### Đính chính sau khi thực hiện

Bản rà soát nói `cau-hinh-kenh` là một trong hai chỗ "làm đúng". Đọc lại lúc sửa thì không phải: nó
`catch` **mọi** lỗi rồi trả `CANNOT_POST` bất kể status, nên Discord trả 500 cũng bị báo cho admin
thành lỗi phân quyền - đẩy người ta đi sửa một thứ không hỏng. Chỉ `formation-announcer` thật sự
kiểm status.

Vì vậy DC2 làm rộng hơn một bậc so với mô tả ban đầu: `isDiscordForbidden` được dùng ở **cả ba**
chỗ, và `cau-hinh-kenh` tách câu trả lời làm hai - 403 giữ nguyên `CANNOT_POST`, còn lại là
`CANNOT_REACH` ("Discord đang gặp sự cố nên chưa lưu gì cả"). Hành vi *huỷ toàn bộ lệnh khi post
thất bại* giữ nguyên: nó là chủ ý, vì chưa chứng minh được bot post nổi thì không được lưu channel.

---

## MB4, MB5, MB6, AD6 - Nhóm nhỏ

**MB4 (Thấp, đã xác minh)** - `apps/web/app/xep-team/page.tsx:22-23` và
`apps/web/app/thiet-lap/page.tsx:21-22` gọi `redirect("/")` trần, không mã lý do. Người vừa bị hạ
quyền từ `ADMIN` xuống `MEMBER` mở bookmark cũ chỉ thấy trang mình quen dùng biến mất. Luồng đăng
nhập đã có sẵn quy ước `?error=` - dùng lại nó.

**MB5 (Thấp, đã xác minh)** - `apps/api/src/modules/auth/auth.service.ts:95-97`:

```ts
if (query.error || !query.code || !query.state) return this.errorUrl(AUTH_ERROR.denied, '/');
```

Một dòng gộp ba tình huống thành một câu. Người theo một link authorize cũ (mất `state`) bị nói là
họ đã bấm huỷ. Tách `query.error` (huỷ thật) khỏi callback dị dạng, cái sau map sang
`AUTH_ERROR.expired`.

**MB6 (Trung bình, nghi ngờ)** - `auth.service.ts:170-179` (`refresh`) ném
`UnauthorizedException` khi Discord ID không còn ứng với `Character` nào, nhưng
`proxy.ts:61-68` dùng `refreshRequest(refreshToken).catch(() => null)` nên nuốt nó y như nuốt lỗi
mạng. Người bị gỡ khỏi bang bị đá về đăng nhập không lý do; đăng nhập lại mới thấy
`khong-thuoc-bang`. Không phải ngõ cụt, nhưng thừa một vòng bối rối. Đánh dấu nghi ngờ vì chưa dựng
lại được đúng đường đi.

**AD6 (Thấp, nghi ngờ)** - `formation-announcer.service.ts:82-121` nhận `images: string[]` và đăng
tất cả lên Discord, không kiểm `images.length` so với `session.matchCount`. Client có
`CaptureCountError` canh, nhưng server thì không - đúng chỗ mà luật "validate ở biên" của dự án nói
phải canh. Một dòng so là đủ.

---

## DC3, DC4, DC5 - Discord, phần còn lại

**DC3 (Thấp, đã ghi nhận sẵn)** - `reminder.service.ts:83-91` trả `{status:'no-channel'}` và chỉ
`logger.warn` khi thiếu hàng `BotChannel`. Trên Vercel nó rơi vào log function không ai xem. Đây là
khoảng hở **đã được ghi nhận** ở `architecture.md` §8, và `/nhac-diem-danh` tồn tại chính là để bù.
Ghi lại ở đây cho đủ, không phải phát hiện mới.

**DC4 (Thấp, nghi ngờ)** - `/thong-bao` và `/cau-hinh-kenh` không có chốt idempotency. Ghi điểm danh
thì an toàn nhờ `upsert` trên `(characterId, sessionId)`, nhưng đăng thông báo lịch tuần thì một lần
Discord retry sẽ đăng hai lần. Discord chỉ retry khi timeout hoặc 5xx, mà hai lệnh này trả lời rất
nhanh trong trường hợp thường - rủi ro thấp, chưa dựng lại được.

**DC5 (Cần đo, không sửa)** - Đã grep xác nhận: **không có deferred response (type 5) ở bất kỳ đâu**
trong router. `INTERACTION_RESPONSE_TYPE` chỉ định nghĩa `pong`,
`channelMessageWithSource` và `updateMessage`. Mọi lệnh đều đọc và ghi cơ sở dữ liệu rồi trả lời
thẳng trong hạn 3 giây của Discord.

`apps/api/CLAUDE.md` ghi rõ đây là lựa chọn có chủ ý và có tài liệu thiết kế kèm theo. Cái nó **không**
lượng hoá là kịch bản đắt nhất: Vercel Function nguội, cộng Prisma connect lần đầu, cộng query. Đây
là chỗ duy nhất trong bản rà soát mà đề nghị là **đo**, không phải sửa. Nếu p99 chạm 3 giây thì người
dùng thấy "The application did not respond" và không có gì để họ thử lại.

---

## PF1-PF4 - Hiệu năng

Loạt commit tối ưu gần đây (`809c518`, `051e51e`, `44fe1fd`, `6cb8b7f`, `fabac8b`, `892f634`) đã
đóng hết các khoảng hở gộp query rõ ràng. Đây là những gì còn lại.

**PF1 (Trung bình, đã xác minh)** - `apps/web/components/providers.tsx:9, 42`:
`ReactQueryDevtools` import ở đầu module và render vô điều kiện. `initialIsOpen={false}` chỉ giấu
bảng chứ không loại code khỏi bundle. Mọi khách vào mọi route đều tải. Chặn sau
`process.env.NODE_ENV !== "production"` hoặc dùng mẫu lazy chính thức. Sửa nhanh, thắng ngay.

**PF2 (Thấp, nghi ngờ)** - `features/team-builder/lib/announce-capture.ts:1` import tĩnh
`@zumer/snapdom`, kéo vào qua `use-formation-announce.ts:12` rồi `use-formation-screen.ts` (được gọi
vô điều kiện bởi `team-builder-screen.tsx`). Thư viện này chỉ chạy khi admin bấm "Thông báo đội
hình", một hành động hiếm, nhưng nằm trong JS của mọi lượt mở `/xep-team`. Tách bằng `next/dynamic`.

**PF3 (Thấp, đánh đổi có chủ ý)** - `features/team-builder/hooks/use-formation-week.ts:58-63`:
`enabled: weeksQuery.isSuccess` khoá request đội hình cho tới khi danh sách tuần về. Comment giải
thích đây là cách né việc fetch hai lần (khoá `"current"` rồi khoá theo ngày). Trả giá một round
trip so với các query khác chạy song song. Chỉ đụng nếu chuẩn hoá được khoá cache - **đừng sửa mù**.

**PF4 (Không có vấn đề, đã xác minh)** - Đã đối chiếu từng mệnh đề `WHERE` và `ORDER BY` với các
index trong `schema.prisma`: `Character.guildClass` (L62), `BattleSession.weekStart` (L93),
`AttendanceRecord` `@@unique([characterId, sessionId])` + `@@index([sessionId])` (L115-116),
`FormationMatch @@unique([sessionId, matchIndex])` (L145), `FormationSlot @@index([characterId])`
(L163). Mọi truy vấn đều đi vào một index dẫn đầu bằng cột được lọc, ở quy mô vài chục đến vài trăm
hàng một tuần. Đã grep mọi call site Prisma trong `modules/**`: không query nào nằm trong vòng lặp.
Cold start cũng đúng mẫu - Swagger đã chặn sau `!isProduction` (`main.ts:62-72`), pool pg dựng một
lần và đăng ký `attachDatabasePool` (`prisma.service.ts:72-77`).

**Chỉ cần xem lại index nếu MB1 được sửa** và trang lịch sử bắt đầu phục vụ dữ liệu nhiều tuần.

---

## Những gì đã đúng, ghi lại để khỏi kiểm lại

Bề mặt Discord là phần được làm chắc nhất trong codebase. Không lỗi nghiêm trọng, không lỗi cao.

- Mọi lời từ chối đều ephemeral; lần rò duy nhất trong lịch sử (`0f2d1d3`) đã sửa và có test.
- `custom-id.ts:63-76` trả `null` chứ không ném khi gặp id cũ, và `attendance-board.ts:288` biến nó
  thành câu tiếng Việt rõ ràng.
- `ActorResolver.resolve` (`actor-resolver.ts:46-63`) không bao giờ ném; rescue admin không có
  `Character` được xử lý tử tế ở cả bảng riêng lẫn `/diem-danh-ho`.
- `main.ts:26-43` giữ `rawBody` đúng cho chữ ký Ed25519, và `DiscordSignatureGuard` fail closed.
- Ghi điểm danh dùng `upsert` trên `(characterId, sessionId)` nên Discord retry không nhân đôi.

Phía admin cũng có nhiều thứ đã đúng và đã có test:

- Guild War không xoá được; `deadline` và `matchCount` gửi lên đều bị từ chối `400`.
- Quy tắc luân phiên `matchCount` 2→1→2 neo ở 2026-08-31 đúng và có test.
- Cap deadline từ chối kèm câu tiếng Việt, không cắt ngầm.
- `getEditableWeeks` giới hạn đúng tuần đang mở và tuần kế, chặn ở cả service lẫn UI.
- Chuyển scrim sang tuần khác cập nhật `weekStart` và cắt bớt `FormationMatch` thừa trong một
  transaction, và UI bắt xác nhận trước khi mất dữ liệu.
