# C2b — Cờ lịch do server tính, client chỉ đọc

Ngày: 2026-08-18 · Phạm vi: `packages/shared` + `apps/api` + `apps/web`.
Bối cảnh chung: [tổng quan C1–C7](./2026-08-18-architecture-review-overview.md).
Phụ thuộc: nên làm **sau** [C1](./2026-08-18-c1-response-contract-design.md) (cần chỗ để thêm field
vào contract). Nửa đầu của C2 — luật trần deadline — nằm ở
[deadline-cap](./2026-08-18-deadline-cap-design.md), độc lập với spec này.

Response bổ sung hai field do backend tính: `isDeadlinePassed` trên mỗi trận, `weekEnd` trên mỗi
tuần đội hình. Frontend xoá ba phép tính tự chế, trong đó có **một phép tính sai ngày**.

## Bối cảnh

`architecture.md` §6 và `apps/web/docs/frontend.md` §4 phát biểu luật rất rõ:

> Frontend chỉ mirror cờ `isDeadlinePassed` API gửi về, để làm xám một cột đã khoá.
> **Never re-derive a schedule rule on the client.**

**Cờ đó chưa từng tồn tại.** `BattleSessionEntity` (`battle-session.entity.ts:2-18`) chỉ có
`deadline` thô. Hệ quả là ba chỗ tự tính:

1. `features/attendance/api/attendance-api.ts:33-35`
   ```ts
   export function isDeadlinePassed(deadline: string): boolean {
     return Date.now() > new Date(deadline).getTime();
   }
   ```
   Doc comment tự thú: *"Chỉ dùng để khóa cột trên UI — server mới là nơi chặn thật."*

2. `features/attendance/hooks/use-deadline-refresh.ts:42-48` — `findNextDeadline` so sánh lại cùng
   một phép so sánh lần thứ hai, để hẹn giờ invalidate cache.

3. `features/team-builder/components/week-picker.tsx:22-33` — **đây là chỗ đã sai**:
   ```ts
   const DAYS_IN_WEEK_SPAN_MS = 6 * 24 * 60 * 60 * 1000;
   /** Sunday closing the week — the API only hands back the Monday. */
   function weekEnd(weekStart: string): string { … }
   ```
   Backend chốt tuần ở **Thứ 7 23:59** (`session-schedule.ts:22,68`:
   `SATURDAY_OFFSET_FROM_MONDAY = 5`). Component cộng 6 ngày → **Chủ nhật**. Cùng một tuần, hai ngày
   kết thúc khác nhau tuỳ người dùng đang mở màn nào. `FormationWeek`
   (`session-formation.ts:37-45`) không có `weekEnd` nên component phải tự bịa — và bịa sai.

Đối chiếu: `features/settings/components/week-selector.tsx:41-45` hiển thị đúng vì nó dùng
`week.weekEnd` do server gửi (kiểu `Week`, có field đó). Ba màn hình chọn tuần, ba cách làm.

## Quyết định thiết kế

### 1. `isDeadlinePassed` là field của response, không phải hàm ở client

`BattleSession` thêm `isDeadlinePassed: boolean`, do
`BattleSessionsService.toEntity()` tính bằng `isDeadlinePassed(row.deadline, now)` — chính hàm ở
`session-schedule.ts:161`, module đang sở hữu luật.

`toEntity` hiện không nhận `now`; thêm tham số `now: Date` và truyền xuống từ các method public đã có
sẵn tham số này (`listByWeek`, `findById`, `create`, `update` — tất cả đã nhận `now = new Date()`
cho mục đích test).

### 2. `deadline` vẫn được gửi kèm, không bị thay thế

Cờ boolean **không** đủ: `use-deadline-refresh` cần mốc thời gian thật để `setTimeout`. Hai field
phục vụ hai việc khác nhau và cùng tồn tại:

