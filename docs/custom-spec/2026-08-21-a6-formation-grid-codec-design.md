# A6 — Codec lưới đội hình, và đưa việc xoá ra khỏi đường `GET`

> **Đã hiện thực** (`4aae1f8`, `10df85a`). Rà soát lại 2026-08-23 tìm thấy **ba lỗi thật**:
> (1) tiêu đề hứa "đưa việc xoá ra khỏi đường `GET`" nhưng §3 giữ nguyên purge trên đường đó, chỉ dời
> call site lên controller — `deleteMany` vẫn chạy mỗi lần `GET`; (2) §3 đi ngược
> `architecture.md:114-115` (*"Services hold the business logic"*), mà `architecture.md` là **binding**;
> (3) §4 nói quá — đưa `loadCharacterIds` vào `$transaction` **không** đóng được race dưới READ
> COMMITTED (isolation mặc định của Prisma/Postgres), chỉ thu hẹp cửa sổ; fix đúng là bắt `P2003` →
> 409. Ngoài ra §2 lẫn ghi chú hậu-hiện-thực vào spec.
> **Trạng thái 2026-08-23: cả ba đã đóng.** Lỗi #3 đóng ở `ea8d0ed`; lỗi #1 và #2 đóng bằng việc
> chuyển purge sang đường ghi (`saveFormation`), `GET` thành chỉ đọc và controller trở lại một dòng.
> §3 và §4 dưới đây đã viết lại theo bản hiện thực — tiêu đề spec giờ đúng nghĩa đen. Chi tiết:
> [§ Rà soát lại A1–A6](./2026-08-21-architecture-review-2-overview.md#rà-soát-lại-a1a6-2026-08-23).

Ngày: 2026-08-21 · Phạm vi: `apps/api/src/modules/team-builder`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Nên làm **sau** [A1](./2026-08-21-a1-schedule-read-seam-design.md) — A1 dọn phần đọc lịch ra khỏi
service này, nên phần còn lại (đội hình) mới đủ nhỏ để tách rõ ba việc.

## Bối cảnh

`team-builder.service.ts` đang trộn ba thứ không liên quan: dọn dữ liệu theo lịch, mã hoá/giải mã
lưới đội hình, và luật khoá theo thời gian.

**1. Một `GET` chạy `deleteMany`.**

```ts
// team-builder.service.ts:60-68
/**
 * Liệt kê các tuần còn dữ liệu đội hình, mới nhất trước.
 * Dọn dữ liệu quá hạn trước khi đọc — màn hình xếp team luôn gọi endpoint này
 * nên không cần cron riêng.
 */
async getWeeks(now: Date = new Date()): Promise<FormationWeek[]> {
  await this.purgeExpiredFormations(now);
```

Comment nói thẳng đây là cron trá hình. `team-builder.controller.ts:27-31` là `@Get('weeks')`, và
`purgeExpiredFormations` (`:95-101`) chạy `deleteMany`. Luật retention (`RETENTION_DAYS = 56`,
`:21`) chỉ tới được qua đường đọc — không cách nào chạy hay kiểm nó độc lập.

**2. Luật "hàng tồn tại khi nào" viết ba lần, ba hình khác nhau.**

Chiều ghi, có comment giải thích:

```ts
// team-builder.service.ts:33-51
/**
 * Một hàng tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ, nên phải lấy hợp của hai tập
 * khoá — duyệt riêng slots sẽ đánh rơi ô chỉ có ghi chú.
 */
function buildSlotRows(match: MatchFormation): SlotRow[] {
  const slotIds = new Set([...Object.keys(match.slots), ...Object.keys(match.notes)]);
  return [...slotIds].map((slotId) => ({ … }));
}
```

Chiều đọc, cùng luật nhưng hình khác hẳn, cách đó 100 dòng, không comment:

```ts
// team-builder.service.ts:144-155
matches: session.formationMatches.map((match) => ({
  slots: Object.fromEntries(
    match.slots.filter((slot) => slot.characterId !== null)
      .map((slot) => [slot.slotId, slot.characterId as string]),
  ),
  notes: Object.fromEntries(
    match.slots.filter((slot) => slot.note !== null)
      .map((slot) => [slot.slotId, slot.note as string]),
  ),
})),
```

Lần thứ ba, dạng văn xuôi, ở `prisma/schema.prisma:111`: *"Một ô có người HOẶC có ghi chú. Ô vừa
trống vừa không ghi gì thì KHÔNG có hàng."*

Không có test round-trip nào — encode và decode có thể lệch nhau mà cả hai spec vẫn xanh.

**3. `locked` tính ở ba nơi.**

```ts
locked: session.dateTime.getTime() < now.getTime(),        // :143
if (session.dateTime.getTime() < now.getTime()) { throw … } // :183
locked: false,                                              // :220  ← hard-code
```

`:220` đúng *vì* `:183` vừa chặn — một sự phụ thuộc ngầm giữa hai dòng cách nhau 37 dòng.

**4. Đọc ngoài transaction rồi ghi trong transaction.**

```ts
const knownIds = await this.loadCharacterIds();   // :190  — ngoài tx
…
await this.prisma.$transaction(async (tx) => {    // :200
```

Nhân vật bị xoá giữa hai mốc làm vỡ khoá ngoại **bên trong** transaction — thành lỗi 500, không phải
thông báo tiếng Việt. Chính comment `:187-189` giải thích rằng phép lọc tồn tại để tránh đúng chuyện
đó, nên khoảng hở này là lỗ hổng của biện pháp phòng vệ chứ không phải rủi ro đã chấp nhận.

## Quyết định thiết kế

### 1. `formation-grid.ts`: một codec, hai chiều, một luật

```ts
// modules/team-builder/formation-grid.ts

/**
 * Đổi đội hình một trận thành các hàng FormationSlot.
 * Một hàng tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ.
 */
export function encodeMatch(match: MatchFormation): SlotRow[];

/**
 * Dựng lại đội hình một trận từ các hàng FormationSlot.
 * Nghịch đảo của encodeMatch: decodeMatch(encodeMatch(x)) sâu bằng x.
 */
export function decodeMatch(rows: SlotRow[]): MatchFormation;
```

Câu *"một hàng tồn tại khi ô CÓ NGƯỜI hoặc CÓ GHI CHÚ"* được nói **một lần**, ở doc comment của
module, và cả hai chiều đều ngồi dưới nó. `schema.prisma:111` giữ nguyên câu của nó — đó là tài liệu
của dữ liệu, không phải bản sao của code — nhưng thêm một dòng trỏ sang file này.

Hai `as string` ở `:148`, `:153` biến mất: `decodeMatch` thu hẹp kiểu bằng type guard trong
`.filter()`, không cast.

### 2. `isSessionLocked` là một hàm

```ts
/** Trận đã qua giờ đánh thì khoá, không sửa đội hình được nữa. */
export function isSessionLocked(dateTime: Date, now: Date): boolean;
```

Dùng ở cả `:143`, `:183`, và `:220` — chỗ hard-code `false` đổi thành `isSessionLocked(...)`, luôn
cho `false` vì `:183` đã chặn, nhưng không còn là một hằng số đúng nhờ may mắn.

Đặt ở đâu? **Đã sửa khi hiện thực:** spec ban đầu định giữ nó trong `team-builder` cạnh codec, với lý
do đây không phải luật tuần/deadline. Nhưng `architecture.md` §7 và `apps/api/CLAUDE.md` nói mọi luật
thời gian của lịch đánh nằm ở `modules/battle-sessions/session-schedule.ts` "nowhere else", và hàm
này trùng hình với `isDeadlinePassed` ngay cạnh. Nên nó nằm ở `session-schedule.ts`, ra ngoài qua
`battle-sessions.public.ts`; `formation-grid.ts` chỉ còn là codec.

### 3. `purgeExpiredFormations` thành entry point riêng

```ts
/**
 * Xoá các đội hình cũ hơn RETENTION_DAYS.
 * @param now - Thời điểm hiện tại
 * @returns Số bản ghi đã xoá
 */
async purgeExpiredFormations(now: Date): Promise<number>;
```

`private` → `public`, trả về số hàng đã xoá (để gọi được từ chỗ khác và quan sát được).

**`getWeeks` có còn gọi nó không?** Không. `GET` là chỉ đọc; retention đi theo **đường ghi** —
`saveFormation` gọi `purgeExpiredFormations(now)` sau khi qua hai guard (404, 409) và **trước**
`$transaction`. Controller không biết gì về retention và không cần `Clock`.

Ba lý do cho đường ghi:

- Dữ liệu chỉ phình ra khi có người lưu, nên dọn ở đúng chỗ làm nó phình.
- Trình tự nghiệp vụ nằm trong service — `architecture.md:114-115` (*"Services hold the business
  logic"*) là binding, controller phải mỏng.
- Chạy trước `$transaction` để một `deleteMany` hỏng không biến một lượt lưu **đã thành công** thành
  500. Hai tập không giao nhau (purge lọc tuần cũ hơn 56 ngày, `saveFormation` chỉ ghi cho trận chưa
  đánh) nên thứ tự này không xoá mất thứ vừa ghi.

Đánh đổi đã chấp nhận: retention chỉ tiến khi có người lưu đội hình. Không ai lưu suốt mấy tháng thì
dữ liệu quá 56 ngày nằm lại — vô hại (đội hình cũ, không phải PII), và "56 ngày" thành "56 ngày *và*
có người ghi". Thêm một `deleteMany` vào độ trễ của `PUT` cũng nằm trong đánh đổi này; chưa tối ưu
(ví dụ chỉ purge khi ghi vào tuần đang mở) cho tới khi đo được là chậm.

Vì sao không dựng cron thật: repo không có scheduler, `architecture.md` §8 ghi rõ những gì cố ý
vắng mặt, và thêm `@nestjs/schedule` cho một `deleteMany` mỗi 56 ngày là thêm hạ tầng cho một nhu
cầu chưa có. `purgeExpiredFormations` vẫn public, nên khi có job thứ hai thì chỉ cần đổi caller.

### 4. Race "thành viên bị xoá đúng lúc ghi" thành 409, không phải 500

Phép lọc theo `knownIds` chạy trước câu insert, nên một `DELETE` commit vào giữa vẫn làm vỡ khoá
ngoại. Dưới READ COMMITTED — isolation mặc định của Prisma/Postgres — `SELECT id FROM character`
không khoá hàng đã đọc, nên **không** cách nào đóng được race bằng cách dời phép đọc; chỉ có bắt
lỗi hoặc serializable isolation.

Chốt: **bắt lỗi**, vì đây là ca hiếm và người dùng có thao tác khắc phục rõ ràng.

- Phép đọc chuyển vào trong `$transaction`, gọi `characters.listIds(tx)` — module khác sở hữu bảng
  `character` nên đi qua service của nó, không `tx.character.findMany` (`apps/api/docs/backend.md:120`).
  Việc này chỉ **thu hẹp** cửa sổ, và comment tại chỗ phải nói đúng như vậy.
- `$transaction` được bọc `.catch()`: lỗi Prisma mã `P2003` thành
  `ConflictException('Có thành viên vừa bị xoá khỏi bang, vui lòng tải lại trang rồi lưu lại.')`;
  mọi lỗi khác `throw` nguyên để không nuốt mất lỗi thật.
- Phép nhận diện tách thành hàm thuần `isForeignKeyViolation(error)`, mã `P2003` nằm ở một hằng
  có tên.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `modules/team-builder/formation-grid.ts` (mới) | `SlotRow`, `encodeMatch`, `decodeMatch` |
| `modules/battle-sessions/session-schedule.ts` | thêm `isSessionLocked`, export qua `battle-sessions.public.ts` |
| `team-builder.service.ts:26-51` | bỏ `SlotRow`, `buildSlotRows` → import từ codec |
| `team-builder.service.ts:144-155` | `matches: session.formationMatches.map(m => decodeMatch(m.slots))` |
| `team-builder.service.ts:143, 183, 220` | dùng `isSessionLocked` |
| `team-builder.service.ts:95-101` | `private` → `public`, trả `number` |
| `team-builder.service.ts:67-68` | bỏ `purgeExpiredFormations` khỏi `getWeeks` |
| `team-builder.service.ts` `saveFormation` | gọi `purgeExpiredFormations(now)` sau hai guard, trước `$transaction` |
| `team-builder.controller.ts` | `getWeeks` còn một dòng; bỏ `Clock` khỏi constructor |
| `team-builder.service.ts:190-212` | `loadCharacterIds` → `characters.listIds(tx)` trong `$transaction`; `.catch()` đổi `P2003` thành 409 |
| `__tests__/formation-grid.spec.ts` (mới) | round-trip |

## Edge case

- **Ô chỉ có ghi chú, không có người** — ca mà `buildSlotRows` được viết ra để cứu. Phải là ca đầu
  tiên của test round-trip.
- **Ô có người nhưng người đó vừa bị xoá** — `saveFormation` lọc trước khi encode; `decodeMatch`
  không biết gì về việc đó và không cần biết. Nếu việc xoá xảy ra **sau** phép lọc thì khoá ngoại vỡ,
  và §4 đổi nó thành 409 chứ không phải 500.
- **Trận không có hàng nào** → `decodeMatch([])` cho `{ slots: {}, notes: {} }`, không phải
  `undefined`. Khoá lại bằng test: "không có slot 2" và "slot 2 rỗng" phải phân biệt được ở tầng
  trên, không phải ở codec.
- **`matchIndex`** vẫn do service quản (`:203-211`); codec chỉ biết một trận, không biết thứ tự.
- **Purge chạy song song với save.** `deleteMany` lọc theo `weekStart < cutoff` (56 ngày trước),
  `saveFormation` chỉ ghi được cho trận chưa đánh — hai tập không giao nhau. Không cần khoá. Đây
  cũng là lý do purge chạy được **trong chính** `saveFormation` mà không tự xoá mất thứ vừa ghi.
- **Request bị từ chối thì không dọn.** Purge nằm **sau** hai guard (404 không có ngày đánh, 409 đã
  qua giờ đánh): một request hỏng không được đụng vào dữ liệu.

## Kiểm thử

- **Round-trip là test chính**: với mỗi ca (ô có người, ô chỉ ghi chú, ô có cả hai, trận rỗng),
  `decodeMatch(encodeMatch(x))` phải sâu bằng `x`. Đây là thứ hiện không thể viết vì hai chiều nằm ở
  hai chỗ và một chiều là `map` lồng trong service.
- `isSessionLocked`: trước giờ đánh, đúng giờ đánh (`<` nên chưa khoá), sau giờ đánh.
- `purgeExpiredFormations` test độc lập, không cần dựng cả một tuần lịch — hiện
  `team-builder.service.spec.ts` phải mock `deleteMany` chỉ để `getFormations` chạy được; mock đó
  biến mất.
- Giữ nguyên các test hành vi của `saveFormation`, thêm hai ca cho §4: `$transaction` ném lỗi mã
  `P2003` → `ConflictException`, và một lỗi database khác → **không** bị nuốt thành 409.
- Ba ca cho §3 ở `saveFormation`: dọn theo mốc cắt của `Clock`; dọn **trước** transaction (khoá thứ
  tự); ngày đã khoá thì `deleteMany` không được gọi.
- Controller spec khoá chiều ngược lại: `GET /team-builder/weeks` **không** gọi
  `purgeExpiredFormations`.

## Rủi ro

- **`decodeMatch` viết lệch `encodeMatch`** là đúng rủi ro spec này sinh ra để đóng lại — nên viết
  test round-trip **trước** khi chuyển code, để nó chạy trên hành vi cũ trước.
- **Retention treo vào đường ghi** nên nó ngừng chạy nếu không ai lưu đội hình nữa. Chấp nhận: hậu
  quả duy nhất là dữ liệu cũ nằm lại lâu hơn 56 ngày. Nếu sau này cần bảo đảm theo lịch thật thì đổi
  caller sang cron — `purgeExpiredFormations` đã public sẵn.
- **`PUT` gánh thêm một `deleteMany`.** Chấp nhận cho tới khi đo được là chậm; lúc đó thu hẹp bằng
  điều kiện (chỉ purge khi ghi vào tuần đang mở) chứ không quay lại đường `GET`.

## Ngoài phạm vi

- Cron thật cho retention (đã nói lý do ở §3).
- Đổi cách lưu đội hình (ví dụ một cột JSON thay bảng `FormationSlot`) — `schema.prisma` đã ghi lý
  do cho thiết kế hiện tại; spec này không đụng.
