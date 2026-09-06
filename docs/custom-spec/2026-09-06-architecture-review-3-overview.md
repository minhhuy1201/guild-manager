# Rà soát kiến trúc đợt 3 (A–F) — Tổng quan

Ngày: 2026-09-06 · Phạm vi: **hiệu năng**, toàn repo · Nguồn: rà soát `apps/api/src` (trừ
`generated/`), `apps/api/prisma`, `apps/web` ở commit `809c518`.

Sáu cơ hội **làm sâu module** (deepening) mà kết quả đo được là bớt việc lặp trên đường chạy. Phạm vi
do người đặt hàng giới hạn: *cải thiện hiệu năng, không over-engineer, không đổi behaviour business*.
Không mục nào thêm module, thêm lớp trừu tượng hay thêm dependency; mọi thay đổi nằm gọn trong
interface đang có.

Hai đợt trước: [C1–C7](./2026-08-18-architecture-review-overview.md) và
[A1–A6, W1–W6](./2026-08-21-architecture-review-2-overview.md). Đợt này đánh nhãn **A–F** theo thứ tự
trình bày trong báo cáo rà soát, và không mục nào đảo lại quyết định của hai đợt trước.

Từ vựng dùng xuyên suốt (giống hai đợt trước): *module* (thứ có interface và implementation, ở mọi
quy mô), *interface* (mọi thứ người gọi phải biết để dùng đúng), *seam* (nơi interface nằm), *depth*
(lượng hành vi trên một đơn vị interface), *leverage* (cái người gọi được lợi), *locality* (cái người
bảo trì được lợi).

## Các mục

### `apps/api`

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **A** | `findByDiscordId` chỉ trả `{ id, role }`, nên 4 call site phải đọc lại chính hàng đó bằng `findById` | Strong | [a](./2026-09-06-a-identity-read-design.md) |
| **B** | `listByWeek` phát một lệnh **ghi** trước mỗi lần đọc tuần, ở cả 6 call site, kể cả khi không có gì lệch | Strong | [b](./2026-09-06-b-week-read-write-design.md) |
| **F** | `reminder.service.ts` suy ra tuần hai lần trong một lượt chạy, rồi dò người vắng bằng quét lồng | Worth exploring | [f](./2026-09-06-f-reminder-lookup-design.md) |

### `apps/web`

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **C** | `/xep-team` fetch formations hai lần mỗi lần mở: key `"current"` rồi key `"<ngày>"` | Strong | [c](./2026-09-06-c-formation-double-fetch-design.md) |
| **D** | `/thiet-lap` chạy hai request nối đuôi nhau (`weeks` → `sessions`) | Worth exploring | [d](./2026-09-06-d-settings-waterfall-design.md) |
| **E** | `verifyJwt` import lại `CryptoKey` mỗi lần gọi, và nó chạy ở `proxy.ts` trên mọi page request | Worth exploring | [e](./2026-09-06-e-jwt-key-cache-design.md) |

**Ba mục bỏ đi một lệnh ghi hoặc một round trip trên đường đông người đi**: B (6 call site), A (4 call
site), F (đường cron + `/nhac-diem-danh`). Ba mục còn lại là việc lặp phía web.

## Thứ tự thực hiện

Hai nhánh **độc lập hoàn toàn** — làm song song được.

```
apps/api:   A ──► B ──► F

apps/web:   C  ·  D  ·  E      (độc lập với nhau)
```

### Vì sao thứ tự đó ở backend

- **A trước B.** A đổi chữ ký `findByDiscordId`, mà `attendance-board.ts` — file B cũng chạm — đang
  gọi nó. Làm ngược lại nghĩa là mở cùng một file ra hai lần.
- **B trước F.** F bỏ lần suy ra tuần thứ hai trong `ReminderService`; B làm cho lần thứ nhất rẻ đi.
  Làm B trước thì lúc đo lại F chỉ còn đúng một biến số.

### Nếu chỉ làm được một việc