| Field | Ai dùng | Để làm gì |
|---|---|---|
| `isDeadlinePassed` | grid điểm danh, `attendance-row` | quyết định cột khoá hay không |
| `deadline` | `use-deadline-refresh`, hiển thị | hẹn giờ refetch, in ra màn hình |

### 3. Cờ hết hạn theo thời gian — và đó là lý do `use-deadline-refresh` tồn tại

`isDeadlinePassed` được tính **tại thời điểm response**, nên một response nằm trong cache TanStack
Query sẽ dần trở nên sai. Đây không phải lý do để quay lại tính ở client, mà chính là việc
`use-deadline-refresh` đang làm: hẹn giờ đúng lúc deadline gần nhất trôi qua rồi invalidate, để lấy
về cờ mới.

Cặp này khép kín: **server phán quyết, client hẹn giờ hỏi lại**. Sau spec này `findNextDeadline` chỉ
còn là phép chọn `min` trên các mốc `deadline` chưa qua — chọn thời điểm hỏi lại, không phán quyết
gì. Giữ nguyên, không xoá.

### 4. `FormationWeek` nhận `weekEnd`

Thay vì để `week-picker` bịa, `TeamBuilderService.getWeeks()` gửi `weekEnd` giống hệt
`BattleSessionsService.getEditableWeeks()` đang làm (`battle-sessions.service.ts:66-71`). Hai shape
tuần sẽ có cùng ba field `weekStart` / `weekEnd` / `isActive`.

Cân nhắc gộp hẳn `FormationWeek` và `Week` làm một schema: chúng sẽ giống nhau hoàn toàn. Không gộp,
vì `Week` mô tả *tuần được phép thiết lập lịch* còn `FormationWeek` mô tả *tuần còn dữ liệu đội
hình* — hai tập khác nhau, trùng shape chỉ là tình cờ. Ghi lại lý do ở doc comment để lần sau không
ai gộp nhầm.

### 5. Xoá, không giữ lại "cho tiện"

- Xoá `isDeadlinePassed` ở `attendance-api.ts:33-35`; call site đọc field.
- Xoá `DAYS_IN_WEEK_SPAN_MS` và `weekEnd()` ở `week-picker.tsx:22-33`; đọc `week.weekEnd`.

Giữ lại một bản "tiện tay" là cách drift quay về sau ba tháng.

## Thay đổi cụ thể

### `packages/shared/schemas`

- `battleSessionSchema` (từ C1) thêm:
  ```ts
  /** Đã quá hạn điểm danh tại thời điểm server dựng response. */
  isDeadlinePassed: z.boolean(),
  ```
- `formationWeekSchema` thêm `weekEnd` (ISO string, Thứ 7 23:59).

### `apps/api`

- `battle-sessions.service.ts`:
  - `toEntity(row, now)` thêm field `isDeadlinePassed: isDeadlinePassed(row.deadline, now)`; import
    thêm `isDeadlinePassed` từ `./session-schedule`.
  - Bốn call site của `toEntity` truyền `now` xuống (`listByWeek:99`, `findById:113`, `create:144`,
    `update:197`).
- `team-builder.service.ts` — `getWeeks()` dựng thêm `weekEnd`. Mốc tuần đã có từ
  `getEditableWeeks`/`weekStartOf`; dùng cùng hàm `session-schedule` đang dùng, **không** tự cộng
  ngày.
- `attendance.service.ts` — không đổi. Nó đọc deadline qua `BattleSessionsService.findById()` và tự
  gọi `isDeadlinePassed` để **chặn thật**; đó là phán quyết ở server, không phải hiển thị.

### `apps/web`

- `features/attendance/api/attendance-api.ts` — xoá hàm `isDeadlinePassed` và export của nó.
- `features/attendance/components/attendance-row.tsx`, `week-timeline.tsx`, `attendance-grid.tsx` —
  đổi từ gọi hàm sang đọc `session.isDeadlinePassed`. (Kiểm tra call site bằng
  `grep -rn "isDeadlinePassed" apps/web`.)
