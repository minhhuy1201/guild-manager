# Rà soát kiến trúc C1–C7 — Tổng quan

Ngày: 2026-08-18 · Phạm vi: toàn repo · Nguồn: rà soát toàn bộ `apps/api/src`, `apps/web`,
`packages/shared` và toàn bộ tài liệu ở commit `f2312c6`.

Bảy cơ hội **làm sâu module** (deepening), kèm bằng chứng `file:line`. Mỗi mục có một spec riêng
trong cùng thư mục này.

## Kết luận về cấu trúc feature-based

**Đã có sẵn ở cả hai phía, không cần dựng lại.**

- `apps/api/src/modules/` — 6 domain (`attendance`, `auth`, `battle-sessions`, `characters`,
  `health`, `team-builder`), mỗi cái là một mini-app với `dto/`, `entities/`, `__tests__/`.
- `apps/web/features/` — 5 feature (`attendance`, `auth`, `members`, `settings`, `team-builder`),
  mỗi cái có `api/ hooks/ store/ lib/ types/ components/ index.ts`.
- `packages/shared` — enum + Zod schema dùng chung, có `exports` map.
- ESLint chặn import xuyên slice (`apps/api/eslint.config.mjs`).

Việc còn lại không phải sắp xếp lại thư mục, mà là **thu hẹp interface của những module đang
shallow** và **bịt những chỗ rò qua seam**.

Từ vựng dùng xuyên suốt các spec này: *module* (thứ có interface và implementation, ở mọi quy mô),
*interface* (mọi thứ người gọi phải biết để dùng đúng), *seam* (nơi interface nằm, chỗ thay đổi được
hành vi mà không sửa tại chỗ), *depth* (lượng hành vi trên một đơn vị interface), *leverage* (cái
người gọi được lợi), *locality* (cái người bảo trì được lợi).

## Bảng tóm tắt

| | Vấn đề | Mức | Spec |
|---|---|---|---|
| **C1** | `packages/shared` chỉ định nghĩa chiều request; 8 shape response khai báo tay hai lần | Strong | [c1](./2026-08-18-c1-response-contract-design.md) |
| **C2a** | Deadline không có trần; Guild War sửa được | Strong | [deadline-cap](./2026-08-18-deadline-cap-design.md) |
| **C2b** | `isDeadlinePassed` và `weekEnd` bị tính lại trên client, một chỗ tính **sai ngày** | Strong | [c2](./2026-08-18-c2-schedule-flags-design.md) |
| **C3** | Nguyên thủy giờ VN tách nửa vời, hai quy ước đánh số thứ cùng tồn tại | Strong | [c3](./2026-08-18-c3-vn-clock-design.md) |
| **C4** | `useFormationScreen` 340 dòng, interface 48 khoá, không test được | Strong | [c4](./2026-08-18-c4-formation-screen-design.md) |
| **C5** | `*.module.ts` kiêm barrel public; luật ESLint khoá cứng theo độ sâu thư mục | Worth exploring | [c5](./2026-08-18-c5-module-seam-design.md) |
| **C6** | `apps/web` không khai báo `@guild/shared`, import vòng qua `exports` map | Worth exploring | [c6](./2026-08-18-c6-shared-package-identity-design.md) |
| **C7** | `jwt.ts`, `proxy.ts`, `auth.service.ts` không có test; `proxy.ts` import xuyên seam | Worth exploring | [c7](./2026-08-18-c7-session-module-design.md) |

## Thứ tự thực hiện đề nghị

```
C3 ──► C1 ──► C2b ──► C6
        │
        └───► (độc lập) C4 · C5 · C7
```

- **C3 trước C1**: C1 cần một chỗ đặt luật thời gian dùng chung; C3 dọn chỗ đó.
- **C1 trước C2b**: C2b là thêm hai field vào response — cần contract đã có chỗ để thêm.
- **C1 trước C6**: sau C1 thì `apps/web` phụ thuộc `packages/shared` ở mức runtime chứ không chỉ
  type, nên câu hỏi "import bằng danh tính nào" mới có câu trả lời bắt buộc.
- **C4, C5, C7 độc lập**, làm lúc nào cũng được.

## C1 — Chiều response chưa có contract

`packages/shared/schemas/` chỉ chứa **body request**. Mọi shape trả về được khai báo tay hai lần:

| Shape | apps/api | apps/web |
|---|---|---|
| Member | `characters/entities/character.entity.ts:4` | `features/members/types/member.ts:4` |
| Character | `attendance/entities/attendance.entity.ts:4` | `features/attendance/types/attendance.ts:6` |
| AttendanceRecord | `attendance/entities/attendance.entity.ts:12` | `features/attendance/types/attendance.ts:53` |
| BattleSession | `battle-sessions/entities/battle-session.entity.ts:2` | `features/attendance/types/attendance.ts:19` |
| Week | `battle-sessions/entities/battle-session.entity.ts:21` | `features/attendance/types/attendance.ts:41` |
| SessionFormation | `team-builder/entities/formation.entity.ts:9` | `features/team-builder/types/session-formation.ts:20` |
| FormationWeek | `team-builder/entities/formation.entity.ts:31` | `features/team-builder/types/session-formation.ts:37` |
| AuthTokens | `auth/entities/auth.entity.ts:12` | `features/auth/api/auth-api.ts:7` |

Bằng chứng rõ nhất là comment tiếng Việt trùng **từng chữ** giữa
`formation.entity.ts:23-26` và `session-formation.ts:29-32`, và câu
`session-formation.ts:7`: *"Một trận đúng như backend trả về"* — type ở web được chép bằng cách đọc
shape của backend.

## C2b — Luật lịch rò qua seam

