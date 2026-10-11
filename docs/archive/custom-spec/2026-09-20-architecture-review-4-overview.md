# Rà soát kiến trúc đợt 4 (A1, W1, T1, S1, X1, D1, C1 + W2) — Tổng quan

Ngày: 2026-09-20 · Phạm vi: toàn repo · Nguồn: rà soát `apps/api/src` (trừ `generated/`),
`apps/api/prisma`, `apps/web`, `packages/shared`, `docs/architecture.md` ở commit `b260ccd`.

Bảy cơ hội **làm sâu module** (deepening) cộng một fix behaviour. Phạm vi do người đặt hàng giới
hạn: *refactor nhưng giữ nguyên business logic, không over-engineer, kiểm tra kĩ*. Không mục nào
thêm module, thêm lớp trừu tượng hay thêm dependency; mọi thay đổi nằm gọn trong interface đang có.

Ba đợt trước — [C1–C7](./2026-08-18-architecture-review-overview.md),
[A1–A6, W1–W6](./2026-08-21-architecture-review-2-overview.md) và
[A–F](./2026-09-06-architecture-review-3-overview.md) — **đã triển khai xong toàn bộ**. Đợt này chỉ
liệt kê friction **còn lại** và code thêm sau `809c518`, và không mục nào đảo lại quyết định của ba
đợt trước.

Từ vựng dùng xuyên suốt (giống ba đợt trước): *module* (thứ có interface và implementation, ở mọi
quy mô), *interface* (mọi thứ người gọi phải biết để dùng đúng), *seam* (nơi interface nằm), *depth*
(lượng hành vi trên một đơn vị interface), *leverage* (cái người gọi được lợi), *locality* (cái
người bảo trì được lợi).

## Bảng tóm tắt

### `apps/api` + `packages/shared`