**B.** A bỏ một round trip **đọc** ở bốn call site; B bỏ một round trip **ghi** ở sáu call site, và
bỏ luôn tính tuần tự giữa hai lượt truy vấn. Đường đọc tuần là đường đông nhất trong backend: màn
điểm danh của mọi thành viên, bảng của bot, cron nhắc và `/thong-bao` đều đi qua nó.

Nếu ưu tiên là "người dùng thấy được ngay" thì đổi thành **C** — một request thừa biến mất ở mỗi lần
mở `/xep-team`, và diff nhỏ nhất trong sáu mục.

## Những gì rà soát **không** tìm thấy vấn đề

Ghi lại để khỏi rà lại.

**Backend**

- `AttendanceService.mark` đã gộp ba lượt đọc độc lập vào một `Promise.all` và ghi rõ lý do
  (`attendance.service.ts:156`). Không còn gì để gộp thêm.
- `getRecordsForSessions` tách khỏi `getRecords` đúng để tránh suy ra tuần lần hai
  (`attendance.service.ts:86`), và `attendance-board.ts:197` đang dùng đúng. Chỗ **chưa** dùng là
  `ReminderService` — đó là mục F.
- `AttendanceRecord` và `FormationSlot` có index khớp với truy vấn thật (`sessionId`, `characterId`,
  unique `(characterId, sessionId)` phủ luôn tra theo `characterId`). Không thiếu index nào.
- `saveFormation` ghi `formationMatch` trong một vòng `for` — nhưng tối đa 2 vòng (`matchCount` ∈
  {1, 2}), nên gộp lại không đổi gì đáng kể. **Cố ý không đề xuất.**
- `purgeExpiredFormations` chạy ở mỗi lần save: vị trí đó đã có comment giải thích là cố ý — chạy
  trên đường ghi để `GET` giữ nguyên tính chỉ đọc, và chạy ngoài transaction để một `deleteMany` hỏng
  không biến một lần lưu thành công thành 500. **Không đụng vào.**
- `AuthExchange` quét hàng hết hạn trong lần exchange kế tiếp — bảng sống 60 giây, luôn nhỏ.

**Frontend**

- `attendance-grid.tsx` / `attendance-row.tsx` tra bằng map khoá `recordKey`, không phải `.find()`
  trong `.map()`.
- Danh sách đều đã phân trang qua `useTablePagination`, nên lưới ~50 dòng không bao giờ render hết
  một lúc.
- `formation-grid.tsx` và `use-formation-pool.ts` memo hoá đầy đủ mọi Map/Set dẫn xuất.
- `FormationCaptureSheet` chỉ mount khi `announce.open`, không nằm trong đường render thường.
- Mặc định TanStack Query (`staleTime: 60_000`, `retry: 1`) đặt một lần ở `components/providers.tsx`,
  không hook nào ghi đè bằng `refetchInterval`. Không có refetch storm do cấu hình.
- `CACHE_DEPENDENTS` invalidate rộng hơn mức tối thiểu ở `roster` và `schedule`, nhưng mỗi mục đều có
  comment nêu lý do đồng bộ hai màn. Thắt lại là đổi behaviour hiển thị, nên **không đề xuất**.

## Một kết luận đã bị sửa trong chính đợt rà soát này

Bản báo cáo đầu tiên mô tả **B** sai cơ chế: nó nói `listByWeek` trong `handleAttendanceButton` là
bản sao của session mà `mark()` vừa đọc. **Không phải.** `mark()` đọc *một* session bằng `findById`
(`attendance.service.ts:161`), còn bảng điểm danh cần *cả tuần* — hai truy vấn khác nhau, không thay
thế được cho nhau. PR #62 đã dọn xong phần trùng lặp ở đường đó.

Vấn đề thật nằm sâu hơn một tầng: lệnh ghi vô điều kiện bên trong chính `listByWeek`, và nó có ở cả
sáu call site chứ không riêng đường bấm nút. Ghi lại vì kết luận đổi thì việc phải làm cũng đổi theo —
và vì cái sai đó đến từ việc tin một mô tả thay vì đọc chữ ký hàm.
