# Rà soát luồng người dùng, edge case và hiệu năng - Implementation Plan

**Goal:** Đóng hết các lỗi luồng đã xác minh trong bản rà soát ngày 2026-09-07, chia thành **9 PR
code** cộng **1 PR tài liệu** mở đầu. Mỗi PR đứng một mình: rebase được, review được, revert được mà
không kéo theo PR khác.

**Spec:** [`docs/custom-spec/2026-09-07-flow-audit-overview.md`](../custom-spec/2026-09-07-flow-audit-overview.md)

**Architecture:** Không có domain mới, không có module mới, không có seam mới. Mọi thay đổi rơi vào
một trong bốn chỗ đã có: service của API, `packages/shared`, một `features/<feature>/` của web, hoặc
`discord-bot/`. Ba mục cần đụng tài liệu (`architecture.md`) đều là **sửa mô tả sai** hoặc **ghi
nhận một rủi ro đã chấp nhận**, không phải đổi luật.

---

## Quyết định đã chốt trước khi viết code

Bản rà soát để mở ba câu hỏi. Chốt như sau, vì cả ba đều chặn việc bắt đầu:

### 1. MB1 - trang "Lịch sử điểm danh" vốn định làm gì

**Chốt: đúng là lịch sử.** Tên route đã là `/lich-su-diem-danh`; đổi tên trang để khớp với một giới
hạn kỹ thuật là để cái đuôi vẫy con chó.

**Nhưng không làm phân trang phía server.** Spec đề nghị chuyển phân trang về server "vì dữ liệu
nhiều tuần". Điều đó chỉ đúng nếu trang tải **nhiều tuần một lúc**. Thiết kế ở đây là **một bộ chọn
tuần**: mỗi request vẫn trả đúng một tuần, đúng khối lượng như hôm nay. Phân trang phía client ở
`attendance-log-table.tsx` giữ nguyên, và PF4 (index) không phải xem lại - không có truy vấn nào đổi
hình dạng, chỉ thêm một mệnh đề `weekStart` đã có index.

Đây là chỗ dễ over-engineer nhất trong cả loạt. Không làm.

### 2. AD5 - PUT đội hình ghi đè toàn bộ

**Chốt: ghi nhận là rủi ro đã chấp nhận, không cài cơ chế phiên bản.** Spec nói rõ vấn đề thật không
phải là thiếu ETag, mà là "không được cài mà cũng không được ghi nhận". Bang có một đến hai admin;
thêm cột phiên bản, thêm mã lỗi xung đột và thêm một luồng hợp nhất trên UI là chi phí lớn cho một
tình huống chưa từng xảy ra.