- `features/attendance/hooks/use-deadline-refresh.ts` — giữ nguyên.
- `features/team-builder/components/week-picker.tsx` — xoá phép tính, dùng `week.weekEnd`; prop
  `value` hiện là `string` (chỉ có `weekStart`) nên component cần nhận cả object tuần đang chọn,
  hoặc tra ngược trong mảng `weeks`. Tra ngược đơn giản hơn và không đổi interface của component.
- `features/attendance/index.ts` — bỏ `isDeadlinePassed` khỏi danh sách export nếu có.

## Edge case

- **Không tìm thấy tuần đang chọn trong `weeks`** (`week-picker` tra ngược không ra) — hiện
  `value` luôn đến từ chính mảng đó (`use-formation-screen.ts:52-53` lấy từ `weeksQuery.data`), nên
  không xảy ra. Nếu không tìm thấy thì không hiển thị dải ngày, không bịa.
- **Deadline trôi qua ngay giữa lúc render** — cờ trong cache nói `false`, timer của
  `use-deadline-refresh` bắn ngay sau đó và invalidate. Cửa sổ sai lệch tối đa bằng độ trễ một
  request. Chấp nhận: server vẫn chặn thật khi người dùng bấm.
- **Đồng hồ máy người dùng lệch** — sau spec này việc khoá cột không còn phụ thuộc đồng hồ client
  (trước đây `Date.now()` ở `attendance-api.ts:34` phụ thuộc hoàn toàn). Chỉ còn thời điểm bắn timer
  là phụ thuộc, và bắn sớm/muộn chỉ tốn thêm một lần refetch. Đây là lợi ích phụ đáng kể của spec
  này.
- **Admin bỏ qua deadline** — không đổi. Cờ vẫn nói "đã quá hạn"; quyền bỏ qua nằm ở
  `OptionalJwtAuthGuard` phía API (`attendance.service.ts:83`). Nếu muốn UI mở cột cho admin thì đó
  là quyết định hiển thị riêng, ngoài phạm vi.

## Kiểm thử

- `apps/api/src/modules/battle-sessions/__tests__/battle-sessions.service.spec.ts`: `listByWeek` với
  `now` trước và sau deadline → `isDeadlinePassed` lần lượt `false` / `true`. Spec này đã quen
  truyền `now` nên không cần dựng thêm gì.
- `apps/api/src/modules/team-builder/__tests__/team-builder.service.spec.ts`: `getWeeks()` trả
  `weekEnd` đúng **Thứ 7 23:59 giờ VN**, không phải Chủ nhật — đây là test khoá lại chính lỗi đang
  có.
- `apps/web`: không có test component nên phần xoá hàm không có test trực tiếp; `pnpm --filter web
  typecheck` bắt được mọi call site còn sót vì hàm đã biến mất.

## Sửa tài liệu kèm theo

Ba chỗ đang mô tả một cờ chưa tồn tại; sau spec này chúng thành đúng, nhưng cần rà lại câu chữ:

- `docs/architecture.md` §6 — "the frontend only mirrors `isDeadlinePassed`" nay đúng nghĩa đen.
- `apps/web/docs/frontend.md` §4 mục "Time and deadlines" — như trên.
- `apps/web/docs/frontend.md` §9 bảng anti-pattern, dòng "Recomputing a deadline on the client" —
  giữ nguyên, giờ đã có cách làm đúng để đối chiếu.

## Ngoài phạm vi

- Luật trần deadline và deadline cố định của Guild War —
  [deadline-cap](./2026-08-18-deadline-cap-design.md).
- Gộp `Week` và `FormationWeek` — đã cân nhắc và loại ở §4.
- Đẩy cờ qua realtime/websocket thay vì hẹn giờ refetch — không có hạ tầng realtime, và một lần
  refetch mỗi deadline là quá rẻ để đánh đổi.
