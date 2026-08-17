# C3 — Một module đồng hồ giờ Việt Nam

Ngày: 2026-08-18 · Phạm vi: `packages/shared` + `apps/api`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).
Nên làm **trước** [C1](./2026-08-18-c1-response-contract-design.md): nó dọn chỗ đặt luật thời gian
dùng chung, và [deadline-cap](./2026-08-18-deadline-cap-design.md) cũng thêm hàm vào đúng chỗ này.

Gom mọi nguyên thủy "giờ Việt Nam" vào một module có interface nhỏ, thay vì để chúng nửa nằm trong
`packages/shared`, nửa dựng lại bằng tay ở backend với một quy ước đánh số thứ khác.

## Bối cảnh

`packages/shared/lib/battle-session.ts` có đủ nguyên liệu nhưng **giấu gần hết**:

```ts
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;              // :12  — private
function vnIsoWeekday(date: Date): number { … }        // :28  — private, ISO 1–7
export function shiftVnDate(base, deltaDays, hour, minute): Date  // :43 — chỉ hàm này lộ ra
```

Vì chỉ `shiftVnDate` được export, `apps/api/src/modules/battle-sessions/session-schedule.ts` phải tự
dựng lại phần còn lại:

```ts
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;                                   // :13 — bản thứ hai
const vnDay   = new Date(dateTime.getTime() + VN_OFFSET_MS).getUTCDay();   // :53
const vnDayOfWeek = new Date(now.getTime() + VN_OFFSET_MS).getUTCDay();    // :79
const vn = new Date(weekStart.getTime() + VN_OFFSET_MS);                   // :126
const vn = new Date(dateTime.getTime() + VN_OFFSET_MS);                    // :144
```

Cùng một hằng số, cùng một comment (*"Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST)"*), hai
file bảo trì độc lập.

Nặng hơn hằng số trùng: **hai quy ước đánh số thứ trong tuần cùng tồn tại**.

| File | Quy ước | Bằng chứng |
|---|---|---|
| `packages/shared/lib/battle-session.ts` | ISO 1–7 (Thứ 2 = 1, Chủ nhật = 7) | `vnIsoWeekday`, `THURSDAY = 4` (`:15`) |
| `apps/api/.../session-schedule.ts` | `getUTCDay()` 0–6 (Chủ nhật = 0, Thứ 7 = 6) | `SATURDAY = 6` (`:16`), `WEEKDAY_NAMES` (`:29`) |

Bất kỳ ai đọc hai file này liên tiếp đều phải đổi hệ trong đầu. `weekStartOf` (`:52-58`) là chỗ trả
giá rõ nhất — phải viết `(vnDay + 6) % 7` kèm một comment giải thích Chủ nhật thuộc tuần nào.

## Quyết định thiết kế

### 1. Một module `@guild/shared/time`, interface bốn hàm

```ts
/** Thứ trong tuần theo giờ VN, chuẩn ISO: 1 = Thứ 2 … 7 = Chủ nhật. */
export function vnWeekday(date: Date): number;

/** Các thành phần lịch của một mốc, đọc theo giờ VN. */
export function vnParts(date: Date): {
  year: number; month: number; day: number; hour: number; minute: number;
};

/** Dịch `deltaDays` ngày rồi đặt về giờ/phút cụ thể theo giờ VN. */
export function shiftVnDate(base: Date, deltaDays: number, hour: number, minute: number): Date;

/** Đặt một mốc về giờ/phút cụ thể trong chính ngày của nó, theo giờ VN. */
export function atVnTime(base: Date, hour: number, minute: number): Date;
```

`VN_OFFSET_MS` **không** export: nó là chi tiết implementation. Ai cần cộng offset thì đang cần một
trong bốn hàm trên. Đây là điểm chính của spec — module sâu nghĩa là người gọi không phải biết offset
tồn tại.

`atVnTime(base, h, m)` là `shiftVnDate(base, 0, h, m)`; tách ra vì "10:00 của chính ngày đánh" là câu
xuất hiện nhiều lần trong domain (xem [deadline-cap](./2026-08-18-deadline-cap-design.md)) và
`shiftVnDate(x, 0, 10, 0)` đọc kém hơn `atVnTime(x, 10, 0)`.

