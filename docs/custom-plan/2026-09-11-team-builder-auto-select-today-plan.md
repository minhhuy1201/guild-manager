# Team Builder — tab trận mặc định mở theo "ngày hôm nay" — Implementation Plan

**Goal:** Khi mở màn `Xếp đội hình bang chiến`, tab trận mặc định là **trận diễn ra trong ngày hôm
nay** (giờ Việt Nam). Không có trận nào trong ngày hôm nay thì giữ nguyên hành vi cũ: Bang Chiến
(thứ 7), rồi trận đầu tiên của tuần.

**Architecture:** Thay đổi nằm gọn trong hàm thuần `resolveActiveSessionId`
(`apps/web/features/team-builder/lib/active-session.ts`) và người gọi duy nhất của nó,
`useSessionSelection`. Không đổi API, không đổi schema, không đổi store — thứ tự ưu tiên của tab
vốn đã tập trung ở một chỗ, nên chỉ chèn thêm một nhánh.

**Spec:** không có. Thay đổi hành vi gói trong một hàm, mô tả đủ ở đây.

## Luật chọn tab, theo thứ tự

1. **Tab người dùng đang mở** (`storedId`), chừng nào trận đó còn trên màn hình — giữ nguyên, đây là
   lựa chọn chủ động của người dùng và ưu tiên cao nhất.
2. **Trận của ngày hôm nay** — trận đầu tiên (theo giờ đánh) có `dateTime` rơi đúng **ngày lịch Việt
   Nam** của `now`.
3. **Bang Chiến** (`isGuildWar`).
4. **Trận đầu tiên của tuần.**

**So khớp theo ngày lịch, không theo thứ trong tuần.** Nghĩa là khi người dùng xem một tuần khác
(tuần trước, tuần sau), không trận nào khớp ngày hôm nay và màn hình rơi về Bang Chiến — đúng như
hôm nay. Đây là cách đọc sát nghĩa nhất của "ngày hiện tại".

**Trận đã đánh xong vẫn được chọn.** `locked` không tham gia vào luật này: 21h thứ 7 vẫn là "hôm
nay", và tab chỉ-đọc vẫn là thứ người dùng muốn nhìn.

## Global Constraints

- Không đổi API, schema, store hay endpoint.
- Comment, JSDoc, tên biến, tên file: tiếng Anh. Tên test: tiếng Việt, theo tiền lệ của
  `active-session.test.ts`.
- **TDD**: mỗi thay đổi bắt đầu bằng một test đỏ, xác nhận đỏ đúng lý do, rồi mới viết code.
- Nhánh: `feat/team-builder-auto-select-today-session`.
- Lệnh kiểm: `pnpm --filter web test`, `pnpm --filter web lint`.

---

### Task 1: `isSameVnDay` trong `packages/shared/lib/vn-time.ts`

**Files:** `packages/shared/lib/vn-time.ts`, `apps/web/lib/__tests__/session-deadline.test.ts`

- [x] Test đỏ: hai mốc cùng ngày lịch Việt Nam trả `true`; một mốc UTC tối muộn (đã sang ngày hôm
      sau theo giờ VN) trả `false` so với mốc cùng ngày UTC.
- [x] Viết `isSameVnDay(a, b)`: so `vnParts` theo `year/month/day`. Đây là một nguyên hàm thời gian
      thuần, đúng chỗ trong `vn-time.ts` cạnh `vnWeekday`/`vnParts`.
- [x] `pnpm --filter @guild/shared build` để hai app đọc được `dist`.

### Task 2: `resolveActiveSessionId` nhận `now` và ưu tiên trận hôm nay

**Files:** `apps/web/features/team-builder/lib/active-session.ts`,
`apps/web/features/team-builder/lib/__tests__/active-session.test.ts`

- [x] Bổ sung `dateTime` vào `SelectableSession`; cập nhật `SESSIONS` trong test.
- [x] Test đỏ:
      - chưa chọn gì, hôm nay có trận → mở trận hôm nay (kể cả khi nó không phải Bang Chiến);
      - chưa chọn gì, hôm nay không có trận → rơi về Bang Chiến;
      - tab đang mở vẫn thắng trận hôm nay;
      - trận đang mở đã bị xoá, hôm nay có trận → mở trận hôm nay;
      - hôm nay có hai trận → lấy trận đầu theo thứ tự truyền vào (đã sắp theo giờ đánh).
- [x] Thêm tham số `now: Date`, chèn nhánh "trận hôm nay" giữa `storedId` và `isGuildWar`.

### Task 3: Nối `now` vào hook

**Files:** `apps/web/features/team-builder/hooks/use-session-selection.ts`

- [x] Truyền `new Date()` vào `resolveActiveSessionId`. Hàm chỉ đọc phần ngày lịch VN — hằng offset
      UTC+7 nên server render và client render ra cùng một ngày, không có lệch hydration.
- [x] Cập nhật JSDoc của hook cho khớp luật mới.

### Task 4: Kiểm tra

- [x] `pnpm --filter @guild/shared build`
- [x] `pnpm --filter web test`
- [x] `pnpm --filter web lint`