Vì vậy AD5 **không có PR code**. Nó thành một mục trong `architecture.md` §8 ("What is deliberately
absent"), nằm trong PR tài liệu mở đầu. Nếu sau này thật sự có hai admin sửa cùng lúc, mục đó chính
là chỗ nói cần làm gì tiếp.

### 3. AD4 - mở rộng interface công khai của `team-builder`

**Chốt: mở rộng, có kiểm soát.** `releaseCharacterFromSession` nhận thêm một tham số `client:
PrismaTransactionClient`. Đây là **đúng khuôn mẫu `CharactersService.listIds` đã dùng** (đọc qua
client được truyền vào, để caller trong transaction không mở kết nối thứ hai). Không phải một seam
mới, mà là một seam đã có được áp dụng lần thứ hai. Không tạo module thứ ba.

---

## Global Constraints

Áp cho cả chín PR:

- **TDD.** Mỗi thay đổi hành vi bắt đầu bằng một test đỏ, xác nhận nó đỏ **đúng lý do**, rồi mới viết
  code. Bug fix thì test phải dựng lại đúng lỗi người dùng gặp.
- **Không over-engineer.** Làm đúng cái spec mô tả. Không thêm trừu tượng "cho lần sau".
- **Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt** (theo tiền lệ đang có).
- **Thông báo lỗi cho người dùng là tiếng Việt**, hiện nguyên văn (`architecture.md` §3.4).
- **Không `forwardRef()`.**
- Mọi nhánh cắt từ `main` tại `ea2fb79`. Không nhánh nào phụ thuộc nhánh nào.
- Lệnh kiểm trước khi mở PR:
  - API: `pnpm --filter api test` · `lint` · `typecheck`
  - Web: `pnpm --filter web test` · `lint` · `typecheck`
  - Đụng `packages/shared`: `pnpm --filter @guild/shared build` trước.
- Kiểm tay chạy trong stack Docker (`docker compose --profile dev up`) với những mục mà test không
  dựng lại được: đăng nhập, redirect, bundle.

---

## PR 0 - `docs/flow-audit-plan` · tài liệu mở đầu

**Nội dung:** bản rà soát + plan này + hai sửa tài liệu không cần code.

- [ ] `docs/custom-spec/2026-09-07-flow-audit-overview.md` (đã có, đang nằm trên nhánh cũ).
- [ ] `docs/custom-plan/2026-09-07-flow-audit-plan.md` - file này.
- [ ] `architecture.md` §8: thêm **AD5** vào danh sách "deliberately absent" - không có khoá lạc quan
      trên đội hình và tên đội; lần ghi sau thắng, im lặng. Ghi cả điều kiện khiến quyết định này hết
      hiệu lực (có từ ba admin thường xuyên sửa cùng ngày đánh).
- [ ] Không đụng code. CI cho commit chỉ có docs không chạy job nào.

**Merge trước tất cả** - mọi PR sau đều link về hai file này.

---

## PR 1 - AD1 · `fix/last-admin-guard` · chặn xoá và hạ quyền admin cuối cùng

**Mức: nghiêm trọng.** Lỗi duy nhất mà một lần bấm nhầm đưa hệ thống vào trạng thái không tự thoát.

**Files:** `apps/api/src/modules/characters/characters.service.ts`,
`apps/api/src/modules/characters/__tests__/characters.service.spec.ts`

### Task 1.1 - Test đỏ

- [ ] `prisma` double thêm `character.count` và `$transaction` (chạy callback với chính double đó,
      đúng cách một transaction tương tác hành xử).
- [ ] Đỏ: `PATCH` đổi `role` `ADMIN → MEMBER` khi `count({ role: ADMIN })` là 1 → `BadRequestException`,
      `character.update` **không** được gọi.
- [ ] Đỏ: `DELETE` trên admin cuối → `BadRequestException`, `character.delete` **không** được gọi.
- [ ] Xanh sẵn (chống hồi quy): còn hai admin thì cả hai thao tác chạy như cũ; hạ quyền/xoá một
      `MEMBER` không bao giờ bị chặn; `PATCH` không mang `role` không bao giờ bị chặn **kể cả trên
      admin cuối**.
- [ ] Chạy, xác nhận hai test mới đỏ đúng lý do (không phải đỏ vì double thiếu hàm).

### Task 1.2 - Cài luật trong service

- [ ] Một helper riêng, đặt tên theo câu hỏi nghiệp vụ: `ensureNotLastAdmin(client, id)` - đếm
      `role: ADMIN` **qua `client` được truyền vào**, ném `BadRequestException` khi hàng đang xét là
      admin cuối.
- [ ] `update`: chỉ chạy helper khi `input.role` có mặt **và** khác `ADMIN` - một `PATCH` đổi tên
      không được tốn một `count`.
- [ ] `remove`: chạy helper vô điều kiện (xoá luôn là mất một hàng).
- [ ] **Đếm và ghi trong cùng một `$transaction`.** Hai admin xoá nhau cùng lúc, cả hai đều thấy
      "còn 2", là về 0. Đây là lý do helper nhận `client`.
- [ ] `DISCORD_ADMIN_IDS` **không** được tính vào phép đếm. Nó là lối cứu hộ hạ tầng, không phải
      `Character`; đếm nó vào là cho phép hạ quyền admin thật cuối cùng. Viết comment nói điều này -
      đây đúng loại quyết định mà người đọc sau sẽ tưởng là bỏ sót.
- [ ] Câu tiếng Việt, đặt cạnh `NOT_FOUND` và `DISCORD_ID_TAKEN`: nói rõ **vì sao** bị chặn, không chỉ
      "không được phép".

### Task 1.3 - Chặn trước trên UI, cho êm

**Files:** `apps/web/features/members/components/member-form-dialog.tsx` và nơi gọi hành động xoá.

- [ ] Khoá ô `role` và nút xoá khi danh sách chỉ còn một `ADMIN`, kèm một câu giải thích.
- [ ] Đây là **trang trí**, không phải chốt chặn. Service vẫn là nơi luật sống. Comment nói vậy.

---

## PR 2 - AD2 · `fix/match-time-vn-timezone` · ô chọn giờ trận cố định UTC+7

**Files:** `apps/web/features/settings/lib/datetime-input.ts` + `__tests__`

### Task 2.1 - Test đỏ chạy ở múi giờ khác Việt Nam

- [ ] Đây là điểm mấu chốt: CI chạy UTC nên đang **che** lỗi. Test phải đặt `TZ` khác cả UTC lẫn VN
      (dùng `America/New_York`, lệch âm, để một bug lệch dấu không lọt).
- [ ] Đỏ: `toInputValue('2026-09-08T13:30:00.000Z')` → `'2026-09-08T20:30'` (UTC+7), bất kể `TZ`.
- [ ] Đỏ: `fromInputValue('2026-09-08T20:30')` → `'2026-09-08T13:30:00.000Z'`, bất kể `TZ`.
- [ ] Khứ hồi: `fromInputValue(toInputValue(iso)) === iso` với vài mốc, gồm một mốc qua nửa đêm VN
      (nơi lệch múi giờ đổi cả ngày, không chỉ giờ).

### Task 2.2 - Quy đổi bằng offset cố định

- [ ] Dùng lại nguyên thủy trong `packages/shared/lib/vn-time.ts` (`vnParts`/`shiftVnDate`) thay cho
      `getFullYear`/`getHours`/`getMinutes`. Không tự viết `+7 * 3600_000` tại chỗ - offset cố tình
      không được export, và lý do đó vẫn đúng ở đây.
- [ ] Nếu `vn-time.ts` thiếu đúng một mảnh (dựng ISO từ các phần VN), thêm **một** hàm ở đó và export,
      không nhân bản logic sang web.

---

## PR 3 - MB1 · `feat/attendance-history-week-picker` · xem được tuần đã qua

**Files:** `packages/shared/schemas`, `apps/api/.../attendance.controller.ts`, `attendance.service.ts`,
`apps/web/features/attendance/api/attendance-api.ts`, `attendance-history-filters.tsx`, `__tests__`
hai bên, `docs/architecture.md` (bảng endpoint).

### Task 3.1 - Test đỏ ở API

- [ ] Đỏ: `getRecords({ weekStart })` đọc đúng tuần được truyền, không phải `getActiveWeek()`.
- [ ] Xanh sẵn: không truyền gì thì vẫn là tuần đang mở - **không đổi hành vi mặc định**.

### Task 3.2 - `weekStart` trên `GET /attendance/records`

- [ ] Dùng lại `WeekStartQueryDto` **đã có** ở `battle-sessions`. Không khai lại schema, không khai
      lại quy tắc validate (`CLAUDE.md`: `packages/shared` sở hữu mọi hình dạng qua mạng).
- [ ] `getRecords` chuyển `weekStart` xuống `listByWeek(weekStart)`.
- [ ] Cập nhật bảng endpoint trong `architecture.md`.

### Task 3.3 - Bộ chọn tuần trên web

- [ ] Đỏ (Vitest): `fetchAttendanceRecords`/`fetchBattleSessions` gửi `weekStart` khi có chọn tuần.
- [ ] Bộ chọn liệt kê các tuần đã có dữ liệu, mặc định là tuần đang mở.
- [ ] Cả hai request dùng **cùng một** `weekStart` - hai request lệch tuần là một trạng thái không
      được phép tồn tại; lấy giá trị từ một chỗ.
- [ ] `weekStart` vào query key của TanStack Query, nếu không thì đổi tuần sẽ đọc cache tuần cũ.
- [ ] **Không** đụng phân trang. Xem "Quyết định đã chốt" ở trên.

---

## PR 4 - nhóm nhỏ · `fix/small-flow-gaps` · PF1 · PF2 · DC2 · AD6 · MB4 · MB5

Sáu mục nhỏ, không mục nào chạm mục nào. Spec đề nghị gom một PR; commit tách riêng từng mục để
revert được lẻ.

- [ ] **PF1** - `components/providers.tsx`: `ReactQueryDevtools` chặn sau
      `process.env.NODE_ENV !== 'production'`. Kiểm bằng cách grep chuỗi devtools trong output
      `pnpm --filter web build`, không phải bằng mắt.
- [ ] **PF2** - `announce-capture.ts`: `@zumer/snapdom` chuyển sang `import()` động, chỉ chạy khi bấm
      "Thông báo đội hình". Kiểm: chunk snapdom rời khỏi bundle đầu của `/xep-team`.
- [ ] **DC2** - `reminder.service.ts`/`nhac-diem-danh.command.ts`: bắt `DiscordApiError` 403 và dịch
      **giống hệt** `cau-hinh-kenh.command.ts`. Đây là lần thứ ba cùng một đoạn dịch → **rút ra một
      chỗ dùng chung** và cho cả ba dùng. `CLAUDE.md` gọi tên đúng tình huống này.
- [ ] **AD6** - `formation-announcer.service.ts`: so `images.length` với `session.matchCount`, từ chối
      bằng một câu tiếng Việt. Một dòng so, không hơn.
- [ ] **MB4** - `app/xep-team/page.tsx`, `app/thiet-lap/page.tsx`: `redirect('/')` → mang theo `?error=`,
      dùng lại quy ước sẵn có của luồng đăng nhập. Trang chủ hiện câu tương ứng.
- [ ] **MB5** - `auth.service.ts:95`: tách `query.error` (huỷ thật) khỏi callback dị dạng (thiếu
      `code`/`state`); cái sau map sang `AUTH_ERROR.expired`.

Mỗi mục một test, trừ PF1/PF2 (kiểm bằng build output, ghi vào phần Tests của PR).

---

## PR 5 - AD3 · `fix/formation-slot-keeps-note` · xoá thành viên không cuốn theo ghi chú

**Files:** `apps/api/prisma/schema.prisma`, một migration viết tay, `characters.service.ts`, `__tests__`

- [ ] Đỏ: xoá một `Character` đang giữ một ô **có ghi chú** → ô còn lại, `characterId` thành `null`,
      ghi chú nguyên vẹn.
- [ ] Đỏ: xoá một `Character` giữ một ô **không ghi chú** → ô biến mất (bất biến ở `schema.prisma:150`:
      ô vừa trống người vừa không ghi chú thì không có hàng).
- [ ] `FormationSlot.character`: `onDelete: Cascade` → `SetNull`, cho khớp ngữ nghĩa
      `releaseCharacterFromSession` đã cài.
- [ ] Xoá hàng trống-và-không-ghi-chú thành việc của service, ngay sau khi gỡ người.
- [ ] **Migration viết tay.** Đây là migration đổi hành vi khoá ngoại; Prisma sinh `DROP` + `ADD` cột
      là mất dữ liệu (`CLAUDE.md`). Chỉ `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ... ON
      DELETE SET NULL`, không đụng dữ liệu.
- [ ] Chạy `prisma migrate` trên database Docker và kiểm lại bằng tay: tạo ô có ghi chú, xoá người,
      xem ghi chú còn.

---

## PR 6 - AD4 · `fix/attendance-release-transaction` · ghi "Không" và gỡ đội hình cùng một transaction

**Files:** `apps/api/.../attendance.service.ts`, `team-builder.service.ts`, `team-builder.public.ts`,
`__tests__` hai module.

- [ ] Đỏ: bước gỡ đội hình ném lỗi → `AttendanceRecord` **không** được commit. Đây là test dựng lại
      đúng lỗi; nó phải đỏ trước.
- [ ] `releaseCharacterFromSession` nhận thêm `client: PrismaTransactionClient`, đúng khuôn mẫu
      `CharactersService.listIds`. Ký hiệu mới đi qua `team-builder.public.ts`.
- [ ] `markAttendance` bọc `upsert` + `release` trong một `$transaction` tương tác.
- [ ] Giữ nguyên comment nói trạng thái "đã trả lời Không mà vẫn trong đội hình" là không được phép -
      giờ nó mới thật.

---

## PR 7 - MB2 · `fix/auth-config-error-message` · `AUTH_SECRET` lệch không còn là vòng lặp câm

**Files:** `docs/architecture.md`, `apps/web/features/auth/core/access.ts`, `apps/web/proxy.ts`,
`__tests__`

- [ ] **Sửa tài liệu trước, và sửa dù có sửa code hay không.** `architecture.md` §1.1 đang viết "mọi
      route admin bounces you back to the home page". Thực tế: **mọi** route, về trang đăng nhập.
- [ ] Đỏ: `verifyJwt` hỏng vì **chữ ký sai** (khác với **hết hạn**) → redirect mang một mã lỗi cấu
      hình, không phải mã "hết phiên".
- [ ] Trang đăng nhập hiện một câu khác hẳn: "cấu hình sai, liên hệ quản trị viên". Người dùng không
      thể tự sửa bằng cách bấm lại - đừng mời họ bấm lại.
- [ ] Kiểm tay trong Docker: đổi `AUTH_SECRET` của web lệch khỏi API, mở một trang, xem câu hiện ra.

---

## PR 8 - MB3 · `fix/server-action-session-refresh` · nút Có/Không không chết cứng qua đêm

**Files:** `apps/web/features/attendance/api/attendance-api.ts` và hook gọi nó, `__tests__`

- [ ] Đỏ: Server Action nhận `401` → luồng yêu cầu tải lại phía client, **không** chỉ hiện toast.
      Hôm nay không có ca nào cho "access hết hạn, refresh còn hạn".
- [ ] Cách sửa nhỏ nhất đúng chỗ: `proxy.ts` là nơi **duy nhất** làm mới token và nó chỉ chạy khi
      điều hướng. Vậy `401` từ Server Action phải biến thành một lần điều hướng, không phải một lần
      thử lại mù - thử lại mù sẽ lỗi y hệt.
- [ ] Không dựng cơ chế làm mới thứ hai bên trong Server Action. Hai nơi làm mới token là hai nơi
      để sai.

---

## PR 9 - DC1 · `fix/discord-message-limits` · không vượt giới hạn ký tự của Discord

**Files:** `discord-bot/reminder.ts`, `announcement.ts`, `__tests__`

- [ ] Đỏ: `reminder.spec.ts` dựng tập `due` đủ lớn để `content` vượt 2000 ký tự → hôm nay lọt qua,
      phải đỏ.
- [ ] Đỏ tương tự cho `embed.description` vượt 4096 ở `announcement.ts`.
- [ ] Cắt danh sách tên kèm đuôi "+N khác" thay vì chia lô. Lý do: nhắc điểm danh mà thành ba tin
      nhắn liên tiếp thì người đọc bỏ qua cả ba; một tin nhắn đọc được là mục đích. Giới hạn là hằng
      số có tên, đặt cạnh nơi dùng.
- [ ] Comment ở `reminder.ts:68` đã gọi tên rủi ro này - cập nhật nó thành mô tả cách xử lý, đừng để
      lại một lời cảnh báo cho việc đã làm xong.

---

## Không làm, và vì sao

| Mục | Quyết định |
|---|---|
| **AD5** | Ghi nhận là rủi ro đã chấp nhận trong `architecture.md` §8 (PR 0). Không cài khoá lạc quan. |
| **DC5** | Chỉ cần **đo** p99 cold start, không sửa. Cần môi trường production thật; không nằm trong loạt PR này. Ghi lại như việc còn treo. |
| **DC3** | Đã được ghi nhận sẵn ở `architecture.md` §8; `/nhac-diem-danh` tồn tại để bù. Không phải phát hiện mới. |
| **DC4** | Nghi ngờ, chưa dựng lại được. Discord chỉ retry khi timeout hoặc 5xx, mà hai lệnh này trả lời nhanh. Không sửa mù. |
| **MB6** | Nghi ngờ, chưa dựng lại được đường đi. Chờ dựng lại được rồi mới sửa. |
| **PF3** | Đánh đổi có chủ ý, có comment giải thích. Spec nói thẳng "đừng sửa mù". |
| **PF4** | Không có vấn đề. PR 3 cố tình không làm nó phát sinh vấn đề. |

---

## Thứ tự merge đề nghị

```
PR 0 (docs)
  └─► PR 1 (AD1)  ──► PR 5 (AD3) ──► PR 6 (AD4)      ← ba PR đụng dữ liệu, đi tuần tự
  └─► PR 2 (AD2)
  └─► PR 4 (nhóm nhỏ)
  └─► PR 7 (MB2) ──► PR 8 (MB3)                       ← cùng chạm luồng phiên
  └─► PR 3 (MB1)
  └─► PR 9 (DC1)
```

Lý do thứ tự:

1. **PR 0** trước, để mọi PR sau link về được.
2. **PR 1** ngay sau: nghiêm trọng nhất, và nằm gọn trong một service.
3. **PR 5 rồi PR 6**: PR 5 mang một migration. Một PR chạm `apps/api` khi merge sẽ **migrate
   production rồi mới deploy** - đừng để hai PR có migration chồng nhau trong một buổi.
4. **PR 7 trước PR 8**: cả hai chạm luồng phiên; PR 7 đổi cách phân loại lỗi auth, PR 8 dựa lên đó.
5. **PR 2, 3, 4, 9** độc lập hoàn toàn, merge lúc nào cũng được.