### 2. Chọn ISO 1–7 làm quy ước duy nhất

Domain này bắt đầu tuần từ **Thứ 2** (`weekStart` = Thứ 2 00:00, khoá gom tuần trong database), nên
ISO là hệ hợp với domain: `weekStartOf` thành phép trừ thẳng thay vì `(vnDay + 6) % 7`.

`session-schedule.ts` đổi theo:

```ts
const MONDAY = 1, THURSDAY = 4, SATURDAY = 6;                 // cùng một hệ
const WEEKDAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
//                     ↑ chỉ số 0 bỏ trống để tra thẳng bằng vnWeekday()
export function weekStartOf(dateTime: Date): Date {
  return shiftVnDate(dateTime, -(vnWeekday(dateTime) - MONDAY), 0, 0);
}
```

Phần tử rỗng ở đầu `WEEKDAY_NAMES` là cái giá phải trả, và nó rẻ hơn một phép `% 7` kèm comment ở mỗi
call site.

### 3. Tách file, `lib/` có barrel

`packages/shared/lib/` hiện chỉ có `battle-session.ts`, và `exports` map trỏ thẳng vào file đó:

```json
"./lib": { "types": "./lib/battle-session.ts", "default": "./dist/lib/battle-session.js" }
```

Sau spec này:

```
packages/shared/lib/
├── vn-time.ts          # module đồng hồ, không biết gì về trận đánh
├── battle-session.ts   # luật deadline của domain, ngồi lên vn-time
└── index.ts            # barrel
```

`exports` map trỏ `./lib` vào `index.ts` / `dist/lib/index.js`. Đây là thay đổi bắt buộc, vì thêm file
thứ hai mà giữ nguyên map thì không ai import được nó bằng tên package — chính xác là cái bẫy
[C6](./2026-08-18-c6-shared-package-identity-design.md) mô tả (`apps/web` hiện lách bằng
`@shared/lib/battle-session`).

### 4. `session-schedule.ts` vẫn ở lại `apps/api`

Chuyển nguyên thủy thời gian sang shared, **không** chuyển luật lịch. `getActiveWeek`,
`getEditableWeeks`, `guildWarDateTime`, `guildWarSessionId`, `formatSessionLabel`,
`isDeadlinePassed` là luật nghiệp vụ do backend sở hữu (`architecture.md` §6, và `CLAUDE.md` của
`apps/api` nhắc lại). Đưa chúng sang shared là mở đường cho frontend gọi — đúng thứ luật cấm.

Ranh giới: **shared biết giờ Việt Nam là gì, backend biết tuần điểm danh là gì.**

## Thay đổi cụ thể

### `packages/shared/lib/vn-time.ts` (mới)

Chuyển `VN_OFFSET_MS` và `shiftVnDate` từ `battle-session.ts` sang; `vnIsoWeekday` đổi tên thành
`vnWeekday` và export; thêm `vnParts`, `atVnTime`.

### `packages/shared/lib/battle-session.ts`

Bỏ `VN_OFFSET_MS`, `vnIsoWeekday`, `shiftVnDate`; import từ `./vn-time`. Còn lại đúng phần luật
deadline gợi ý (sẽ được [deadline-cap](./2026-08-18-deadline-cap-design.md) viết lại).

### `packages/shared/lib/index.ts` (mới) + `package.json`

Barrel re-export cả hai file; `exports` map trỏ `./lib` vào barrel.

### `apps/api/src/modules/battle-sessions/session-schedule.ts`

- Bỏ `VN_OFFSET_MS` (`:13`).
- `weekStartOf` (`:52`), `getActiveWeek` (`:78`), `guildWarSessionId` (`:125`),
  `formatSessionLabel` (`:140`) dùng `vnWeekday` / `vnParts` thay cho `+ VN_OFFSET_MS` rồi
  `getUTC*()`.
