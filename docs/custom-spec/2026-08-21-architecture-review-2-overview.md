# Rà soát kiến trúc đợt 2 (A1–A6, W1–W6) — Tổng quan

Ngày: 2026-08-21 · Phạm vi: toàn repo · Nguồn: rà soát `apps/api/src` (trừ `generated/`),
`apps/api/prisma`, `apps/web`, `packages/shared` ở commit `9820b5a`.

Mười hai cơ hội **làm sâu module** (deepening), kèm bằng chứng `file:line`. Mỗi mục có một spec
riêng trong cùng thư mục này.

Đợt trước: [C1–C7](./2026-08-18-architecture-review-overview.md) — **đã triển khai xong toàn bộ**.
Đợt này chỉ liệt kê friction **còn lại**, và không mục nào đảo lại quyết định của C1–C7.

**Trạng thái (2026-08-23):** A1–A6 **đã hiện thực xong** (`54372f9` → `f557e3a`), theo thứ tự thực tế
**A1 → A2 → A3 → A4 → A6 → A5**, khác thứ tự đề xuất ở dưới. Kết quả rà soát lại các spec A1–A6 nằm ở
[§ Rà soát lại A1–A6](#rà-soát-lại-a1a6-2026-08-23). W1–W6 chưa làm.

Sau vòng rà soát đó (2026-08-23): **§4 của A3 được làm nốt**, **lỗi #4 của A4 đã đóng** —
`parseWeekStart` ném `RangeError` nên `session-schedule.ts` hết biết framework, **lỗi #5 của A4 đã đóng** —
lỗi chỉ nằm trong spec, §4 nay chép đúng `weekStartQuerySchema` đang chạy — và **cả ba lỗi của A6 đã đóng** —
`P2003` → 409 (`ea8d0ed`), rồi purge chuyển sang đường ghi nên `GET` thành chỉ đọc và controller trở
lại mỏng — và **lỗi #6 của A5 đã đóng**: lỗi chỉ nằm trong spec, §2 nay chép đúng câu
`'Bạn cần đăng nhập.'` đang chạy. Chi tiết ở
[§ Điều kiện hoàn thành cần sửa lại](#điều-kiện-hoàn-thành-cần-sửa-lại).

Từ vựng dùng xuyên suốt (giống đợt 1): *module* (thứ có interface và implementation, ở mọi quy mô),
*interface* (mọi thứ người gọi phải biết để dùng đúng), *seam* (nơi interface nằm), *adapter* (thứ
cụ thể ngồi ở seam), *depth* (lượng hành vi trên một đơn vị interface), *leverage* (cái người gọi
được lợi), *locality* (cái người bảo trì được lợi).

## Bảng tóm tắt

### `apps/api`

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **A1** | `team-builder` gọi `listByWeek` chỉ để lấy side effect, rồi tự truy vấn bảng lịch 3 lần | Strong | [a1](./2026-08-21-a1-schedule-read-seam-design.md) |
| **A2** | `now: Date = new Date()` ở 15 chữ ký; một `POST /attendance` đánh giá luật quá hạn bằng hai đồng hồ | Strong | [a2](./2026-08-21-a2-clock-module-design.md) |
| **A3** | Codec response viết tay ở 5 chỗ; `Character` dựng ở 2 module với comment trùng từng chữ | Strong | [a3](./2026-08-21-a3-response-codec-design.md) |
| **A4** | `weekStart` là string trần: input hỏng → 500, lệch ngày → `[]` im lặng, so tuần bằng chuỗi | Strong | [a4](./2026-08-21-a4-week-start-design.md) |
| **A5** | Hai guard chép cùng một luật access-token; `common/` không có test nào | Worth exploring | [a5](./2026-08-21-a5-bearer-token-design.md) |
| **A6** | `GET /team-builder/weeks` chạy `deleteMany`; luật ô đội hình viết 3 lần theo 3 hình | Worth exploring | [a6](./2026-08-21-a6-formation-grid-codec-design.md) |

### `apps/web`

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **W1** | Giao thức "dialog gọi mutation" chép tay ở 4 dialog (20 mẩu lặp); 0 file `.test.tsx` | Strong | [w1](./2026-08-21-w1-mutation-dialog-design.md) |
| **W2** | Luật lọc roster 3 bản, bản ở màn Quản lý thành viên **đã lệch** (mất vế tìm theo ID) | Strong | [w2](./2026-08-21-w2-roster-filter-design.md) |
| **W3** | Gộp query dựng lại 4 lần; `use-formation-week` vứt message backend của 2/3 query và refetch thiếu | Strong | [w3](./2026-08-21-w3-query-group-design.md) |
| **W4** | Store bắt caller truyền `base`; ba người cùng ghi vào `drafts` | Worth exploring | [w4](./2026-08-21-w4-formation-draft-seam-design.md) |
| **W5** | Đồ thị invalidate cache nêu 3 lần; key factory lọt ra khỏi feature sở hữu | Worth exploring | [w5](./2026-08-21-w5-cache-graph-design.md) |
| **W6** | Nhận diện Guild War vẽ lại ở 4 màn, đã lệch cỡ icon một chỗ | Worth exploring | [w6](./2026-08-21-w6-session-label-design.md) |

**Ba mục vá lỗi thật, không chỉ dọn kiến trúc**: W3 (mất message tiếng Việt + nút thử lại không chạy),
W2 (không tìm được theo ID ở màn Quản lý thành viên), A4 (input hỏng thành 500).

## Thứ tự thực hiện

Hai nhánh **độc lập hoàn toàn** — có thể làm song song, hoặc chọn một nhánh làm trước.

```
apps/api:   A2 ──► A4 ──► A1 ──► A3 ──► A6
                                 A5  (độc lập, làm lúc nào cũng được)

apps/web:   W3 ──► W2 ──► W1 ──► W6
                          W4  ·  W5  (độc lập)
```

### Vì sao thứ tự đó ở backend

- **A2 trước tất cả.** Bốn spec còn lại đều thêm hoặc sửa chữ ký đang mang `now`. Làm A2 sau nghĩa
  là đặt chữ ký hai lần.
- **A4 trước A1.** Hai hàm public mới của A1 (`ensureWeekMaterialized`, `readWeekSessions`) nhận một
  mốc tuần — nên biết kiểu của nó trước khi đặt chữ ký.
- **A1 trước A3.** A1 bịt chỗ rò ở bảng `battleSession`; A3 làm đúng việc đó cho bảng `character`.
  Làm A1 trước để khuôn "một bảng, một chủ" đã có một tiền lệ.
- **A1 trước A6.** A1 dọn phần đọc lịch ra khỏi `team-builder.service.ts`; phần còn lại mới đủ nhỏ
  để tách rõ ba việc.
- **A5 độc lập** — chạm `common/` và `auth`, không giao với bốn spec kia.

### Vì sao thứ tự đó ở web

- **W3 trước.** Diff nhỏ nhất, vá một lỗi đang thấy được, và chạm cùng bốn màn mà W1/W2 sẽ chạm —
  đi trước thì mỗi màn chỉ bị mở ra sửa một lần cho phần trạng thái.
- **W2 sau W3.** Cũng vá một lỗi, cũng chạm ba trong bốn màn đó.
- **W1 sau W2.** Lớn hơn, và nó dựng hạ tầng test render (`@testing-library/react` + `jsdom`) —
  phần cần được duyệt trước khi làm.
- **W6 sau W1.** Nó là ứng viên đầu tiên đáng render-test, nên hưởng hạ tầng W1 dựng.
- **W4, W5 độc lập.** W4 chỉ trong `features/team-builder`; W5 chỉ chạm các hook mutation.

### Nếu chỉ làm được một việc

**A1.** Đây là chỗ duy nhất mà interface hiện tại nói dối: `listByWeek` được gọi để lấy side effect,
ràng buộc thứ tự chỉ sống trong một comment ở phía caller, và một endpoint mới quên dòng đó sẽ trả
về tuần thiếu Guild War — im lặng, không lỗi. Nó cũng rẻ: hai hàm thêm vào `.public.ts`, ba truy vấn
Prisma bỏ đi, và một mock nói dối trong spec biến mất.

Nếu ưu tiên là "người dùng thấy được ngay" thì đổi thành **W3** — hai lỗi thật, diff nhỏ nhất trong
cả mười hai mục.

## Những gì rà soát **không** tìm thấy vấn đề

Ghi lại để khỏi rà lại.

**Backend**

- `packages/shared/lib/vn-time.ts` — module sâu đúng nghĩa: 4 hàm export, invariant nêu rõ,
  `VN_OFFSET_MS` giữ private. C3 đã dọn xong.
- `session-schedule.ts` — hàm thuần, tất định, spec phủ ranh giới tuần / Guild War / nhãn /
  deadline. Module tốt nhất của backend.
- `config/env.validation.ts` + `config/cors.ts` — fail-fast, `cors.spec.ts` phủ cả nhánh preview;
  comment giải thích vì sao trả `false` thay vì ném.
- `characters.lib.ts` — nhỏ, thuần, có test, đúng chỗ.
- `infrastructure/prisma/prisma.service.ts` — mỏng có chủ đích, `createPool` ghi rõ lý do tồn tại.
- `src/__tests__/module-boundary.spec.ts` + `eslint-plugin-boundaries` — hàng rào có người kiểm.
  C5 đã xử lý.
- `prisma/load-env.ts` — ba nhánh, mỗi nhánh có lý do rõ.
- `auth.service.ts` — `timingSafeEqual` qua SHA-256 hai phía là đúng, đã có spec (C7 đã vá).

**Frontend**

- `lib/api-client.ts` — đúng một chỗ gọi `fetch`, bóc `{data}`, giữ message tiếng Việt; 65 dòng,
  interface một hàm, có test.
- `proxy.ts` + `features/auth/core` — C7 đã xong; hai `readAuthSecret`/`getAuthSecret` khác nhau
  **có chủ ý**, lý do đã ghi trong cả hai file. **Đừng hợp nhất.**
- `features/auth/core/index.ts` — seam chia theo *runtime* (Edge-safe) chứ không theo public/private,
  có comment giải thích.
- `features/team-builder/lib/` — không còn là bầy helper một-caller như C4 mô tả. Những module còn
  một caller (`active-match`, `session-status`, `week-status`, `active-session`) cô lập luật quyết
  định; deletion test nói độ phức tạp chỉ *chuyển chỗ* còn chi phí test thì tăng. **Không đụng.**
- `components/shared/` — không file nào đặt sai chỗ.
- Không store nào giữ server data; mọi cross-feature import đi qua `index.ts`.

**Điểm nhỏ, không đủ thành ứng viên**

- `prisma/fix-deadlines.ts` import thẳng `../src/modules/battle-sessions/session-schedule` — hợp lệ
  vì `prisma/**` được miễn lint và đây là script một lần; nhưng đổi tên file kia thì script gãy im
  lặng.
- `attendanceKeys.weeks()` không có call site nào (xem [W5](./2026-08-21-w5-cache-graph-design.md)).

## Rà soát lại A1–A6 (2026-08-23)

Đối chiếu từng `file:line` của sáu spec backend với code tại commit gốc `9820b5a`. Ghi lại ở đây để
sau này không phải kiểm lại, và để biết chỗ nào trong spec **không được đọc như lời cuối**.

Vòng rà soát này chỉ đọc spec. Vòng thứ hai — [§ Đối chiếu với kế hoạch](#đối-chiếu-với-kế-hoạch-2026-08-23)
— đọc thêm `docs/custom-plan/` và tìm ra bảy chỗ spec **thiếu**, không phải sai: những thứ chỉ lộ ra
khi phải viết từng bước xuống.

### Phần đã kiểm và đúng

- **A2** — đúng cả 15 chữ ký `now: Date = new Date()`, đúng từng dòng (7 `battle-sessions` + 2
  `attendance` + 3 `team-builder` + 3 `session-schedule`).
- **A1** — ba chỗ `team-builder` truy vấn thẳng `prisma.battleSession` (`:72`, `:123`, `:176`); doc
  comment `battle-sessions.service.ts:42-46`; side effect ở `listByWeek:92-94`.
- **A3** — `attendance:32-35/:37-45/:60-68/:118-123`, `team-builder:214-222` hụt `satisfies`; luật
  `satisfies` ở `apps/api/docs/backend.md:117`; **không có `.parse()` nào chạy trên schema chiều ra**
  *(đúng tại `9820b5a` và cho tới khi §4 được làm nốt ngày 2026-08-23 — xem §Điều kiện hoàn thành
  cần sửa lại)*.
- **A4** — `2026-07-22Z` đúng là Thứ 4; `2026-07-20T00:00:00+07:00` đúng là mốc Thứ 2 giờ VN;
  `z.iso` là namespace hợp lệ vì repo dùng zod v4 (nhưng `z.iso.datetime()` trần thì sai — xem lỗi #5).
- **A5** — `jwt-auth.guard.ts:13/:37-52`, `optional-jwt-auth.guard.ts:8`, `auth.service.ts:63-68`;
  `common/` thật sự không có file test nào.
- **A6** — toàn bộ line ref (`:33-51`, `:144-155`, `:143/:183/:220`, `:190/:200`, `schema.prisma:111`).

### Lỗi thật

| # | Spec | Vấn đề |
|---|---|---|
| 1 | A6 | **Tiêu đề mâu thuẫn với §3.** Tiêu đề nói "đưa việc xoá ra khỏi đường `GET`" và dòng A6 ở bảng tóm tắt cũng vậy, nhưng §3 giữ purge trên đường `GET`, chỉ dời call site từ service lên controller. `deleteMany` vẫn chạy mỗi lần `GET` (bản hiện thực: `team-builder.controller.ts:38`). Đó là đổi chỗ, không phải xử lý vấn đề. *(**Đã đóng 2026-08-23** — purge chuyển sang `saveFormation`; `GET` chỉ đọc, tiêu đề spec giờ đúng nghĩa đen.)* |
| 2 | A6 §3 | **Đi ngược `architecture.md:114-115`** (*"Services hold the business logic"*, controller mỏng). Đưa trình tự "purge rồi mới đọc" lên controller là kéo nghiệp vụ lên một lớp. `architecture.md` là **binding** — spec phải trả lời luật này, không được lướt qua. *(**Đã đóng 2026-08-23** — trình tự và `Clock` cùng về service, controller còn một dòng.)* |
| 3 | A6 §4 | **Luận điểm không đứng vững.** Chuyển `loadCharacterIds` vào `$transaction` **không** đóng được race: Prisma dùng isolation mặc định của Postgres (READ COMMITTED), `SELECT id FROM character` trong tx không khoá hàng, nên một `DELETE` commit sau lúc đọc vẫn làm vỡ khoá ngoại. Nó chỉ *thu hẹp* cửa sổ. Fix đúng: bắt `P2003` → 409 tiếng Việt, hoặc serializable isolation. *(**Đã đóng 2026-08-23** — `ea8d0ed`: `team-builder.service.ts:201-213` bắt `P2003` qua `isForeignKeyViolation` và ném `ConflictException('Có thành viên vừa bị xoá khỏi bang, vui lòng tải lại trang rồi lưu lại.')`, lỗi khác `throw` nguyên; hai test ở `team-builder.service.spec.ts:539/:555`. Phép đọc trong transaction vẫn giữ, nhưng comment tại chỗ nói đúng rằng nó chỉ thu hẹp cửa sổ.)* |
| 4 | A4 §1 | **`parseWeekStart` ném `BadRequestException` đặt sai lớp** — nó nằm trong `session-schedule.ts`, đúng file mà overview khen là *"hàm thuần, tất định"* và A2 §4 khẳng định không được biết framework. Thêm nữa: sau khi §4 có DTO Zod thì `?weekStart=xyz` bị chặn ngay ở pipe, nhánh ném **không còn với tới được từ HTTP**, nên test "`battle-sessions.service.spec.ts`: `?weekStart=xyz` → `BadRequestException`" nằm sai tầng, và triệu chứng 500 ở §Bối cảnh #1 được §4 vá một mình. *(**Đã đóng 2026-08-23** — `session-schedule.ts` không còn import `@nestjs/common`; chuỗi hỏng ném `RangeError` như một lỗi hợp đồng nội bộ, còn 400 tiếng Việt do `weekStartQuerySchema` dựng ở biên. Xem [§ Điều kiện hoàn thành cần sửa lại](#điều-kiện-hoàn-thành-cần-sửa-lại).)* |
| 5 | A4 §4 | **`z.iso.datetime()` loại chính ca test của spec.** Zod v4 mặc định `offset: false`, chỉ nhận hậu tố `Z`. Ca *"một mốc `+07:00` và cùng mốc đó dạng `Z` phải cho cùng kết quả"* sẽ ăn 400 ở controller. Phải là `z.iso.datetime({ offset: true })`. *(**Đã đóng 2026-08-23** — chỉ spec sai: kế hoạch A4 đã bắt lỗi này trước khi hiện thực và kiểm chứng bằng Zod 4.4, bản hiện thực dùng `offset: true` (`battle-session.schema.ts:43`), ca test `+07:00` có thật ở `week-start-query.spec.ts:22` và `session-schedule.spec.ts:178`. A4 §4 nay chép đúng schema đang chạy.)* |
| 6 | A5 | **§2 mâu thuẫn với §3.** Snippet §2 ném `'Phiên đăng nhập không hợp lệ.'`, còn §3 quyết định gộp về đúng một câu `'Bạn cần đăng nhập.'` *(**Đã đóng 2026-08-23** — chỉ spec sai: bản hiện thực `jwt-auth.guard.ts:44` đã ném đúng `'Bạn cần đăng nhập.'` từ `f557e3a`, và `grep` không còn câu `'Phiên đăng nhập không hợp lệ.'` nào trong `apps/api/src`. §2 nay chép đúng dòng đang chạy kèm comment trỏ về §3; dải dòng `optional-jwt-auth.guard` sửa thành `:26-38`.)* |

### Lỗi nhỏ và chỗ nói quá

- **A1 đếm sai số hàm** — dòng "Nếu chỉ làm được một việc" nói *"hai hàm thêm vào `.public.ts`"*,
  nhưng A1 định nghĩa **ba** (`ensureWeekMaterialized`, `readWeekSessions`, `listWeekAnchors`) và bảng
  thay đổi của chính nó ghi *"re-export ba hàm"*. (Đoạn "A4 trước A1" thì đúng — ở đó chỉ nói về hai
  hàm nhận mốc tuần.)
- **A1 §Edge case gọi "bỏ nhánh `if` ở :119" là no-op — không hẳn.** Nhánh đó giới hạn việc sinh trận
  cho **tuần đang mở**; gọi vô điều kiện thì **tuần kế tiếp** (cũng editable) cũng bị sinh Guild War
  qua `GET /team-builder/formations?weekStart=<tuần sau>`. Spec chỉ lập luận cho tuần quá khứ. Bản
  hiện thực đúng như vậy (`team-builder.service.ts:89`) — một thay đổi hành vi nhỏ chưa được ghi.
- **A2 — điều kiện hoàn thành không đạt được** bằng chính bảng thay đổi của nó: `grep -rn "new Date()"
  src/modules` còn dính `modules/health/health.controller.ts:36` và `characters.service.spec.ts:12-13`,
  cả hai không nằm trong bảng. Thực tế phải thêm commit riêng (`31e1632`) để đưa health qua `Clock`.
- **A2 §4 sai kiểu trả về**: `getActiveWeek(now): Week` — thật ra là `ScheduledWeek`. Không vô hại, vì
  `Week` là shape response ở `@guild/shared`.
- **A2 nói quá về "hai đồng hồ"**: cả hai đều là `new Date()` cách nhau vài mili giây trong cùng một
  request; sai lệch chỉ hiện ra nếu deadline rơi đúng khe đó. Vấn đề thật là **luật được đánh giá hai
  lần rồi vứt một kết quả**, không phải output sai quan sát được.
- **A4 §3 đặt tên đụng nhau**: method `getActiveWeek(): WeekAnchor` trùng tên hàm thuần
  `getActiveWeek(now): ScheduledWeek` trong `session-schedule.ts` mà `.public.ts` re-export.
- **A3 lệch 1 dòng ở `characters.service.ts`**: `toEntity` ở `:118-126`, `satisfies` ở `:125` (spec ghi
  `:117-125` và "characters:124"). Mọi ref khác trong A3 chính xác.
- **A3 §Edge case về thứ tự sắp xếp là thừa**: `CharactersService.list()` đã dùng đúng
  `orderBy: { name: 'asc' }` như `attendance.getCharacters` — không có rủi ro "đổi thứ tự lặng".
- **A5 lệch dải dòng**: khối `optional-jwt-auth.guard` là `:26-38` (trích dẫn có `return true` ở `:38`),
  spec ghi `:26-36`. *(Đã sửa 2026-08-23 cùng lỗi #6.)*
- **A6 §2** chứa đoạn *"Đã sửa khi hiện thực"* — tài liệu lẫn spec với ghi chú hậu-hiện-thực, lệch với
  ngày tháng và giọng của các mục còn lại.

## Đối chiếu với kế hoạch (2026-08-23)

Vòng trên chỉ đọc spec, nên chỉ tìm được **lỗi**. Vòng này đọc `docs/custom-plan/` cạnh spec và tìm
thêm bảy chỗ spec **thiếu** — thứ chỉ lộ ra khi phải viết từng bước xuống, và mỗi chỗ đều buộc kế
hoạch phải tự chốt một quyết định spec không nói.

**Phạm vi:** chỉ có bốn kế hoạch tồn tại — `a3`, `a4`, `a5`, `a6` (cộng `c1` của đợt trước). Kế hoạch
A1 và A2 đã bị xoá (`b2a3d21`), nên hai spec đó không có gì để đối chiếu.

### Chỗ spec thiếu, kế hoạch phải tự chốt

| # | Spec | Chỗ thiếu | Kế hoạch chốt thế nào |
|---|---|---|---|
| 7 | A3 §2 | **Sót một call site.** Spec chỉ nói `attendance` truy vấn thẳng `prisma.character`, nhưng `team-builder.service.ts` (`loadCharacterIds`) cũng vậy. Bỏ qua thì câu *"một bảng, một chủ"* vẫn còn đúng một ngoại lệ phải nhớ — đúng thứ spec viết ra để xoá. | Mở rộng phạm vi sang `team-builder` (Task 4), và khẳng định bằng `grep -rn "prisma.character"`. *(**Đã đóng 2026-08-23** — A3 §2 nay tên là *"`attendance` và `team-builder` thôi truy vấn bảng `character`"*, chép đúng chữ ký `CharactersService.listIds(client)` đang chạy và lý do client bắt buộc; §Bối cảnh nêu call site `team-builder.service.ts:229-235`, bảng thay đổi thêm hai dòng `team-builder`, §Rủi ro nêu cả hai quan hệ module. `grep -rn "prisma\.character" apps/api/src` chỉ còn `modules/characters/`.)* |
| 8 | A3 §4 | **Cả một §bị bỏ, và lỗ hổng nó vá vẫn còn mở.** §4 (chạy `characterSchema.parse()` ngoài production) bị loại khi lập kế hoạch. Spec đã dự phòng chuyện này (*"bỏ nó không làm hỏng phần còn lại"*), nhưng phần §Bối cảnh chẩn đoán *"enum lệch trong database chảy thẳng ra client, fail lặng"* thì **không ai vá**. Đó là một vấn đề còn nguyên, không phải một mục đã đóng. | Bỏ §4, không thêm `SHOULD_VERIFY_RESPONSES`, không thêm nhánh rẽ theo môi trường. **Đã đảo lại 2026-08-23**: §4 hiện thực thành `config/response-verification.ts` (`verifyResponse`), phủ cả sáu shape chiều ra — xem [§Điều kiện hoàn thành cần sửa lại](#điều-kiện-hoàn-thành-cần-sửa-lại). |
| 9 | A4 §4 | **Một DTO cho hai module là bất khả thi.** Bảng thay đổi chỉ ghi `battle-sessions/dto/battle-session.dto.ts`, nhưng `team-builder` không được import DTO của `battle-sessions` (luật ranh giới module), và đẩy một DTO class qua `battle-sessions.public.ts` là phơi chi tiết HTTP của module này ra module khác. | Hai file DTO một dòng, mỗi module một cái; shape vẫn khai báo đúng một lần ở `packages/shared`. Bản hiện thực đúng như vậy. *(**Đã đóng 2026-08-23** — chỉ spec thiếu: A4 §4 nay ghi rõ hai file `battle-sessions/dto/week-start-query.dto.ts` và `team-builder/dto/week-start-query.dto.ts`, kèm lý do (luật ranh giới module, không đẩy DTO qua `.public.ts`) và câu chốt rằng đây không phải chỗ lặp vì shape vẫn ở `packages/shared`; bảng thay đổi thay dòng `battle-session.dto.ts` sai bằng hai dòng file mới và sửa số dòng controller thành `:46`/`:42`.)* |
| 10 | A4 | **Không nói ai sở hữu câu `'Tuần không hợp lệ.'`** Sau §4 câu đó phải xuất hiện ở hai tầng — Zod (`packages/shared`) và `parseWeekStart` (`apps/api`) — nên nó là một chuỗi lặp giữa hai package. | Hằng `INVALID_WEEK_MESSAGE` ở `packages/shared`, theo đúng khuôn `DEADLINE_CAP_MESSAGE`. |
| 11 | A5 §1 | **Chữ ký `VerifyToken` tự đánh bại mục đích của spec.** `VerifyToken = (token) => Promise<JwtPayload \| null>` (*"trả null thay vì ném"*) đẩy `.catch(() => null)` ngược về cả ba call site — đúng bản sao spec viết ra để xoá. | Đảo lại: `VerifyToken` **được phép ném**, `readToken` là chỗ duy nhất còn `.catch(() => null)`, khoá bằng `grep`. |
| 12 | A5 | **Test §Kiểm thử yêu cầu không chạy được.** Spec đòi test 4 nhánh của `describeException`, nhưng hàm đang `private` trong `all-exceptions.filter.ts` và spec không nói phải mở nó. | `export` hàm, kèm một câu doc comment nói vì sao nó public. |
| 13 | A6 §4 | **Fix của spec vi phạm chính luật A3 vừa dựng.** Spec viết `tx.character.findMany` ngay trong `team-builder` — đi ngược `apps/api/docs/backend.md:120` (*"module đọc bảng của người khác thì gọi service của module đó"*). Đây là lỗi thứ hai của §4, tách khỏi lỗi #3 ở trên. | `CharactersService.listIds(client)` nhận transaction client của caller. Lỗi #3 được đóng sau đó (`ea8d0ed`): thêm nhánh bắt `P2003` → 409, race không còn thành 500. |

### Chỗ kế hoạch lệch spec, rồi bản hiện thực lệch tiếp

Ghi lại vì cả ba tài liệu (spec · kế hoạch · code) đang nói ba thứ khác nhau ở cùng một chỗ.

- **`isSessionLocked` — kế hoạch A6 đã lỗi thời.** Kế hoạch đặt nó trong `formation-grid.ts` và nói
  thẳng ở §Kiến trúc *"đây không phải luật tuần/deadline nên nó không thuộc `session-schedule.ts`"*.
  Spec (sau khi sửa) và bản hiện thực làm ngược lại: `session-schedule.ts:225`, ra ngoài qua
  `battle-sessions.public.ts`. Kế hoạch A6 chưa được cập nhật sau khi hiện thực.
- **`purgeExpiredFormations(now)` — kế hoạch chốt một đằng, code làm một nẻo.** Kế hoạch A6 §2 chốt
  hàm **không** nhận `now` vì *"controller không có `Clock`"*. Bản hiện thực cho controller inject
  `Clock` và gọi `purgeExpiredFormations(this.clock.now())` (`team-builder.controller.ts:38`). Hệ quả:
  controller giữ **cả** trình tự nghiệp vụ **lẫn** đồng hồ — làm lỗi #2 (đi ngược
  `architecture.md:114-115`) nặng thêm chứ không nhẹ đi. *(Hết hiệu lực 2026-08-23: caller giờ là
  `saveFormation`, hàm vẫn nhận `now` như spec chốt, controller không còn `Clock`. Câu hỏi của kế
  hoạch — "controller không có `Clock`" — tự biến mất cùng call site.)*
- **`listIds` đổi chữ ký so với kế hoạch.** Kế hoạch: `listIds(client?): Promise<string[]>` (client tuỳ
  chọn). Code: `listIds(client): Promise<Set<string>>` — client **bắt buộc**, trả `Set`. Chữ ký code tốt
  hơn (không có đường đọc ngoài transaction để lỡ tay chọn), nhưng không tài liệu nào ghi lại lựa chọn đó.
  *(Hết hiệu lực 2026-08-23 cùng mục #7: A3 §2 chép đúng chữ ký và ghi lý do client bắt buộc; kế hoạch A3
  Task 4 Bước 2 có ghi chú trỏ sang §2 thay cho đoạn `list()` đã lỗi thời.)*
- **Món nợ `TODO(A1)` của A4 không bao giờ tồn tại.** Spec A4 và kế hoạch đều giả định A4 đi **trước**
  A1, nên chốt *"giữ phép so chuỗi ở `attendance` và ghi `// TODO(A1)`"*. Thứ tự thực tế là A1 trước,
  nên phép so được đóng ngay bằng `isSameWeek` (`3e96ebd`) — không có `TODO(A1)` nào trong code.
- **Kế hoạch A4 thiếu một task so với thực tế.** Ngoài 7 task của kế hoạch còn có `9b0a9a2`
  (*"let the write path speak week anchors too"*) — đường **ghi** (`create`/`update` trận) cũng phải
  nói `WeekAnchor`, thứ mà cả spec lẫn kế hoạch chỉ nói cho đường đọc.

### Điều kiện hoàn thành cần sửa lại

- **A3 — đã đóng (2026-08-23).** Trước đó A3 chưa xong theo nghĩa spec đặt ra: §4 bị bỏ nên chẩn
  đoán *"schema chiều ra là type chết"* ở §Bối cảnh vẫn đúng nguyên văn. Xử lý: **làm nốt §4** thay
  vì hạ lời hứa của spec.
  - `apps/api/src/config/response-verification.ts` — `SHOULD_VERIFY_RESPONSES`
    (`NODE_ENV !== 'production'`) và `verifyResponse(schema, value)`: ngoài production thì chạy
    `schema.parse`, trong production thì trả thẳng giá trị.
  - Phủ **cả sáu** shape chiều ra, không chỉ ba shape có codec: `Character`, `AttendanceRecord`,
    `BattleSession` gọi trong codec; `Week` gọi ở `battle-sessions.service.getEditableWeeks`;
    `FormationWeek` và `SessionFormation` (2 chỗ) gọi ở `team-builder.service`. Phủ nửa vời thì câu
    "type chết" vẫn đúng với nửa còn lại.
  - Đây là chỗ **duy nhất** trong `src/` đọc thẳng `process.env`. Lý do (codec là hàm mức module,
    ngoài cây DI nên không nhận được `ConfigService`) ghi ở chính file đó, ở `apps/api/docs/backend.md`
    và ở `apps/api/CLAUDE.md` — hai chỗ đang phát biểu luật *"Nothing reads `process.env`"*.
  - Test: `config/response-verification.spec.ts` khoá cả hai nhánh của cờ (nhánh production nạp lại
    module trong `jest.isolateModules`); hai codec spec thêm bài "enum lạ trong database làm codec
    ném". Spec A3 §4 và kế hoạch A3 Task 6 đã cập nhật theo.
- **A6 lỗi #3 — đã đóng (2026-08-23, `ea8d0ed`).** Race "thành viên bị xoá đúng lúc ghi" không còn
  thành 500.
  - `team-builder.service.ts:31` — hằng `FOREIGN_KEY_VIOLATION = 'P2003'`; `:228-240` —
    `isForeignKeyViolation(error)`, một hàm thuần đọc `error.code`.
  - `:201-213` — `.catch()` bọc `$transaction` của `saveFormation`: P2003 thành
    `ConflictException('Có thành viên vừa bị xoá khỏi bang, vui lòng tải lại trang rồi lưu lại.')`,
    mọi lỗi khác `throw` nguyên. Câu tiếng Việt nói đúng thao tác cần làm (tải lại rồi lưu lại).
  - Phép đọc `characters.listIds(tx)` **giữ trong transaction**, nhưng comment tại chỗ (`:171-176`)
    và `@throws` của `saveFormation` (`:152-153`) nói đúng rằng nó chỉ thu hẹp cửa sổ chứ không
    đóng race — hết phần "nói quá" mà lỗi #3 chỉ ra.
  - Test: `team-builder.service.spec.ts:539` ("thành viên bị xoá đúng lúc ghi thành 409, không phải
    500") và `:555` ("lỗi database khác không bị nuốt thành 409"). Spec A6 §4 đã cập nhật theo.
- **A4 lỗi #4 — đã đóng (2026-08-23).** `session-schedule.ts` trở lại thuần: bỏ import
  `BadRequestException` và `INVALID_WEEK_MESSAGE`, nhánh chuỗi hỏng ném
  `RangeError('parseWeekStart received a non-ISO string: …')`. Đó là phân vai đúng sau khi §4 có DTO
  — `weekStartQuerySchema` là tầng duy nhất dựng câu `'Tuần không hợp lệ.'` và status 400, nên chuỗi
  hỏng tới được `parseWeekStart` chỉ có thể là caller trong process gọi sai hợp đồng;
  `AllExceptionsFilter` biến nó thành 500 kèm stack trong log và **không** rò message ra client.
  - `INVALID_WEEK_MESSAGE` giờ có đúng một người đọc (schema ở `packages/shared`), nên chỗ lặp giữa
    hai package mà mục #10 nêu cũng tự hết.
  - Test đổi tầng theo: ca 400 + câu tiếng Việt đã nằm sẵn ở `week-start-query.spec.ts:30-35`; ba ca
    ở tầng dưới (`session-schedule.spec.ts`, `battle-sessions.service.spec.ts`,
    `team-builder.service.spec.ts`) đổi sang `RangeError` và giữ nguyên phần thật sự thuộc tầng đó —
    "ném ngay, không rơi xuống Prisma / module lịch". Spec A4 §1 và kế hoạch A4 Task 3 đã cập nhật.
- **A6 lỗi #1, #2 — đã đóng (2026-08-23).** Chốt sau khi cân ba phương án (giữ purge trên `GET` nhưng
  đưa trình tự xuống service · chuyển sang đường ghi · dựng đường riêng/cron): chọn **đường ghi**, vì
  nó đóng cả hai lỗi mà không thêm hạ tầng nào — `architecture.md` §8 vẫn đúng nguyên văn.
  - `saveFormation` gọi `purgeExpiredFormations(now)` sau hai guard (404, 409) và **trước**
    `$transaction`: request bị từ chối thì không đụng dữ liệu, và một `deleteMany` hỏng không biến
    một lượt lưu đã thành công thành 500.
  - `getWeeks` (service) và `TeamBuilderController` đều thành chỉ đọc; controller không còn inject
    `Clock`, `getWeeks` còn đúng một dòng — hết vi phạm `architecture.md:114-115`.
  - Đánh đổi đã ghi vào spec A6 §3: retention chỉ tiến khi có người lưu, và `PUT` gánh thêm một
    `deleteMany`. `purgeExpiredFormations` giữ public để đổi caller sang cron khi có job thứ hai.
  - Test: `team-builder.service.spec.ts` thêm ba ca (mốc cắt theo `Clock`; purge trước transaction;
    ngày đã khoá thì không dọn); `team-builder.controller.spec.ts` khoá chiều ngược lại — `GET`
    không gọi purge.