Tài liệu (`architecture.md` §6, `frontend.md` §4) bảo frontend chỉ được *mirror* cờ
`isDeadlinePassed` API gửi về. **Cờ đó không tồn tại** trong `BattleSessionEntity`. Hệ quả:

- `features/attendance/api/attendance-api.ts:33` — web tự viết `isDeadlinePassed`.
- `features/attendance/hooks/use-deadline-refresh.ts:42` — so sánh lại lần thứ hai.
- `features/team-builder/components/week-picker.tsx:22` — `FormationWeek` không có `weekEnd`, nên
  component **tự cộng 6 ngày ra Chủ nhật**, trong khi backend chốt tuần ở Thứ 7 23:59
  (`session-schedule.ts:22,68`). Cùng một tuần, hai ngày kết thúc, tuỳ màn hình đang mở.
  `features/settings/components/week-selector.tsx` thì dùng `weekEnd` của server — ba màn hình, ba
  cách.

## C3 — Đồng hồ giờ VN tách nửa vời

`packages/shared/lib/battle-session.ts` có `VN_OFFSET_MS` (`:12`) và `vnIsoWeekday` (`:28`) nhưng
**để private**, chỉ export `shiftVnDate`. Vì vậy
`apps/api/src/modules/battle-sessions/session-schedule.ts` khai báo lại `VN_OFFSET_MS` (`:13`) và
dựng lại phép đổi sang giờ VN bằng tay ở **bốn chỗ** (`:53`, `:79`, `:126`, `:144`).

Nặng hơn: hai file dùng **hai quy ước đánh số thứ khác nhau** — shared dùng ISO 1–7
(`vnIsoWeekday`), backend dùng `getUTCDay()` 0–6 (`SATURDAY = 6`).

## C4 — `useFormationScreen`

`features/team-builder/hooks/use-formation-screen.ts` — 340 dòng, gom 5 query/mutation, 2 hook tổng
hợp, **11 lần gọi selector** của Zustand (`:49-69`), 9 module `lib/`, rồi trả về **object 48 khoá**
(`:262-339`) cho đúng một component. *Interface* phình gần bằng *implementation* → **shallow**, dù
file rất to.

12 module trong `lib/` mỗi cái có **đúng một** caller ngoài file — chính hook này. Chúng được tách ra
để test được, không phải vì có nhiều nơi dùng. `lib/assignment.ts` còn export
`createEmptyAssignment` mà **không call site thật nào** ngoài test.

Nghịch lý: 12/12 module `lib/` có test, còn chính hook nối chúng lại thì không có test nào.

## C5 — `*.module.ts` gánh hai vai

`battle-sessions.module.ts:10-15` export `formatSessionLabel`, `isDeadlinePassed`,
`BattleSessionEntity`, `WeekEntity` — tức file `@Module` đang làm **barrel public**, đúng thứ
`apps/api/docs/backend.md` §8 cấm ("Do not add barrels inside `modules/`"). `characters.module.ts:10`
cũng vậy. Hai module thật đã phụ thuộc cơ chế này (`attendance`, `team-builder`).

Luật ESLint bảo vệ nó khớp bằng **số lượng `../`** (`eslint.config.mjs:22-25,74-91`), nên phải khai
một block cho **mỗi độ sâu thư mục** (`:74-91`, bốn block). Thêm một cấp thư mục dưới `modules/` →
luật **im lặng ngừng kiểm tra** ở cấp đó, không lỗi, không cảnh báo. Chính doc đã ghi cảnh báo này.

## C6 — Web đi vòng qua interface của package

`apps/web/package.json` **không khai báo** `@guild/shared` trong `dependencies`. 36 chỗ trong
`apps/web` import bằng alias `@shared/*` (`tsconfig.json` → `../../packages/shared/*`), tức trỏ
thẳng vào file nguồn và **đi vòng qua `exports` map** của package — kể cả đường dẫn sâu
`@shared/lib/battle-session` (`session-form-dialog.tsx:6`).

Kết quả: một package, hai danh tính import, hai đường build (api chạy `dist/`, web biên dịch source
qua Turbopack). Alias còn phải khai **hai lần** — `tsconfig.json` và `vitest.config.ts` — thiếu chỗ
thứ hai thì type-check vẫn xanh còn test đỏ.

## C7 — Seam phiên đăng nhập

`features/auth/index.ts` export đúng 3 thứ. Nhưng `proxy.ts` — chỗ thực thi bảo mật thật — import
**xuyên qua** nó tới ba file nội bộ (`proxy.ts:3,11,12`). Interface khai báo không phải contract
thật.

Ba file nhạy cảm nhất không có test nào: `features/auth/lib/jwt.ts` (verify HS256 bằng Web Crypto),
`proxy.ts` (gia hạn phiên + chặn route admin), `apps/api/src/modules/auth/auth.service.ts`
(`timingSafeEqual`, phát JWT). Cả module `auth` phía API không có file spec.

## Những gì rà soát **không** tìm thấy vấn đề

Ghi lại để khỏi rà lại:

- **Không có `forwardRef()`**, không có import vòng ở `apps/api`.
- **Không có store nào giữ dữ liệu server** — luật "server data → TanStack Query" đúng ở cả 4 store.
- **Không có `fetch` nào ngoài `lib/api-client.ts`**.
- **Cross-feature import đi qua `index.ts`** ở mọi chỗ trừ `proxy.ts` (đã tính trong C7).
- **`features/settings/lib/date-parts.ts`** tuy lớn nhưng là xử lý ô nhập `datetime-local`, không
  phải luật lịch — không tính là trùng lặp.
- **`components/shared/`** không có file nào đặt sai chỗ; `main-nav`, `page-size-select`,
  `table-pagination` tuy 0 import trực tiếp nhưng được dùng gián tiếp qua `site-header` và
  `table-pagination-bar`.