- `SATURDAY` đổi từ `6` (`getUTCDay`) sang `6` (ISO) — **trùng số nhưng khác nghĩa**, nên phải rà kỹ
  `getActiveWeek:80` (`daysSinceSaturday`) chứ không đổi máy móc.
- `WEEKDAY_NAMES` xếp lại theo ISO.

`guildWarSessionId` sau khi đổi:

```ts
export function guildWarSessionId(weekStart: Date): string {
  const { year, month, day } = vnParts(weekStart);
  return `gw-${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
```

Lưu ý `vnParts.month` trả **1–12** (đã +1), khác `getUTCMonth()`; đây là chỗ dễ sai nhất khi chuyển.

## Edge case

- **Id Guild War phải giữ nguyên chuỗi cũ.** `gw-YYYY-MM-DD` là khoá upsert idempotent
  (`schema.prisma`, `battle-sessions.service.ts:233`). Đổi cách tính mà lệch một ngày sẽ **sinh trận
  Guild War trùng** cho các tuần đang có. Đây là rủi ro nghiêm trọng nhất của spec này — xem mục
  Kiểm thử.
- **Chủ nhật.** Hệ ISO xếp Chủ nhật = 7, thuộc tuần bắt đầu từ Thứ 2 sáu ngày trước. Với hệ cũ đây là
  trường hợp cần comment riêng; với ISO nó rơi ra tự nhiên từ `-(weekday - 1)`.
- **Không có DST ở Việt Nam** — offset cố định, không cần thư viện timezone. Giữ nguyên cách làm hiện
  tại, không kéo `date-fns-tz` hay `Intl` vào.
- **`Date` truyền vào là mốc UTC thật**, không phải "giờ VN đã cộng sẵn". Mọi hàm nhận và trả `Date`
  UTC; chỉ phần *đọc* các thành phần lịch mới theo giờ VN. Ghi rõ trong doc comment của module.

## Kiểm thử

- `apps/api/src/modules/battle-sessions/__tests__/session-schedule.spec.ts` (114 dòng) là lưới an
  toàn chính. **Chạy trước khi sửa, giữ nguyên, chạy lại sau khi sửa** — đây là refactor giữ nguyên
  hành vi nên spec này không được sửa một dòng test nào. Nếu phải sửa thì đã đổi hành vi ngoài ý
  muốn.
- Bổ sung vào spec đó, nếu chưa có: `guildWarSessionId` cho một tuần vắt qua mốc đổi tháng
  (ví dụ `weekStart` = Thứ 2 30/11) và một tuần vắt qua mốc đổi năm, để khoá lại đúng chuỗi id.
- `vnWeekday`: Thứ 2 00:00 VN → 1; Chủ nhật 23:59 VN → 7; một mốc UTC rơi vào 17:30 UTC (tức 00:30
  VN hôm sau) → thứ của **ngày VN**, không phải ngày UTC.
- `apps/web/lib/__tests__/session-deadline.test.ts` đang test `packages/shared/lib` từ phía web —
  giữ và mở rộng cho `vnWeekday`/`atVnTime`, vì đó là bộ test duy nhất chạm trực tiếp vào package
  này (Vitest ghim `TZ=Asia/Ho_Chi_Minh`, nên nó cũng chứng minh code không phụ thuộc timezone máy).

## Rủi ro

- **Đổi hệ đánh số là loại thay đổi dễ sai một đơn vị.** Làm từng hàm một, chạy
  `pnpm --filter api test` sau mỗi hàm, không đổi cả file rồi mới chạy.
- **`packages/shared` phải build lại** (`pnpm --filter @guild/shared build`) trước khi API nhận thay
  đổi lúc chạy; type thì cập nhật ngay, nên có cửa sổ "type xanh, chạy sai".

## Ngoài phạm vi

- Chuyển luật tuần/deadline sang shared — đã loại ở §4.
- Bỏ offset cố định để dùng timezone database thật (`APP_TIMEZONE` hiện có trong env schema nhưng
  không ai đọc) — việc riêng, và chỉ đáng làm nếu bang có người chơi ngoài múi giờ VN.