| | Vấn đề | Mức |
|---|---|---|
| **A1** | Preamble check admin chép nguyên văn ở **5** slash command; bỏ quên một vế là lỗ phân quyền im lặng, không phải test đỏ | Strong |
| **T1** | `stubSchedule` tự suy `isAttendanceClosed` chỉ theo deadline → **nửa luật "công bố đội hình là đóng ngày" (#128) không spec nào của `AttendanceService` chạm tới**; `vn()` chép 4 bản | Strong |
| **D1** | Comment `schema.prisma` nói cap 10:00 và Guild War 12:00 **Thứ 6**, code là 11:00 và 11:00 **Thứ 7** | Strong |
| **S1** | Cùng con số "Thứ 7 cách Thứ 2 5 ngày" có 3 bản, một bản đổi tên nên grep không thấy; `"11:00"` đồng bộ tay với `DEADLINE_HOUR` | Worth exploring |
| **X1** | 3 type không caller nào, 3 hằng số export mà chỉ file đó đọc, env `APP_TIMEZONE` khai báo mà không dòng code nào đọc | Worth exploring |
| **C1** | `new Date()` còn đúng một chỗ ngoài seam `Clock`, trong khi luật ghi là "never" | Worth exploring |

### `apps/web`

| | Vấn đề | Mức |
|---|---|---|
| **W1** | `authHeader()` chép nguyên văn 4 bản, kèm comment nêu lý do **không đúng** | Strong |
| **W2** | Save đội hình không giao 401 cho `useSessionRecovery`, ba đường ghi khác thì có | Đổi behaviour |

## Từng mục

### A1 — Gom preamble check admin của slash command

Năm command chép ba bước giống nhau từng ký tự:

```ts
const resolved = await deps.actors.resolve(callerDiscordId(interaction));

if (!resolved) return ephemeralText(NOT_LINKED);
if (!canManageGuild(resolved.actor.role)) return ephemeralText(ADMIN_ONLY);
```

- `commands/thong-bao.command.ts:33-36`
- `commands/diem-danh-ho.command.ts:46-49`
- `commands/nhac-diem-danh.command.ts:111-114`
- `commands/cau-hinh-kenh.command.ts:56-59`
- `commands/chao-mung.command.ts:75-78`

Chỉ chuỗi `ADMIN_ONLY` khác nhau, và khác nhau **có chủ ý** — mỗi command từ chối bằng câu của nó.
Slash command không có guard nào tương đương `AdminGuard`, nên command thứ sáu chép tiếp là đường
mặc định.

**Giải pháp.** `discord-bot/require-admin.ts` giữ một hàm thuần:

```ts
export type AdminCheck =
  | { ok: true; caller: ResolvedActor }
  | { ok: false; reply: CommandReply };

export async function requireAdmin(
  interaction: ApplicationCommandInteraction,
  deps: CommandDeps,
  adminOnly: string,
): Promise<AdminCheck>;
```

Command gọi một dòng và `return check.reply` khi bị từ chối; `diem-danh-ho` vẫn lấy được người gọi
qua `check.caller.actor`. Union có tag nên thêm nhánh mới là lỗi compile, không phải nhánh bị bỏ quên.

Đặt cạnh `reply.ts` chứ không trong `commands/`, vì đúng lý do `reply.ts` đã ghi: router import
command registry, nên helper mà command cần phải nằm ngoài router.

**Không đụng** `attendance-board.ts:207`: chỗ đó gọi `canManageGuild` để quyết định hiện nút nào,
không phải preamble từ chối.

**Depth.** Interface nhỏ hơn cái nó thay: người gọi học một hàm ba tham số thay vì bốn dòng và hai
hằng số. Test: `__tests__/require-admin.spec.ts` phủ cả hai nhánh từ chối và cả thứ tự giữa chúng —
người chưa gắn nhân vật không bị nói là thiếu quyền.

### T1 — Fidelity của fixture test, và gom `vn()`

`stubSchedule` (`attendance/__tests__/attendance.service.spec.ts:113-127`) dựng cờ bằng tay:

```ts
isAttendanceClosed: now.getTime() > new Date(found.deadline).getTime(),
```

Luật thật có **hai** vế (`session-schedule.ts:323-329`, vế thứ hai vào từ #128):

```ts
return closedAt !== null || isDeadlinePassed(deadline, now);
```

Hệ quả: đường "admin công bố đội hình → ngày đóng ngay, bất kể deadline" **không spec nào của
`AttendanceService` chạm tới**, và fixture còn tiếp tục lệch mỗi lần luật đổi. Đây là mục duy nhất
trong đợt này che một khoảng trống hành vi, không chỉ trùng lặp.

**Giải pháp.** `stubSchedule` gọi thẳng `isAttendanceClosed`, nhận thêm `closedByHand` theo session
id. Hai test mới: member bị từ chối sau khi công bố dù deadline còn phía trước, admin vẫn sửa được.
Trả fixture về công thức cũ thì test thứ nhất đỏ — đã kiểm.

`isAttendanceClosed` được re-export qua `battle-sessions.public.ts`: spec của attendance là caller
thứ hai, và phương án còn lại đúng là bản chép vừa lệch.

`vn()` chép 4 bản (`attendance:20`, `battle-sessions:18`, `session-schedule:24`, `team-builder:15`)
→ `apps/api/src/__tests__/vn-date.ts`. Hợp lệ với `eslint-plugin-boundaries` (`src` là element
`app`; rule chỉ chặn import **vào** ruột một module) và `testRegex` `.*\.spec\.ts$` không nhặt file
helper làm suite.

### D1 — Comment `schema.prisma` nói sai luật deadline

`apps/api/prisma/schema.prisma` (trước): cap **10:00** ngày đánh, form prefill **12:00** hôm trước,
Guild War **12:00 Thứ 6**.

Code: cap **11:00** ngày đánh và không quá giờ đánh, Guild War **11:00 Thứ 7**
(`packages/shared/lib/battle-session.ts:14,17,52`; `schemas/battle-session.schema.ts:24-28`;
`docs/architecture.md:546-551`).

Comment sai còn chảy vào doc comment của Prisma client sinh ra
(`generated/prisma/models/BattleSession.ts:790`), nên nó hiện trên tooltip IDE của bất cứ ai đọc
field đó. Chỉ sửa comment, không migration, không đổi giá trị.

### S1 — Một hằng số cho "Thứ 7 cách Thứ 2 5 ngày" và cho giờ deadline

Ba bản độc lập của cùng con số: `SATURDAY_OFFSET_FROM_MONDAY = 5`
(`packages/shared/lib/battle-session.ts:17`, private), bản y hệt ở `session-schedule.ts:27`, và
`MONDAY_TO_SATURDAY = 5` (`attendance/lib/history-weeks.ts:13`) — tên khác nên grep không nối được
ba chỗ. Thêm `DEFAULT_DEADLINE_TIME = "11:00"` (`session-form-dialog.tsx:35`) đồng bộ tay với
`DEADLINE_HOUR = 11`.

**Giải pháp.** Bỏ `private` khỏi hai hằng số đã có trong `packages/shared/lib/battle-session.ts`;
`session-schedule.ts`, `history-weeks.ts` và `session-form-dialog.tsx` đọc từ đó. Form dựng
`DEFAULT_DEADLINE_TIME` từ `DEADLINE_HOUR`, nên prefill không bao giờ là giá trị `deadlineCapFor` từ
chối. Không đổi một giá trị nào.

### X1 — Interface public rộng hơn thứ có người dùng

Đã grep từng cái trên `apps/**` + `packages/**` (trừ `generated/`, `coverage/`):

- Không caller nào → **xoá**: `WeekStartQuery` (`battle-session.schema.ts:66`),
  `SaveTeamNamesInput` (`formation.schema.ts:47`), `AssignmentInput` (`formation.schema.ts:64`).
- Chỉ chính file đó đọc → **bỏ `export`**, giữ hằng số: `INVALID_WEEK_MESSAGE`,
  `MATCH_COUNT_MESSAGE`, `DEFAULT_REDIRECT`.
- `APP_TIMEZONE` (`env.validation.ts:82`): khai báo, có default, **không dòng code nào đọc**. Nó còn
  ngược thiết kế đã ghi ở `vn-time.ts:4-5` — giờ VN là offset cố định, không tra timezone database.
  Xoá khỏi env schema, `.env.example`, hai bảng env trong docs, và snippet trong
  `apps/api/docs/backend.md`.
- **Giữ** `VnParts` (`vn-time.ts:16`): nó là kiểu trong chữ ký `vnParts`/`fromVnParts` đang export.

Đây là làm sâu theo đúng định nghĩa: interface nhỏ lại, hành vi không đổi.

### C1 — `new Date()` ra khỏi seam `Clock`

`common/filters/all-exceptions.filter.ts:66` là chỗ duy nhất còn gọi `new Date()` ngoài
`common/clock/`, trong khi `docs/architecture.md:601` và `apps/api/CLAUDE.md` nói "never". Một luật
tuyệt đối có đúng một ngoại lệ không ghi chú thì lần sau không ai biết luật còn hiệu lực.

Filter dựng tay ở `main.ts`, `ClockModule` là `@Global()`, nên:

```ts
app.useGlobalFilters(new AllExceptionsFilter(app.get(Clock)));
```

giống `app.get(Reflector)` ngay dòng dưới. Spec nay stamp `FixedClock` và assert `timestamp` — việc
trước đó không làm được.

### W1 — Một `authHeader` cho cả bốn Server Action module

`authHeader()` chép nguyên văn ở `members-api.ts:20-30`, `attendance-api.ts:23`,
`team-builder-api.ts:30`, `battle-sessions-api.ts:19`, mỗi bản ném cùng câu
`"Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."` với 401. Comment nói không share được vì
file `"use server"` chỉ export được async function.

**Lý do đó không đúng.** Giới hạn nằm ở cái file `"use server"` **export**, không phải cái nó
import. `features/auth/api/session.ts` chỉ có `import "server-only"`, không có `"use server"` — và
`getAccessToken` đã đi đúng đường đó từ đầu.

**Giải pháp.** `authHeader` về `features/auth/api/session.ts` cạnh `getAccessToken`, re-export qua
`features/auth/server.ts`. Bốn file kia import. Câu tiếng Việt và status 401 giữ nguyên;
`features/auth/api/__tests__/auth-header.test.ts` chốt cả câu chữ và status — điều không ai test
trong suốt thời gian helper tồn tại bốn bản. Đoạn nói về "trùng lặp có chủ ý" trong
`apps/web/docs/frontend.md` được viết lại.

### W2 — Save đội hình recover 401 (đổi behaviour, commit riêng)

`handleSave` (`use-formation-draft.ts:367-381`) chỉ xử lý 409; mọi lỗi khác rơi vào `catch` rỗng.
Chỉ `proxy.ts` đổi được refresh token và nó chỉ chạy khi điều hướng, nên token hết hạn giữa lúc xếp
team thì bấm lại bao nhiêu lần cũng lỗi, và không gì nói rằng chỉ cần reload.
`attendance-grid.tsx:214`, `member-attendance-card.tsx:131` và `components/shared/mutation-form.tsx`
đã giao 401 cho `useSessionRecovery` từ đầu; đường save đội hình là chỗ bất đối xứng.

`recoverSession(error)` được gọi trong `catch`, nhánh 409 giữ `refetchFormations()` và `return`
trước — 409 không phải 401 nên hai nhánh không chồng nhau. Nháp giữ nguyên trong cả hai đường, nên
việc đang làm sống qua lần điều hướng. Trả `catch` về bản cũ thì test 401 mới đỏ — đã kiểm.
`frontend.md` nay ghi luật cho mọi đường ghi sau này.

## Thứ tự thực hiện

```
S1 ──► X1 ──► A1 ──► T1 ──► C1        (apps/api + shared)
W1 ──► W2                              (apps/web, độc lập với nhánh trên)
D1                                     (chỉ comment, làm lúc nào cũng được)
```

`S1` và `X1` đổi `packages/shared` nên đi trước mọi mục chạm hai app, và đi liền nhau để chỉ
`pnpm --filter @guild/shared build` một lần.

### Nếu chỉ làm được một việc

**T1.** Bảy mục còn lại làm code sạch hơn; mục này cho biết code còn đúng hay không — nửa luật đóng
điểm danh đang không có test nào. Nó cũng rẻ nhất trong nhóm Strong.

## Những gì rà soát **không** tìm thấy vấn đề

Ghi lại để khỏi rà lại. Deletion test nói độ phức tạp chỉ *chuyển chỗ*, không tụ lại.

**Backend**

- `battle-sessions.codec.ts` / `attendance.codec.ts` — mỏng vì rule `verifyResponse` lặp ở mọi
  response, không phải do sai sót.
- `BotChannelService` — comment `:14-16` đã tự nhận mỏng có chủ ý.
- `characters.service.ts:240` ghi `formationSlot` (bảng của team-builder) và
  `FormationAnnouncerService` nằm trong `discord-bot` — cả hai đã ghi rõ vòng phụ thuộc chúng đang
  tránh (`characters.service.ts:222-225`, `formation-announce.controller.ts:10-18`). **Không đụng.**
- `purgeExpiredFormations` public mà chỉ có caller nội bộ — spec gọi thẳng, đóng lại không đổi gì.
- `listByWeek` write-on-read — **đã đóng ở đợt 3**: `reconcileGuildWar` nay chỉ ghi khi hàng thiếu
  hoặc cũ (`isGuildWarCurrent`).
- `pad()` bốn bản (`session-schedule.ts:61`, `vn-format.ts:8`, `history-weeks.ts:30`,
  `datetime-input.ts:18`) — ba dòng, gom lại đắt hơn giữ.

**Frontend**

- Năm hook bọc `useQuery`/`useMutation` của team-builder — mỏng vì rule layering ở
  `apps/web/docs/frontend.md:117-119` bắt buộc.
- `features/team-builder/lib/` — vẫn đúng như kết luận đợt 2: các module một-caller đang cô lập luật
  quyết định, gom lại chỉ chuyển chỗ và làm test đắt hơn.
- `history-weeks.ts` dựng danh sách tuần cho dropdown — dữ liệu hiển thị từ `weekStart` đã fetch,
  không phải suy lại luật deadline. Sau S1 nó dùng hằng số shared là đủ.
- Hai `readAuthSecret`/`getAuthSecret` khác nhau — **có chủ ý**, đã ghi lý do trong cả hai file
  (kết luận đợt 2). **Đừng hợp nhất.**

## Hai claim bị loại trong chính đợt rà soát này

Bản báo cáo khảo sát đưa ra hai điều **sai**, phát hiện khi đọc lại code:

1. `GUILD_ROLE_OPTIONS` bị nói là export chết. Nó có caller:
   `apps/web/features/members/components/member-form-dialog.tsx:172` và
   `apps/api/src/__tests__/permissions.spec.ts:14`.
2. `listByWeek` bị nói là vẫn phát một lệnh ghi vô điều kiện trước mỗi lần đọc tuần. Mục **B** của
   đợt 3 đã đóng việc đó; `reconcileGuildWar` nay so `deadline` và `matchCount` rồi mới ghi.

Ghi lại vì cả hai đều đến từ việc tin một bản mô tả thay vì đọc chữ ký hàm và lịch sử commit — đúng
cái sai mà đợt 3 cũng đã tự ghi lại một lần.
